import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Review } from "@/types/models";

const DB = appwriteConfig.databaseId;

export type ReviewTarget =
  | "property"
  | "provider"
  | "service"
  | "product"
  | "storefront";

export function useReviews(targetType: ReviewTarget, targetId?: string) {
  return useQuery({
    enabled: !!targetId,
    queryKey: ["reviews", targetType, targetId],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.reviews,
        queries: [
          Query.equal("targetType", targetType),
          Query.equal("targetId", targetId!),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Review[];
    },
  });
}

export function useCreateReview() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      rating,
      comment,
    }: {
      targetType: ReviewTarget;
      targetId: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user) throw new Error("You must be logged in to review.");
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.reviews,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          userName: profile?.name ?? user.name,
          targetType,
          targetId,
          rating,
          comment: comment ?? "",
        },
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
          Permission.update(Role.team(TEAMS.admins)),
          Permission.delete(Role.team(TEAMS.admins)),
        ],
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["reviews", vars.targetType, vars.targetId],
      });
    },
  });
}
