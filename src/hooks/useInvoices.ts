import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Invoice, ServiceRequest } from "@/types/models";

const DB = appwriteConfig.databaseId;

/** Line items a provider fills in when issuing an invoice. */
export interface InvoiceInput {
  baseFee: number;
  labour: number;
  materials: number;
  transport: number;
  emergencySurcharge: number;
  title?: string;
}

function invoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HMV-${y}-${rand}`;
}

/** Invoices billed to the current user (as a customer). */
export function useMyInvoices() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-invoices", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.invoices,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Invoice[];
    },
  });
}

/** Invoices issued by the current provider. */
export function useProviderInvoices() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["provider-invoices", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.invoices,
        queries: [
          Query.equal("providerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Invoice[];
    },
  });
}

/** The invoice linked to a given service request (if any). */
export function useServiceInvoice(serviceRequestId?: string) {
  return useQuery({
    enabled: !!serviceRequestId,
    queryKey: ["service-invoice", serviceRequestId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.invoices,
        queries: [
          Query.equal("serviceRequestId", serviceRequestId!),
          Query.limit(1),
        ],
      });
      return (res.rows[0] as unknown as Invoice) ?? null;
    },
  });
}

/**
 * Provider issues an itemised invoice for a completed job. Creates the invoice
 * row and marks the service request completed with the invoice total as the
 * amount due.
 */
export function useIssueInvoice() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      items,
    }: {
      request: ServiceRequest;
      items: InvoiceInput;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const total =
        (items.baseFee || 0) +
        (items.labour || 0) +
        (items.materials || 0) +
        (items.transport || 0) +
        (items.emergencySurcharge || 0);
      if (total <= 0) throw new Error("Invoice total must be greater than zero.");

      const invoice = (await tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.invoices,
        rowId: ID.unique(),
        data: {
          userId: request.userId,
          serviceRequestId: request.$id,
          invoiceNumber: invoiceNumber(),
          title: items.title || request.problem || request.category,
          customerName: request.userName ?? "",
          providerId: user.$id,
          providerName: profile?.name ?? user.name,
          baseFee: items.baseFee || 0,
          labour: items.labour || 0,
          materials: items.materials || 0,
          transport: items.transport || 0,
          emergencySurcharge: items.emergencySurcharge || 0,
          total,
          currency: "KES",
          status: "unpaid",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
        ],
      })) as unknown as Invoice;

      // Reflect the invoiced total on the service request.
      await tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        rowId: request.$id,
        data: { status: "completed", quotedAmount: total },
      });

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
      qc.invalidateQueries({ queryKey: ["provider-invoices"] });
      qc.invalidateQueries({ queryKey: ["service-invoice"] });
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
  });
}

/** Mark an invoice as paid (customer, after a successful payment). */
export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.invoices,
        rowId: invoiceId,
        data: { status: "paid" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-invoices"] });
      qc.invalidateQueries({ queryKey: ["provider-invoices"] });
      qc.invalidateQueries({ queryKey: ["service-invoice"] });
    },
  });
}
