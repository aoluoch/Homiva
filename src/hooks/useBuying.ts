import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { MortgageEnquiry, Property, ViewingRequest } from "@/types/models";

const DB = appwriteConfig.databaseId;

// --- Mortgage enquiries -----------------------------------------------------

export interface MortgageEnquiryInput {
  property: Property;
  deposit: number;
  loanAmount: number;
  termYears: number;
  interestRate: number;
  monthlyRepayment: number;
  monthlyIncome?: number;
  phone?: string;
  message?: string;
}

export function useCreateMortgageEnquiry() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MortgageEnquiryInput) => {
      if (!user) throw new Error("You must be logged in.");
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.mortgageEnquiries,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          userName: profile?.name ?? user.name,
          userEmail: profile?.email ?? user.email,
          phone: input.phone ?? "",
          propertyId: input.property.$id,
          propertyTitle: input.property.title,
          propertyPrice: input.property.price,
          deposit: Math.round(input.deposit),
          loanAmount: Math.round(input.loanAmount),
          termYears: input.termYears,
          interestRate: Math.round(input.interestRate),
          monthlyRepayment: Math.round(input.monthlyRepayment),
          monthlyIncome: Math.round(input.monthlyIncome ?? 0),
          message: input.message ?? "",
          status: "new",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.read(Role.team(TEAMS.admins)),
          Permission.update(Role.team(TEAMS.admins)),
        ],
      }) as unknown as MortgageEnquiry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-mortgage-enquiries"] });
      qc.invalidateQueries({ queryKey: ["admin", "mortgage-enquiries"] });
    },
  });
}

export function useMyMortgageEnquiries() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-mortgage-enquiries", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.mortgageEnquiries,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as MortgageEnquiry[];
    },
  });
}

// --- Viewing requests -------------------------------------------------------

export interface ViewingRequestInput {
  property: Property;
  preferredDate: string; // ISO
  alternateDate?: string; // ISO
  phone?: string;
  message?: string;
}

export function useCreateViewingRequest() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ViewingRequestInput) => {
      if (!user) throw new Error("You must be logged in.");
      if (!input.preferredDate) throw new Error("Please choose a preferred date.");
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.viewingRequests,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          userName: profile?.name ?? user.name,
          phone: input.phone ?? "",
          propertyId: input.property.$id,
          propertyTitle: input.property.title,
          ownerId: input.property.ownerId,
          preferredDate: input.preferredDate,
          alternateDate: input.alternateDate ?? null,
          message: input.message ?? "",
          status: "requested",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.read(Role.team(TEAMS.admins)),
          Permission.update(Role.team(TEAMS.admins)),
          ...(input.property.ownerId
            ? [
                Permission.read(Role.user(input.property.ownerId)),
                Permission.update(Role.user(input.property.ownerId)),
              ]
            : []),
        ],
      }) as unknown as ViewingRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["owner-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "viewing-requests"] });
    },
  });
}

export function useMyViewingRequests() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-viewing-requests", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.viewingRequests,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as ViewingRequest[];
    },
  });
}

/** Viewing requests on the current owner's listings. */
export function useOwnerViewingRequests() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["owner-viewing-requests", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.viewingRequests,
        queries: [
          Query.equal("ownerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as ViewingRequest[];
    },
  });
}

/** Owner (or admin) updates a viewing request's status. */
export function useUpdateViewingRequest() {
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
        tableId: TABLES.viewingRequests,
        rowId: id,
        data: { status, ...(note !== undefined ? { note } : {}) },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["my-viewing-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "viewing-requests"] });
    },
  });
}
