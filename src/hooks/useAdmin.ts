import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { functions, Query, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/context/AuthContext";
import { appwriteConfig, TABLES } from "@/lib/config";
import { PAGE_SIZE, useAppwriteInfiniteRows } from "@/lib/pagination";
import type {
  AuditLog,
  Dispute,
  MortgageEnquiry,
  PartnerCompany,
  Product,
  Profile,
  Property,
  RoleApplication,
  ServiceProvider,
  Storefront,
  ViewingRequest,
} from "@/types/models";

const DB = appwriteConfig.databaseId;

function useAdminEnabled() {
  const { isAdmin, loading } = useAuth();
  return !loading && isAdmin;
}

/** All user profiles (readable by admins). */
export function useAllProfiles() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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

/** Role applications for admin review (cursor-paginated). */
export function usePendingApplications() {
  const enabled = useAdminEnabled();
  return useAppwriteInfiniteRows<RoleApplication>({
    enabled,
    queryKey: ["admin", "applications"],
    tableId: TABLES.roleApplications,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
  });
}

/** Properties pending approval. */
export function usePendingProperties() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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

/** Partner company approval queue and directory for admins. */
export function useAdminPartnerCompanies() {
  return useQuery({
    queryKey: ["admin", "partner-companies"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.partnerCompanies,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      return res.rows as unknown as PartnerCompany[];
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
    | "verifyPropertyLocation"
    | "rejectPropertyLocation"
    | "verifyProvider"
    | "unverifyProvider"
    | "approvePartnerCompany"
    | "rejectPartnerCompany"
    | "suspendPartnerCompany"
    | "featurePartnerCompany"
    | "unfeaturePartnerCompany"
    | "approveStorefront"
    | "rejectStorefront"
    | "verifyStorefront"
    | "approveProduct"
    | "rejectProduct";
  applicationId?: string;
  propertyId?: string;
  providerId?: string;
  partnerCompanyId?: string;
  storefrontId?: string;
  productId?: string;
  note?: string;
}

async function callAdmin(payload: AdminActionPayload) {
  let execution;
  try {
    execution = await functions.createExecution({
      functionId: appwriteConfig.functions.admin,
      body: JSON.stringify(payload),
      async: false,
    });
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code === 404 || e.message?.includes("Function")) {
      throw new Error(
        `Admin function "${appwriteConfig.functions.admin}" is not deployed or the VITE_APPWRITE_FUNCTION_ADMIN value is wrong. Run npm run deploy:admin, then retry.`,
      );
    }
    throw err;
  }

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
      qc.invalidateQueries({ queryKey: ["partner-companies"] });
      qc.invalidateQueries({ queryKey: ["my-partner-company"] });
      qc.invalidateQueries({ queryKey: ["admin", "partner-companies"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin", "service-providers"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

/** Service provider verification queue. */
export function useServiceProviders() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
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
  partnerCompanies: number;
  partnerCompaniesPublished: number;
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

/** Sum an amount field over a filtered, capped window (avoids full-table scans). */
async function sumAmount(
  tableId: string,
  queries: unknown[] = [],
  field: "amount" = "amount",
  cap = 250,
): Promise<{ totalRows: number; sum: number }> {
  const res = await tablesDB.listRows({
    databaseId: DB,
    tableId,
    queries: [
      ...(queries as string[]),
      Query.orderDesc("$createdAt"),
      Query.limit(cap),
    ],
  });
  const sum = res.rows.reduce((acc, row) => {
    const value = (row as Record<string, unknown>)[field];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
  return { totalRows: res.total, sum };
}

/** Aggregate platform metrics for the admin overview. */
export function useAdminStats() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
    queryKey: ["admin", "stats"],
    staleTime: 60_000,
    queryFn: async (): Promise<AdminStats> => {
      const [
        users,
        properties,
        propertiesApproved,
        propertiesPending,
        storefronts,
        storefrontsApproved,
        partnerCompanies,
        partnerCompaniesPublished,
        products,
        openDisputes,
        bookingsMeta,
        ordersMeta,
        completedJobs,
        subscriptionsMeta,
      ] = await Promise.all([
        countOf(TABLES.profiles),
        countOf(TABLES.properties),
        countOf(TABLES.properties, [Query.equal("status", "approved")]),
        countOf(TABLES.properties, [Query.equal("status", "pending")]),
        countOf(TABLES.storefronts),
        countOf(TABLES.storefronts, [Query.equal("status", "approved")]),
        countOf(TABLES.partnerCompanies),
        countOf(TABLES.partnerCompanies, [
          Query.equal("status", "approved"),
          Query.equal("subscriptionStatus", "active"),
        ]),
        countOf(TABLES.products),
        countOf(TABLES.disputes, [
          Query.equal("status", ["open", "investigating"]),
        ]),
        sumAmount(TABLES.bookings, [
          Query.equal("status", ["confirmed", "completed"]),
        ]),
        sumAmount(TABLES.orders, [Query.notEqual("status", "cancelled")]),
        countOf(TABLES.serviceRequests, [
          Query.equal("status", ["completed", "paid"]),
        ]),
        sumAmount(TABLES.subscriptions, [Query.equal("status", "active")]),
      ]);

      return {
        users,
        properties,
        propertiesApproved,
        propertiesPending,
        storefronts,
        storefrontsApproved,
        partnerCompanies,
        partnerCompaniesPublished,
        products,
        bookings: bookingsMeta.totalRows,
        bookingsGmv: bookingsMeta.sum,
        orders: ordersMeta.totalRows,
        ordersRevenue: ordersMeta.sum,
        completedJobs,
        activeSubscriptions: subscriptionsMeta.totalRows,
        subscriptionMrr: subscriptionsMeta.sum,
        openDisputes,
      };
    },
  });
}
