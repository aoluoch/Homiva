import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Query } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, VIEWING_FEE_KES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import type { Property } from "@/types/models";

/** Listing must be published and location-verified before a viewing fee can be charged. */
export function canUnlockPropertyViewing(
  property?: Pick<Property, "status" | "locationVerificationStatus"> | null,
): boolean {
  return (
    property?.status === "approved" &&
    property.locationVerificationStatus === "verified"
  );
}

/** Check whether the current user has already paid to view a property. */
export function useViewingAccess(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!propertyId,
    queryKey: ["viewing-access", user?.$id, propertyId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.viewingPayments,
        queries: [
          Query.equal("userId", user!.$id),
          Query.equal("propertyId", propertyId!),
          Query.equal("status", "paid"),
          Query.limit(1),
        ],
      });
      return res.rows.length > 0;
    },
  });
}

/**
 * Viewing-fee payment via Paystack. Opens the Paystack checkout for the KES
 * viewing fee, then the `homiva-payments` function verifies the charge and
 * creates the ViewingPayment record that unlocks the property server-side.
 * Refuses to open checkout unless the listing is approved and location-verified.
 */
export function usePayViewingFee() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const payment = usePayment();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error("You must be logged in to pay.");

      const property = (await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        rowId: propertyId,
      })) as unknown as Property;

      if (!canUnlockPropertyViewing(property)) {
        throw new Error(
          "This property is not yet verified by Homiva. Unlock will be available after location verification.",
        );
      }

      return payment.mutateAsync({
        purpose: "viewing_fee",
        amountKES: VIEWING_FEE_KES,
        metadata: { propertyId },
      });
    },
    onSuccess: (_data, propertyId) => {
      qc.invalidateQueries({ queryKey: ["viewing-access", user?.$id, propertyId] });
    },
  });
}
