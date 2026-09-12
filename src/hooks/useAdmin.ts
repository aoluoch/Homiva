import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Permission, Role } from "appwrite";
import { ID, Query, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/context/AuthContext";
import { appwriteConfig, SUBSCRIPTION_PLANS, TABLES } from "@/lib/config";
import { logAdminAudit } from "@/lib/audit";
import { executeHomivaAdmin } from "@/lib/homivaAdmin";
import {
  markMatchingNotificationsRead,
  matchesOrderGroup,
} from "@/hooks/useNotifications";
import { PAGE_SIZE, useAppwriteInfiniteRows } from "@/lib/pagination";
import type {
  AuditLog,
  Booking,
  Dispute,
  Inquiry,
  MortgageEnquiry,
  Order,
  PartnerCompany,
  Product,
  Profile,
  Property,
  RoleApplication,
  ServiceProvider,
  Storefront,
  ViewingRequest,
} from "@/types/models";

function asProperty(row: unknown): Property {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  return {
    ...(fields as unknown as Property),
    $id: String(record.$id ?? ""),
    $createdAt: String(record.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? ""),
    $permissions: (record.$permissions as string[]) ?? [],
  };
}

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

/** Property inquiries sent to Homiva from listing pages. */
export function useAdminInquiries() {
  const enabled = useAdminEnabled();
  const result = useAppwriteInfiniteRows<Inquiry>({
    enabled,
    queryKey: ["admin", "inquiries"],
    tableId: TABLES.inquiries,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
  });
  return {
    ...result,
    items: result.items.map(asInquiry),
  };
}

export function useUpdateInquiryStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Inquiry["status"];
    }) => {
      const updated = await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.inquiries,
        rowId: id,
        data: { status },
      });
      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: `inquiry_${status}`,
        targetType: "inquiry",
        targetId: id,
        summary: `Inquiry marked ${status}.`,
      });
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "inquiries"] });
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

function asInquiry(row: unknown): Inquiry {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  return {
    ...(fields as unknown as Inquiry),
    $id: String(record.$id ?? ""),
    $createdAt: String(record.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? ""),
    $permissions: (record.$permissions as string[]) ?? [],
  };
}

/** Every Airbnb booking (admins can read all rows for security review). */
export function useAdminBookings() {
  const enabled = useAdminEnabled();
  return useAppwriteInfiniteRows<Booking>({
    enabled,
    queryKey: ["admin", "bookings"],
    tableId: TABLES.bookings,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
  });
}

/**
 * Fetch the listings referenced by admin bookings so the security tab can show
 * house details and host contact without extra per-card queries.
 */
export function useAdminBookingProperties(propertyIds: string[]) {
  const uniqueIds = [...new Set(propertyIds.filter(Boolean))].sort();
  const enabled = useAdminEnabled() && uniqueIds.length > 0;
  return useQuery({
    enabled,
    queryKey: ["admin", "booking-properties", uniqueIds],
    queryFn: async () => {
      const map: Record<string, Property> = {};
      await Promise.all(
        uniqueIds.map(async (rowId) => {
          try {
            const row = await tablesDB.getRow({
              databaseId: DB,
              tableId: TABLES.properties,
              rowId,
            });
            map[rowId] = asProperty(row);
          } catch {
            // Listing may have been deleted; the booking card still shows stay data.
          }
        }),
      );
      return map;
    },
  });
}

function asOrder(row: unknown): Order {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  const typed = fields as unknown as Order;
  return {
    ...typed,
    $id: String(record.$id ?? typed.$id ?? ""),
    $createdAt: String(record.$createdAt ?? typed.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? typed.$updatedAt ?? ""),
    status: typed.status,
  };
}

/** All marketplace orders (admins can read every order for fulfilment). */
export function useAdminOrders() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.orders,
        queries: [Query.orderDesc("$createdAt"), Query.limit(200)],
      });
      return (res.rows as unknown[]).map(asOrder);
    },
  });
}

/**
 * Fetch the products referenced by a set of orders so the admin order view can
 * show product thumbnails (orders only store the product id, not its images).
 */
export function useAdminOrderProducts(productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))].sort();
  const enabled = useAdminEnabled() && uniqueIds.length > 0;
  return useQuery({
    enabled,
    queryKey: ["admin", "order-products", uniqueIds],
    queryFn: async () => {
      const map: Record<string, Product> = {};
      for (let i = 0; i < uniqueIds.length; i += 100) {
        const chunk = uniqueIds.slice(i, i + 100);
        const res = await tablesDB.listRows({
          databaseId: DB,
          tableId: TABLES.products,
          queries: [Query.equal("$id", chunk), Query.limit(chunk.length)],
        });
        for (const row of res.rows as unknown as Product[]) {
          map[row.$id] = row;
        }
      }
      return map;
    },
  });
}

/** Update the fulfilment status of every order line in a delivery (order group). */
export function useAdminUpdateOrderStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderIds,
      status,
      summary,
      groupId,
    }: {
      orderIds: string[];
      status: string;
      summary?: string;
      groupId?: string;
    }) => {
      await Promise.all(
        orderIds.map((rowId) =>
          tablesDB.updateRow({
            databaseId: DB,
            tableId: TABLES.orders,
            rowId,
            data: { status },
          }),
        ),
      );
      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: `order_${status}`,
        targetType: "order",
        targetId: orderIds[0] ?? "",
        summary:
          summary ??
          `Marked ${orderIds.length} order line(s) as ${status}.`,
      });
      if (user?.$id && ["shipped", "delivered", "cancelled"].includes(status)) {
        try {
          await markMatchingNotificationsRead(user.$id, (notification) =>
            matchesOrderGroup(notification, groupId),
          );
        } catch {
          // Fulfilment must succeed even if inbox cleanup fails.
        }
      }
      return { orderIds, status, groupId };
    },
    onMutate: async ({ orderIds, status }) => {
      await qc.cancelQueries({ queryKey: ["admin", "orders"] });
      const previous = qc.getQueryData<Order[]>(["admin", "orders"]);
      qc.setQueryData<Order[]>(["admin", "orders"], (current) =>
        current?.map((order) =>
          orderIds.includes(order.$id)
            ? { ...order, status: status as Order["status"] }
            : order,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(["admin", "orders"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      qc.invalidateQueries({ queryKey: ["seller-orders"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      if (user?.$id) {
        qc.invalidateQueries({ queryKey: ["notifications", user.$id] });
        qc.invalidateQueries({ queryKey: ["notifications-unread", user.$id] });
      }
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

/**
 * All role applications (non-paginated) keyed by `${userId}::${role}` so the
 * Partners tab can surface the contact, pinned location and verification
 * documents the applicant submitted when they applied to become a partner.
 */
export function useApplicationsByOwner() {
  const enabled = useAdminEnabled();
  return useQuery({
    enabled,
    queryKey: ["admin", "applications-by-owner"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.roleApplications,
        queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
      });
      const rows = res.rows as unknown as RoleApplication[];
      const map: Record<string, RoleApplication> = {};
      for (const row of rows) {
        // Keep the most recent application per owner + role (rows are already
        // ordered newest-first, so only set the first one we encounter).
        const key = `${row.userId}::${row.role}`;
        if (!map[key]) map[key] = row;
      }
      return map;
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
  return executeHomivaAdmin(payload);
}

/** Publish an approved partner to the public directory for 30 days. */
export function useAdminPublishPartnerListing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: PartnerCompany) => {
      if (company.status !== "approved") {
        throw new Error("Approve the partner company before publishing it.");
      }
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiryIso = expiry.toISOString();
      const plan = company.plan || SUBSCRIPTION_PLANS[0]?.key || "basic";
      const amount = SUBSCRIPTION_PLANS.find((item) => item.key === plan)?.price ?? 2000;

      await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.partnerCompanies,
        rowId: company.$id,
        data: {
          plan,
          subscriptionStatus: "active",
          subscriptionExpiry: expiryIso,
        },
      });

      try {
        await tablesDB.createRow({
          databaseId: DB,
          tableId: TABLES.subscriptions,
          rowId: ID.unique(),
          data: {
            userId: company.ownerId,
            targetType: "partner_company",
            targetId: company.$id,
            plan,
            amount,
            status: "active",
            reference: `ADMIN-${Date.now()}`,
            startedAt: now.toISOString(),
            expiresAt: expiryIso,
          },
          permissions: [
            Permission.read(Role.user(company.ownerId)),
            Permission.read(Role.team("admins")),
          ],
        });
      } catch {
        // Directory publish must succeed even if the ledger row cannot be written.
      }

      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: "partner_listing_published",
        targetType: "partner_company",
        targetId: company.$id,
        summary: `Published ${company.name} to the public partner directory for 30 days.`,
      });
      return { companyId: company.$id, expiryIso };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partner-companies"] });
      qc.invalidateQueries({ queryKey: ["partner-companies"] });
      qc.invalidateQueries({ queryKey: ["partner-company"] });
      qc.invalidateQueries({ queryKey: ["my-partner-company"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
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

/** Admin audit trail for privileged actions (cursor-paginated). */
export function useAuditLogs() {
  const enabled = useAdminEnabled();
  return useAppwriteInfiniteRows<AuditLog>({
    enabled,
    queryKey: ["admin", "audit-logs"],
    tableId: TABLES.auditLogs,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
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
    }) => {
      const updated = await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.disputes,
        rowId: id,
        data: {
          status,
          ...(resolution !== undefined ? { resolution } : {}),
          handledBy: user?.$id ?? "",
        },
      });
      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: `dispute_${status}`,
        targetType: "dispute",
        targetId: id,
        summary: `Dispute set to ${status}.`,
      });
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
      qc.invalidateQueries({ queryKey: ["my-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Buying enquiries (Module C) — admin visibility
// ---------------------------------------------------------------------------

function asMortgageEnquiry(row: unknown): MortgageEnquiry {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  return {
    ...(fields as unknown as MortgageEnquiry),
    $id: String(record.$id ?? ""),
    $createdAt: String(record.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? ""),
    $permissions: (record.$permissions as string[]) ?? [],
  };
}

function asViewingRequest(row: unknown): ViewingRequest {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  return {
    ...(fields as unknown as ViewingRequest),
    $id: String(record.$id ?? ""),
    $createdAt: String(record.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? ""),
    $permissions: (record.$permissions as string[]) ?? [],
  };
}

export function useAdminMortgageEnquiries() {
  const enabled = useAdminEnabled();
  const result = useAppwriteInfiniteRows<MortgageEnquiry>({
    enabled,
    queryKey: ["admin", "mortgage-enquiries"],
    tableId: TABLES.mortgageEnquiries,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
  });
  return {
    ...result,
    items: result.items.map(asMortgageEnquiry),
  };
}

export function useUpdateMortgageEnquiry() {
  const { user } = useAuth();
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
    }) => {
      const updated = await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.mortgageEnquiries,
        rowId: id,
        data: { status, ...(note !== undefined ? { note } : {}) },
      });
      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: `mortgage_${status}`,
        targetType: "mortgage_enquiry",
        targetId: id,
        summary: `Mortgage enquiry marked ${status}.`,
      });
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mortgage-enquiries"] });
      qc.invalidateQueries({ queryKey: ["my-mortgage-enquiries"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useAdminViewingRequests() {
  const enabled = useAdminEnabled();
  const result = useAppwriteInfiniteRows<ViewingRequest>({
    enabled,
    queryKey: ["admin", "viewing-requests"],
    tableId: TABLES.viewingRequests,
    pageSize: PAGE_SIZE.admin,
    buildQueries: () => [Query.orderDesc("$createdAt")],
  });
  return {
    ...result,
    items: result.items.map(asViewingRequest),
  };
}

export function useAdminUpdateViewingRequest() {
  const { user } = useAuth();
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
    }) => {
      const updated = await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.viewingRequests,
        rowId: id,
        data: { status, ...(note !== undefined ? { note } : {}) },
      });
      await logAdminAudit({
        actorId: user?.$id ?? "",
        action: `viewing_${status}`,
        targetType: "viewing_request",
        targetId: id,
        summary: `Viewing request marked ${status}.`,
      });
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["my-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["owner-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
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
  openJobs: number;
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

function planMonthlyPrice(plan?: string) {
  return (
    SUBSCRIPTION_PLANS.find((item) => item.key === plan)?.price ??
    SUBSCRIPTION_PLANS[0]?.price ??
    0
  );
}

function mrrFromRows(rows: unknown[]) {
  return rows.reduce<number>((sum, row) => {
    const plan = (row as { plan?: string }).plan;
    return sum + planMonthlyPrice(plan);
  }, 0);
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
    queryKey: ["admin", "stats", "v2"],
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
        openJobs,
        partnerMrrRows,
        storefrontMrrRows,
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
        countOf(TABLES.serviceRequests, [
          Query.equal("status", [
            "requested",
            "reviewed",
            "quoted",
            "scheduled",
            "in_progress",
          ]),
        ]),
        tablesDB.listRows({
          databaseId: DB,
          tableId: TABLES.partnerCompanies,
          queries: [
            Query.equal("subscriptionStatus", "active"),
            Query.limit(250),
          ],
        }),
        tablesDB.listRows({
          databaseId: DB,
          tableId: TABLES.storefronts,
          queries: [
            Query.equal("subscriptionStatus", "active"),
            Query.limit(250),
          ],
        }),
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
        openJobs,
        activeSubscriptions: partnerMrrRows.total + storefrontMrrRows.total,
        subscriptionMrr:
          mrrFromRows(partnerMrrRows.rows as unknown[]) +
          mrrFromRows(storefrontMrrRows.rows as unknown[]),
        openDisputes,
      };
    },
  });
}
