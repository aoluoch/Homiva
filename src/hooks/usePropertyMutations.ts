import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Role } from "appwrite";
import { storage, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { ListingType, Property } from "@/types/models";

export interface PropertyFormValues {
  title: string;
  description: string;
  listingType: ListingType;
  price: number;
  county: string;
  town: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft?: number;
  amenities: string[];
  contactPhone?: string;
  contactEmail?: string;
}

async function uploadImages(files: File[]): Promise<string[]> {
  const uploaded = await Promise.all(
    files.map(async (file) => {
      const res = await storage.createFile({
        bucketId: appwriteConfig.buckets.propertyImages,
        fileId: ID.unique(),
        file,
        permissions: [Permission.read(Role.any())],
      });
      return res.$id;
    }),
  );
  return uploaded;
}

/** Determine which owner role to attribute a listing to. */
function resolveOwnerRole(roles: string[], listingType: ListingType): string {
  if (listingType === "airbnb" && roles.includes(TEAMS.airbnbOwners))
    return "airbnb_owner";
  if (listingType === "rent" && roles.includes(TEAMS.landlords))
    return "landlord";
  if (roles.includes(TEAMS.agents)) return "agent";
  if (roles.includes(TEAMS.landlords)) return "landlord";
  if (roles.includes(TEAMS.airbnbOwners)) return "airbnb_owner";
  return "owner";
}

function normalizeListingValues(values: PropertyFormValues) {
  const data: Record<string, unknown> = {
    title: values.title,
    description: values.description,
    listingType: values.listingType,
    price: Math.round(Number(values.price) || 0),
    county: values.county,
    town: values.town,
    address: values.address ?? "",
    latitude: values.latitude ?? "",
    longitude: values.longitude ?? "",
    bedrooms: Math.max(0, Math.floor(Number(values.bedrooms) || 0)),
    bathrooms: Math.max(0, Math.floor(Number(values.bathrooms) || 0)),
    amenities: values.amenities,
    contactPhone: values.contactPhone ?? "",
    contactEmail: values.contactEmail ?? "",
  };
  if (values.sizeSqft !== undefined && values.sizeSqft !== null) {
    data.sizeSqft = Math.max(0, Math.floor(Number(values.sizeSqft) || 0));
  }
  return data;
}

export function useCreateProperty() {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      files,
    }: {
      values: PropertyFormValues;
      files: File[];
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const imageIds = files.length ? await uploadImages(files) : [];

      return tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        rowId: ID.unique(),
        data: {
          ...normalizeListingValues(values),
          imageIds,
          coverImageId: imageIds[0] ?? null,
          status: "pending",
          locationVerificationStatus: "pending",
          ownerId: user.$id,
          ownerName: profile?.name ?? user.name,
          ownerRole: resolveOwnerRole(roles, values.listingType),
          featured: false,
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-properties"] });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      property,
      values,
      newFiles,
    }: {
      property: Property;
      values: PropertyFormValues;
      newFiles: File[];
    }) => {
      const newImageIds = newFiles.length ? await uploadImages(newFiles) : [];
      const imageIds = [...(property.imageIds ?? []), ...newImageIds];

      return tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        rowId: property.$id,
        data: {
          ...normalizeListingValues(values),
          imageIds,
          coverImageId: imageIds[0] ?? null,
          // Editing sends the listing back to review.
          status: "pending",
          locationVerificationStatus: "pending",
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["my-properties"] });
      qc.invalidateQueries({ queryKey: ["property", vars.property.$id] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      await tablesDB.deleteRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        rowId: propertyId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-properties"] });
    },
  });
}
