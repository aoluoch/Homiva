import { useMutation, useQuery } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { usePayment } from "@/hooks/usePayment";
import type { Product } from "@/types/models";

const DB = appwriteConfig.databaseId;

export interface ProductFilters {
  category?: string;
  search?: string;
  condition?: string;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
}

/** Browse approved products (public marketplace). */
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const q = [Query.equal("status", "approved"), Query.limit(60)];
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
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.products,
        queries: q,
      });
      return res.rows as unknown as Product[];
    },
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

export function useStoreProducts(storefrontId?: string) {
  return useQuery({
    enabled: !!storefrontId,
    queryKey: ["store-products", storefrontId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.products,
        queries: [
          Query.equal("storefrontId", storefrontId!),
          Query.equal("status", "approved"),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Product[];
    },
  });
}

/** Buy a product via Paystack. */
export function useBuyProduct() {
  const payment = usePayment();
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
      const amountKES = product.price * quantity;
      return payment.mutateAsync({
        purpose: "order",
        amountKES,
        metadata: {
          productId: product.$id,
          quantity,
          phone,
          address,
          relatedId: product.$id,
        },
      });
    },
  });
}
