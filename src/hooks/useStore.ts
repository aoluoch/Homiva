import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { uploadImageToStorage } from "@/lib/storage";
import { appwriteConfig, TABLES } from "@/lib/config";
import { PAGE_SIZE, useAppwriteInfiniteRows } from "@/lib/pagination";
import { useAuth } from "@/context/AuthContext";
import { usePayment } from "@/hooks/usePayment";
import type { Order, Product, Storefront } from "@/types/models";

const DB = appwriteConfig.databaseId;

async function uploadImage(bucketId: string, file: File): Promise<string> {
  return uploadImageToStorage(bucketId, file);
}

// --- Storefront -------------------------------------------------------------

export interface StorefrontInput {
  name: string;
  description: string;
  category: string;
  phone?: string;
  email?: string;
  county?: string;
  town?: string;
}

/** The current user's storefront (if any). */
export function useMyStorefront() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-storefront", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.storefronts,
        queries: [Query.equal("ownerId", user!.$id), Query.limit(1)],
      });
      return (res.rows[0] as unknown as Storefront) ?? null;
    },
  });
}

export function useCreateStorefront() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      logo,
      banner,
    }: {
      values: StorefrontInput;
      logo?: File | null;
      banner?: File | null;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const logoFileId = logo
        ? await uploadImage(appwriteConfig.buckets.storeAssets, logo)
        : undefined;
      const bannerFileId = banner
        ? await uploadImage(appwriteConfig.buckets.storeAssets, banner)
        : undefined;
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.storefronts,
        rowId: ID.unique(),
        data: {
          ...values,
          ownerId: user.$id,
          logoFileId,
          bannerFileId,
          plan: "free",
          subscriptionStatus: "none",
          verified: false,
          featured: false,
          status: "pending",
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      }) as unknown as Storefront;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-storefront"] }),
  });
}

export function useUpdateStorefront() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      logo,
      banner,
    }: {
      id: string;
      values: Partial<StorefrontInput>;
      logo?: File | null;
      banner?: File | null;
    }) => {
      const data: Record<string, unknown> = { ...values };
      if (logo)
        data.logoFileId = await uploadImage(
          appwriteConfig.buckets.storeAssets,
          logo,
        );
      if (banner)
        data.bannerFileId = await uploadImage(
          appwriteConfig.buckets.storeAssets,
          banner,
        );
      return tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.storefronts,
        rowId: id,
        data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-storefront"] }),
  });
}

/** Paginated approved storefronts (public directory). */
export function useStorefronts(category?: string) {
  return useAppwriteInfiniteRows<Storefront>({
    queryKey: ["storefronts", category],
    tableId: TABLES.storefronts,
    pageSize: PAGE_SIZE.browse,
    buildQueries: () => {
      const queries = [
        Query.equal("status", "approved"),
        Query.orderDesc("featured"),
        Query.orderDesc("$createdAt"),
      ];
      if (category) queries.push(Query.equal("category", category));
      return queries;
    },
  });
}

export function useStorefront(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["storefront", id],
    queryFn: async () => {
      const res = await tablesDB.getRow({
        databaseId: DB,
        tableId: TABLES.storefronts,
        rowId: id!,
      });
      return res as unknown as Storefront;
    },
  });
}

// --- Subscriptions ----------------------------------------------------------

/** Subscribe/upgrade a storefront plan via Paystack. */
export function useSubscribe() {
  const qc = useQueryClient();
  const payment = usePayment();
  return useMutation({
    mutationFn: async ({
      plan,
      amountKES,
      storefrontId,
    }: {
      plan: string;
      amountKES: number;
      storefrontId: string;
    }) => {
      return payment.mutateAsync({
        purpose: "subscription",
        amountKES,
        metadata: { plan, storefrontId, relatedId: storefrontId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-storefront"] });
    },
  });
}

// --- Products ---------------------------------------------------------------

export interface ProductInput {
  title: string;
  description: string;
  category: string;
  condition: "new" | "refurbished" | "used";
  price: number;
  stock: number;
  county?: string;
  town?: string;
}

export function useMyProducts(storefrontId?: string) {
  return useQuery({
    enabled: !!storefrontId,
    queryKey: ["my-products", storefrontId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.products,
        queries: [
          Query.equal("storefrontId", storefrontId!),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Product[];
    },
  });
}

export function useCreateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storefront,
      values,
      files,
    }: {
      storefront: Storefront;
      values: ProductInput;
      files: File[];
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const imageIds = await Promise.all(
        files.map((f) => uploadImage(appwriteConfig.buckets.productImages, f)),
      );
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: ID.unique(),
        data: {
          ...values,
          storefrontId: storefront.$id,
          sellerId: user.$id,
          storeName: storefront.name,
          imageIds,
          coverImageId: imageIds[0] ?? null,
          status: "pending",
          featured: false,
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      tablesDB.deleteRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: id,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-products"] }),
  });
}

export function useAdminCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      files,
    }: {
      values: ProductInput;
      files: File[];
    }) => {
      const imageIds = await Promise.all(
        files.map((f) => uploadImage(appwriteConfig.buckets.productImages, f)),
      );
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: ID.unique(),
        data: {
          ...values,
          storefrontId: "homiva",
          sellerId: "homiva-admin",
          storeName: "Homiva",
          imageIds,
          coverImageId: imageIds[0] ?? null,
          status: "approved",
          featured: false,
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.team("admins")),
          Permission.delete(Role.team("admins")),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useAdminUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      files,
    }: {
      id: string;
      values: Partial<ProductInput> & { status?: string; featured?: boolean };
      files?: File[];
    }) => {
      const imageIds = files?.length
        ? await Promise.all(
            files.map((f) => uploadImage(appwriteConfig.buckets.productImages, f)),
          )
        : [];
      return tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: id,
        data: {
          ...values,
          ...(imageIds.length
            ? { imageIds, coverImageId: imageIds[0] ?? null }
            : {}),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      tablesDB.deleteRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// --- Orders (seller + buyer views) -----------------------------------------

export function useSellerOrders() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["seller-orders", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.orders,
        queries: [
          Query.equal("sellerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Order[];
    },
  });
}

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.orders,
        queries: [
          Query.equal("buyerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Order[];
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.orders,
        rowId: id,
        data: { status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seller-orders"] }),
  });
}
