import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { storage, tablesDB } from "@/lib/appwrite";
import {
  appwriteConfig,
  PARTNER_ROLE_CATEGORY,
  SUBSCRIPTION_PLANS,
  TABLES,
  TEAMS,
} from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import type {
  PartnerCategory,
  PartnerCompany,
  PartnerPortfolioImage,
} from "@/types/models";

const DB = appwriteConfig.databaseId;
const PARTNER_TEAMS = [TEAMS.movers, TEAMS.cleaningCompanies, TEAMS.interiorDesigners];

async function uploadAsset(file: File): Promise<string> {
  const res = await storage.createFile({
    bucketId: appwriteConfig.buckets.storeAssets,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.any())],
  });
  return res.$id;
}

function firstPartnerRole(roles: string[]) {
  return PARTNER_TEAMS.find((team) => roles.includes(team));
}

export interface PartnerCompanyInput {
  name: string;
  description: string;
  phone?: string;
  email?: string;
  county?: string;
  town?: string;
}

export function usePartnerCompanies(category?: PartnerCategory | string) {
  return useQuery({
    queryKey: ["partner-companies", category],
    queryFn: async () => {
      const queries = [
        Query.equal("status", "approved"),
        Query.equal("subscriptionStatus", "active"),
        Query.orderDesc("featured"),
        Query.orderDesc("$createdAt"),
        Query.limit(60),
      ];
      if (category) queries.push(Query.equal("category", category));
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.partnerCompanies,
        queries,
      });
      return res.rows as unknown as PartnerCompany[];
    },
  });
}

export function usePartnerCompany(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["partner-company", id],
    queryFn: async () => {
      const res = await tablesDB.getRow({
        databaseId: DB,
        tableId: TABLES.partnerCompanies,
        rowId: id!,
      });
      return res as unknown as PartnerCompany;
    },
  });
}

export function useMyPartnerCompany() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-partner-company", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.partnerCompanies,
        queries: [Query.equal("ownerId", user!.$id), Query.limit(1)],
      });
      return (res.rows[0] as unknown as PartnerCompany) ?? null;
    },
  });
}

export function useSavePartnerCompany() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      existing,
      values,
      logo,
      banner,
    }: {
      existing?: PartnerCompany | null;
      values: PartnerCompanyInput;
      logo?: File | null;
      banner?: File | null;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const role = firstPartnerRole(roles);
      if (!role) throw new Error("Your partner role must be approved first.");
      if (!values.name.trim()) throw new Error("Company name is required.");
      const data: Record<string, unknown> = {
        ...values,
        name: values.name.trim(),
        category: PARTNER_ROLE_CATEGORY[role],
      };
      if (logo) data.logoFileId = await uploadAsset(logo);
      if (banner) data.bannerFileId = await uploadAsset(banner);

      if (existing) {
        return tablesDB.updateRow({
          databaseId: DB,
          tableId: TABLES.partnerCompanies,
          rowId: existing.$id,
          data,
        }) as unknown as PartnerCompany;
      }

      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.partnerCompanies,
        rowId: ID.unique(),
        data: {
          ...data,
          ownerId: user.$id,
          role,
          status: "pending",
          verified: false,
          featured: false,
          plan: "basic",
          subscriptionStatus: "none",
          rating: 0,
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
          Permission.read(Role.team(TEAMS.admins)),
          Permission.update(Role.team(TEAMS.admins)),
        ],
      }) as unknown as PartnerCompany;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-partner-company"] });
      qc.invalidateQueries({ queryKey: ["admin", "partner-companies"] });
    },
  });
}

export function usePartnerPortfolio(partnerCompanyId?: string) {
  return useQuery({
    enabled: !!partnerCompanyId,
    queryKey: ["partner-portfolio", partnerCompanyId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.partnerPortfolioImages,
        queries: [
          Query.equal("partnerCompanyId", partnerCompanyId!),
          Query.orderAsc("order"),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as PartnerPortfolioImage[];
    },
  });
}

export function useUploadPartnerPortfolio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      partner,
      files,
    }: {
      partner: PartnerCompany;
      files: File[];
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const rows = [];
      for (const [index, file] of files.entries()) {
        const fileId = await uploadAsset(file);
        rows.push(
          await tablesDB.createRow({
            databaseId: DB,
            tableId: TABLES.partnerPortfolioImages,
            rowId: ID.unique(),
            data: {
              partnerCompanyId: partner.$id,
              ownerId: user.$id,
              fileId,
              caption: "",
              order: index,
            },
            permissions: [
              Permission.read(Role.any()),
              Permission.update(Role.user(user.$id)),
              Permission.delete(Role.user(user.$id)),
              Permission.read(Role.team(TEAMS.admins)),
              Permission.update(Role.team(TEAMS.admins)),
            ],
          }),
        );
      }
      return rows;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-portfolio", vars.partner.$id] });
      qc.invalidateQueries({ queryKey: ["my-partner-portfolio"] });
    },
  });
}

export function useDeletePartnerPortfolioImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      tablesDB.deleteRow({
        databaseId: DB,
        tableId: TABLES.partnerPortfolioImages,
        rowId: id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-portfolio"] });
      qc.invalidateQueries({ queryKey: ["my-partner-portfolio"] });
    },
  });
}

export function useSubscribePartnerCompany() {
  const qc = useQueryClient();
  const payment = usePayment();
  return useMutation({
    mutationFn: async ({
      partnerCompanyId,
      plan,
    }: {
      partnerCompanyId: string;
      plan: string;
    }) => {
      const selected = SUBSCRIPTION_PLANS.find((p) => p.key === plan);
      if (!selected) throw new Error("Choose a valid subscription plan.");
      return payment.mutateAsync({
        purpose: "subscription",
        amountKES: selected.price,
        metadata: {
          plan,
          targetType: "partner_company",
          targetId: partnerCompanyId,
          partnerCompanyId,
          relatedId: partnerCompanyId,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-partner-company"] });
      qc.invalidateQueries({ queryKey: ["partner-companies"] });
    },
  });
}
