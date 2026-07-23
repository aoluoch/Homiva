import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Property, RecentlyViewed } from "@/types/models";

export function useRecordView() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) return null;

      const existing = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.recentlyViewed,
        queries: [
          Query.equal("userId", user.$id),
          Query.equal("propertyId", propertyId),
          Query.limit(1),
        ],
      });

      const now = new Date().toISOString();
      if (existing.rows.length > 0) {
        return tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: TABLES.recentlyViewed,
          rowId: existing.rows[0].$id,
          data: { viewedAt: now },
        });
      }

      return tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.recentlyViewed,
        rowId: ID.unique(),
        data: { userId: user.$id, propertyId, viewedAt: now },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recently-viewed"] });
    },
  });
}

export function useRecentlyViewed() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["recently-viewed", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.recentlyViewed,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("viewedAt"),
          Query.limit(24),
        ],
      });
      const views = res.rows as unknown as RecentlyViewed[];

      // Resolve the referenced properties (best-effort; skip unavailable).
      const properties = await Promise.all(
        views.map(async (v) => {
          try {
            const p = await tablesDB.getRow({
              databaseId: appwriteConfig.databaseId,
              tableId: TABLES.properties,
              rowId: v.propertyId,
            });
            return p as unknown as Property;
          } catch {
            return null;
          }
        }),
      );
      return properties.filter((p): p is Property => p !== null);
    },
  });
}
