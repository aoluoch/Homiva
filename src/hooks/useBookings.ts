import { useMutation, useQuery } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import type { Booking, Property } from "@/types/models";

const DB = appwriteConfig.databaseId;
const ACTIVE_STAY = ["confirmed", "completed"] as const;

/** Confirmed bookings for a property (used to block calendar dates). */
export function usePropertyBookings(propertyId?: string) {
  return useQuery({
    enabled: !!propertyId,
    queryKey: ["property-bookings", propertyId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.bookings,
        queries: [
          Query.equal("propertyId", propertyId!),
          Query.equal("status", [...ACTIVE_STAY]),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Booking[];
    },
  });
}

/** The current user's trips (as guest). */
export function useMyTrips() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-trips", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.bookings,
        queries: [
          Query.equal("guestId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Booking[];
    },
  });
}

/** Bookings on the current host's listings. */
export function useHostBookings() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["host-bookings", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.bookings,
        queries: [
          Query.equal("hostId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Booking[];
    },
  });
}

/** Confirmed/completed stay for the signed-in guest on this listing (unlocks host details). */
export function useMyStayAccess(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!propertyId,
    queryKey: ["stay-access", user?.$id, propertyId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.bookings,
        queries: [
          Query.equal("propertyId", propertyId!),
          Query.equal("guestId", user!.$id),
          Query.equal("status", [...ACTIVE_STAY]),
          Query.limit(1),
        ],
      });
      return (res.rows[0] as unknown as Booking) ?? null;
    },
  });
}

/** Book an Airbnb stay via Paystack. */
export function useBookStay() {
  const payment = usePayment();
  return useMutation({
    mutationFn: async ({
      property,
      checkIn,
      checkOut,
      nights,
      guests,
    }: {
      property: Property;
      checkIn: string;
      checkOut: string;
      nights: number;
      guests: number;
    }) => {
      const amountKES = property.price * nights;
      return payment.mutateAsync({
        purpose: "booking",
        amountKES,
        metadata: {
          propertyId: property.$id,
          propertyTitle: property.title,
          hostId: property.ownerId,
          checkIn,
          checkOut,
          nights,
          guests,
          relatedId: property.$id,
        },
      });
    },
  });
}
