import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { storage, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import type { ServiceProvider, ServiceRequest } from "@/types/models";

const DB = appwriteConfig.databaseId;

export interface ServiceRequestInput {
  category: string;
  problem?: string;
  description: string;
  propertyType?: string;
  size?: string;
  urgency?: string;
  county?: string;
  town?: string;
  contactPhone?: string;
  scheduledDate?: string;
  estimatedMin: number;
  estimatedMax: number;
  emergency: boolean;
}

export interface ServiceProviderInput {
  businessName: string;
  categories: string[];
  county?: string;
}

async function uploadServicePhotos(files: File[]): Promise<string[]> {
  const uploaded = await Promise.all(
    files.map(async (file) => {
      const res = await storage.createFile({
        bucketId: appwriteConfig.buckets.servicePhotos,
        fileId: ID.unique(),
        file,
        permissions: [Permission.read(Role.any())],
      });
      return res.$id;
    }),
  );
  return uploaded;
}

/** Create a service request (maintenance workflow, PRD section 7). */
export function useCreateServiceRequest() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      files,
    }: {
      values: ServiceRequestInput;
      files: File[];
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const photoIds = files.length ? await uploadServicePhotos(files) : [];

      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        rowId: ID.unique(),
        data: {
          ...values,
          userId: user.$id,
          userName: profile?.name ?? user.name,
          photoIds,
          status: "pending",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      }) as unknown as ServiceRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
      qc.invalidateQueries({ queryKey: ["open-service-requests"] });
    },
  });
}

/** The current provider's business profile, used for verification and matching. */
export function useMyServiceProviderProfile() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-service-provider", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.serviceProviders,
        queries: [Query.equal("userId", user!.$id), Query.limit(1)],
      });
      return (res.rows[0] as unknown as ServiceProvider) ?? null;
    },
  });
}

/** Create or update the current provider's verification profile. */
export function useSaveServiceProviderProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      existing,
      values,
    }: {
      existing?: ServiceProvider | null;
      values: ServiceProviderInput;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      if (!values.businessName.trim()) {
        throw new Error("Business name is required.");
      }
      if (values.categories.length === 0) {
        throw new Error("Choose at least one service category.");
      }

      const data = {
        businessName: values.businessName.trim(),
        categories: values.categories,
        county: values.county ?? "",
      };

      if (existing) {
        return tablesDB.updateRow({
          databaseId: DB,
          tableId: TABLES.serviceProviders,
          rowId: existing.$id,
          data: { ...data, verified: false },
        }) as unknown as ServiceProvider;
      }

      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.serviceProviders,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          ...data,
          verified: false,
          rating: 0,
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
        ],
      }) as unknown as ServiceProvider;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-provider"] });
      qc.invalidateQueries({ queryKey: ["admin", "service-providers"] });
    },
  });
}

/** The current user's service requests. */
export function useMyServiceRequests() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-service-requests", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as ServiceRequest[];
    },
  });
}

/** Open (unassigned) requests a provider can accept, optionally by category. */
export function useOpenServiceRequests(categories?: string[]) {
  return useQuery({
    queryKey: ["open-service-requests", categories],
    queryFn: async () => {
      const queries = [
        Query.equal("status", "pending"),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ];
      if (categories && categories.length > 0) {
        queries.push(Query.equal("category", categories));
      }
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        queries,
      });
      return res.rows as unknown as ServiceRequest[];
    },
  });
}

/** Jobs a provider has accepted. */
export function useProviderJobs() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["provider-jobs", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        queries: [
          Query.equal("providerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as ServiceRequest[];
    },
  });
}

/** Provider accepts a job and optionally sets a quote. */
export function useAcceptJob() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      quotedAmount,
    }: {
      request: ServiceRequest;
      quotedAmount: number;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      // Grant the accepting provider row-level read/update.
      const perms = new Set(request.$permissions ?? []);
      perms.add(Permission.read(Role.user(user.$id)));
      perms.add(Permission.update(Role.user(user.$id)));
      return tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        rowId: request.$id,
        data: {
          status: "accepted",
          providerId: user.$id,
          providerName: profile?.name ?? user.name,
          quotedAmount,
        },
        permissions: [...perms],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-service-requests"] });
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
  });
}

/** Update a request's status (provider: in_progress/completed; user: cancelled). */
export function useUpdateServiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: string;
    }) => {
      return tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.serviceRequests,
        rowId: requestId,
        data: { status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
    },
  });
}

/** Customer pays for a completed service via Paystack. */
export function usePayForService() {
  const qc = useQueryClient();
  const payment = usePayment();
  return useMutation({
    mutationFn: async ({
      request,
    }: {
      request: ServiceRequest;
    }) => {
      const amount =
        request.quotedAmount && request.quotedAmount > 0
          ? request.quotedAmount
          : request.estimatedMax ?? request.estimatedMin ?? 0;
      if (!amount) throw new Error("No amount set for this service yet.");
      return payment.mutateAsync({
        purpose: "service",
        amountKES: amount,
        metadata: { serviceRequestId: request.$id, relatedId: request.$id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-service-requests"] });
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
  });
}
