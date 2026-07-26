import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Permission, Role } from "appwrite";
import { Query, tablesDB } from "@/lib/appwrite";
import {
  appwriteConfig,
  DEFAULT_MARKETPLACE_DELIVERY_FEE_KES,
  MARKETPLACE_DELIVERY_FEE_ROW_ID,
  MARKETPLACE_DELIVERY_FEE_SETTING,
  TABLES,
} from "@/lib/config";
import { PAGE_SIZE, useAppwriteInfiniteRows } from "@/lib/pagination";
import { usePayment } from "@/hooks/usePayment";
import type { AppSetting, Product } from "@/types/models";
import type { CartItem } from "@/context/CartContext";

const DB = appwriteConfig.databaseId;

export interface ProductFilters {
  category?: string;
  search?: string;
  condition?: string;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
}

function productFilterQueries(filters: ProductFilters) {
  const q: string[] = [Query.equal("status", "approved")];
  if (filters.category) q.push(Query.equal("category", filters.category));
  if (filters.condition) q.push(Query.equal("condition", filters.condition));
  if (filters.maxPrice) q.push(Query.lessThanEqual("price", filters.maxPrice));
  if (filters.search) q.push(Query.search("title", filters.search));
  switch (filters.sort) {
    case "price_asc":
      q.push(Query.orderAsc("price"));
      break;
    case "price_desc":
      q.push(Query.orderDesc("price"));
      break;
    default:
      q.push(Query.orderDesc("$createdAt"));
  }
  return q;
}

/** Paginated public marketplace browse (cursor-based). */
export function useProducts(filters: ProductFilters = {}) {
  return useAppwriteInfiniteRows<Product>({
    queryKey: ["products", filters],
    tableId: TABLES.products,
    pageSize: PAGE_SIZE.browse,
    buildQueries: () => productFilterQueries(filters),
  });
}

export function useProduct(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await tablesDB.getRow({
        databaseId: DB,
        tableId: TABLES.products,
        rowId: id!,
      });
      return res as unknown as Product;
    },
  });
}

export function useMarketplaceDeliveryFee() {
  return useQuery({
    queryKey: ["marketplace", "delivery-fee"],
    queryFn: async () => {
      try {
        const setting = await tablesDB.getRow({
          databaseId: DB,
          tableId: TABLES.appSettings,
          rowId: MARKETPLACE_DELIVERY_FEE_ROW_ID,
        });
        const parsed = Number((setting as unknown as AppSetting).value);
        return Number.isFinite(parsed)
          ? Math.max(0, Math.round(parsed))
          : DEFAULT_MARKETPLACE_DELIVERY_FEE_KES;
      } catch {
        return DEFAULT_MARKETPLACE_DELIVERY_FEE_KES;
      }
    },
  });
}

export function useAdminUpdateMarketplaceDeliveryFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountKES: number) => {
      const value = String(Math.max(0, Math.round(amountKES)));
      try {
        const current = await tablesDB.getRow({
          databaseId: DB,
          tableId: TABLES.appSettings,
          rowId: MARKETPLACE_DELIVERY_FEE_ROW_ID,
        });
        return tablesDB.updateRow({
          databaseId: DB,
          tableId: TABLES.appSettings,
          rowId: current.$id,
          data: { value },
        });
      } catch (err) {
        const e = err as { code?: number };
        if (e.code !== 404) throw err;
      }
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.appSettings,
        rowId: MARKETPLACE_DELIVERY_FEE_ROW_ID,
        data: {
          key: MARKETPLACE_DELIVERY_FEE_SETTING,
          value,
          label: "Marketplace delivery fee",
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.team("admins")),
          Permission.delete(Role.team("admins")),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace", "delivery-fee"] });
    },
  });
}

export function useStoreProducts(storefrontId?: string) {
  return useAppwriteInfiniteRows<Product>({
    enabled: !!storefrontId,
    queryKey: ["store-products", storefrontId],
    tableId: TABLES.products,
    pageSize: PAGE_SIZE.browse,
    buildQueries: () => [
      Query.equal("storefrontId", storefrontId!),
      Query.equal("status", "approved"),
      Query.orderDesc("$createdAt"),
    ],
  });
}

/** Buy a product via Paystack. */
export function useBuyProduct() {
  const payment = usePayment();
  const { data: deliveryFee = DEFAULT_MARKETPLACE_DELIVERY_FEE_KES } =
    useMarketplaceDeliveryFee();
  return useMutation({
    mutationFn: async ({
      product,
      quantity,
      phone,
      address,
    }: {
      product: Product;
      quantity: number;
      phone: string;
      address: string;
    }) => {
      const amountKES = product.price * quantity + deliveryFee;
      return payment.mutateAsync({
        purpose: "order",
        amountKES,
        metadata: {
          productId: product.$id,
          quantity,
          phone,
          address,
          secureAddress: address,
          deliveryFee,
          relatedId: product.$id,
        },
      });
    },
  });
}

export function useCheckoutCart() {
  const payment = usePayment();
  return useMutation({
    mutationFn: async ({
      items,
      phone,
      secureAddress,
      deliveryFee,
    }: {
      items: CartItem[];
      phone: string;
      secureAddress: string;
      deliveryFee: number;
    }) => {
      const purchasable = items.filter((item) => item.quantity > 0);
      if (purchasable.length === 0) throw new Error("Your cart is empty.");
      const subtotal = purchasable.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      return payment.mutateAsync({
        purpose: "order",
        amountKES: subtotal + deliveryFee,
        metadata: {
          items: purchasable.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          phone,
          secureAddress,
          address: secureAddress,
          deliveryFee,
          relatedId: purchasable[0]?.productId,
        },
      });
    },
  });
}
