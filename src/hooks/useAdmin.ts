import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { functions, Query, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/context/AuthContext";
import { appwriteConfig, TABLES } from "@/lib/config";
import type {
  AuditLog,
  Booking,
  Dispute,
  MortgageEnquiry,
  Order,
  Product,
  Profile,
  Property,
  RoleApplication,
  ServiceProvider,
  ServiceRequest,
  Storefront,
  Subscription,
  ViewingRequest,
} from "@/types/models";

const DB = appwriteConfig.databaseId;

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
    | "verifyProvider"
    | "unverifyProvider"
    | "approveStorefront"
    | "rejectStorefront"
    | "verifyStorefront"
    | "approveProduct"
    | "rejectProduct";
  applicationId?: string;
  propertyId?: string;
  providerId?: string;
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
      qc.invalidateQueries({ queryKey: ["admin", "service-providers"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

/** Service provider verification queue. */
export function useServiceProviders() {
  return useQuery({
    queryKey: ["admin", "service-providers"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.serviceProviders,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as ServiceProvider[];
    },
  });
}

/** Admin audit trail for privileged moderation changes. */
export function useAuditLogs() {
  return useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.auditLogs,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as AuditLog[];
    },
  });
}

// ---------------------------------------------------------------------------
// Disputes queue (Module G)
// ---------------------------------------------------------------------------

export function useAllDisputes() {
  return useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.disputes,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as Dispute[];
    },
  });
}

export function useResolveDispute() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      resolution,
    }: {
      id: string;
      status: string;
      resolution?: string;
    }) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.disputes,
        rowId: id,
        data: {
          status,
          ...(resolution !== undefined ? { resolution } : {}),
          handledBy: user?.$id ?? "",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
      qc.invalidateQueries({ queryKey: ["my-disputes"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Buying enquiries (Module C) — admin visibility
// ---------------------------------------------------------------------------

export function useAdminMortgageEnquiries() {
  return useQuery({
    queryKey: ["admin", "mortgage-enquiries"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.mortgageEnquiries,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as MortgageEnquiry[];
    },
  });
}

export function useUpdateMortgageEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.mortgageEnquiries,
        rowId: id,
        data: { status, ...(note !== undefined ? { note } : {}) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mortgage-enquiries"] });
      qc.invalidateQueries({ queryKey: ["my-mortgage-enquiries"] });
    },
  });
}

export function useAdminViewingRequests() {
  return useQuery({
    queryKey: ["admin", "viewing-requests"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.viewingRequests,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as ViewingRequest[];
    },
  });
}

// ---------------------------------------------------------------------------
// Platform analytics / reporting (Module G, Success Metrics)
// ---------------------------------------------------------------------------

export interface AdminStats {
  users: number;
  properties: number;
  propertiesApproved: number;
  propertiesPending: number;
  storefronts: number;
  storefrontsApproved: number;
  products: number;
  bookings: number;
  bookingsGmv: number;
  orders: number;
  ordersRevenue: number;
  completedJobs: number;
  activeSubscriptions: number;
  subscriptionMrr: number;
  openDisputes: number;
}

async function countOf(tableId: string, queries: unknown[] = []): Promise<number> {
  const res = await tablesDB.listRows({
    databaseId: DB,
    tableId,
    queries: [...(queries as string[]), Query.limit(1)],
  });
  return res.total;
}

async function rowsOf<T>(tableId: string, queries: unknown[] = []): Promise<T[]> {
  const res = await tablesDB.listRows({
    databaseId: DB,
    tableId,
    queries: [...(queries as string[]), Query.limit(1000)],
  });
  return res.rows as unknown as T[];
}

/** Aggregate platform metrics for the admin overview. */
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async (): Promise<AdminStats> => {
      const [
        users,
        properties,
        propertiesApproved,
        propertiesPending,
        storefronts,
        storefrontsApproved,
        products,
        openDisputes,
        bookings,
        orders,
        services,
        subscriptions,
      ] = await Promise.all([
        countOf(TABLES.profiles),
        countOf(TABLES.properties),
        countOf(TABLES.properties, [Query.equal("status", "approved")]),
        countOf(TABLES.properties, [Query.equal("status", "pending")]),
        countOf(TABLES.storefronts),
        countOf(TABLES.storefronts, [Query.equal("status", "approved")]),
        countOf(TABLES.products),
        countOf(TABLES.disputes, [Query.equal("status", ["open", "investigating"])]),
        rowsOf<Booking>(TABLES.bookings),
        rowsOf<Order>(TABLES.orders),
        rowsOf<ServiceRequest>(TABLES.serviceRequests),
        rowsOf<Subscription>(TABLES.subscriptions, [
          Query.equal("status", "active"),
        ]),
      ]);

      const bookingsGmv = bookings
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + (b.amount || 0), 0);
      const ordersRevenue = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + (o.amount || 0), 0);
      const completedJobs = services.filter(
        (r) => r.status === "completed" || r.status === "paid",
      ).length;
      const subscriptionMrr = subscriptions.reduce(
        (s, sub) => s + (sub.amount || 0),
        0,
      );

      return {
        users,
        properties,
        propertiesApproved,
        propertiesPending,
        storefronts,
        storefrontsApproved,
        products,
        bookings: bookings.length,
        bookingsGmv,
        orders: orders.length,
        ordersRevenue,
        completedJobs,
        activeSubscriptions: subscriptions.length,
        subscriptionMrr,
        openDisputes,
      };
    },
  });
}
