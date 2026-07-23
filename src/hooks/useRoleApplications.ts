import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { RoleApplication } from "@/types/models";

/** Applications submitted by the current user. */
export function useMyApplications() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-applications", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ],
      });
      return res.rows as unknown as RoleApplication[];
    },
  });
}

export function useApplyForRole() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      roleLabel,
      message,
    }: {
      role: string;
      roleLabel: string;
      message?: string;
    }) => {
      if (!user) throw new Error("You must be logged in to apply.");

      // Prevent duplicate pending applications for the same role.
      const existing = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        queries: [
          Query.equal("userId", user.$id),
          Query.equal("role", role),
          Query.equal("status", "pending"),
          Query.limit(1),
        ],
      });
      if (existing.rows.length > 0) {
        throw new Error("You already have a pending application for this role.");
      }

      return tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.roleApplications,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          userName: profile?.name ?? user.name,
          userEmail: user.email,
          role,
          roleLabel,
          status: "pending",
          message: message ?? "",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
          Permission.read(Role.team(TEAMS.admins)),
          Permission.update(Role.team(TEAMS.admins)),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
}
