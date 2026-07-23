import { useQuery } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import type { ListingType, Property } from "@/types/models";

export interface PropertyFilters {
  listingType?: ListingType | "all";
  county?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sort?: "newest" | "price_asc" | "price_desc";
}

function buildQueries(filters: PropertyFilters) {
  const q = [Query.equal("status", "approved"), Query.limit(60)];
  if (filters.listingType && filters.listingType !== "all") {
    q.push(Query.equal("listingType", filters.listingType));
  }
  if (filters.county) q.push(Query.equal("county", filters.county));
  if (filters.bedrooms) q.push(Query.greaterThanEqual("bedrooms", filters.bedrooms));
  if (filters.minPrice) q.push(Query.greaterThanEqual("price", filters.minPrice));
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

export function useProperties(filters: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        queries: buildQueries(filters),
      });
      return res.rows as unknown as Property[];
    },
  });
}

export function useFeaturedProperties() {
  return useQuery({
    queryKey: ["properties", "featured"],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        queries: [
          Query.equal("status", "approved"),
          Query.orderDesc("$createdAt"),
          Query.limit(6),
        ],
      });
      return res.rows as unknown as Property[];
    },
  });
}

export function useProperty(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        rowId: id!,
      });
      return res as unknown as Property;
    },
  });
}

export function useMyProperties(ownerId?: string) {
  return useQuery({
    enabled: !!ownerId,
    queryKey: ["my-properties", ownerId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.properties,
        queries: [
          Query.equal("ownerId", ownerId!),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Property[];
    },
  });
}
