import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Favorite } from "@/types/models";

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["favorites", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.favorites,
        queries: [Query.equal("userId", user!.$id), Query.limit(100)],
      });
      return res.rows as unknown as Favorite[];
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error("You must be logged in to save properties.");

      const existing = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.favorites,
        queries: [
          Query.equal("userId", user.$id),
          Query.equal("propertyId", propertyId),
          Query.limit(1),
        ],
      });

      if (existing.rows.length > 0) {
        await tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: TABLES.favorites,
          rowId: existing.rows[0].$id,
        });
        return { favorited: false };
      }

      await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.favorites,
        rowId: ID.unique(),
        data: { userId: user.$id, propertyId },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ],
      });
      return { favorited: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
