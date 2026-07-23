import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Property } from "@/types/models";

export function useCreateInquiry() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      property,
      message,
      phone,
    }: {
      property: Property;
      message: string;
      phone?: string;
    }) => {
      if (!user) throw new Error("You must be logged in to send an inquiry.");
      return tablesDB.createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: TABLES.inquiries,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          userName: profile?.name ?? user.name,
          propertyId: property.$id,
          propertyTitle: property.title,
          message,
          phone: phone ?? "",
          status: "open",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
          Permission.read(Role.team(TEAMS.admins)),
          Permission.update(Role.team(TEAMS.admins)),
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
