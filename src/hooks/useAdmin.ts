import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { functions, Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import type {
  Product,
  Profile,
  Property,
  RoleApplication,
  Storefront,
} from "@/types/models";

/** All user profiles (readable by admins). */
export function useAllProfiles() {
  return useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.profiles,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as Profile[];
    },
  });
}

/** Pending role applications awaiting admin review. */
export function usePendingApplications() {
  return useQuery({
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as RoleApplication[];
    },
  });
}

/** Properties pending approval. */
export function usePendingProperties() {
  return useQuery({
    queryKey: ["admin", "properties"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as Property[];
    },
  });
}

/** Storefronts pending approval (admins can read all). */
export function usePendingStorefronts() {
  return useQuery({
    queryKey: ["admin", "storefronts"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.storefronts,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as Storefront[];
    },
  });
}

/** Products pending approval. */
export function usePendingProducts() {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.products,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as Product[];
    },
  });
}

interface AdminActionPayload {
  action:
    | "approveRole"
    | "rejectRole"
    | "suspendRole"
    | "approveProperty"
    | "rejectProperty"
    | "approveStorefront"
    | "rejectStorefront"
    | "verifyStorefront"
    | "approveProduct"
    | "rejectProduct";
  applicationId?: string;
  propertyId?: string;
  storefrontId?: string;
  productId?: string;
  note?: string;
}

async function callAdmin(payload: AdminActionPayload) {
  const execution = await functions.createExecution({
    functionId: appwriteConfig.functions.admin,
    body: JSON.stringify(payload),
    async: false,
  });

  let parsed: { ok?: boolean; error?: string } = {};
  try {
    parsed = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("Unexpected response from admin function.");
  }
  if (!parsed.ok) {
    throw new Error(parsed.error || "Admin action failed.");
  }
  return parsed;
}

export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: callAdmin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["storefronts"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
