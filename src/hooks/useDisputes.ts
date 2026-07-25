import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ID, Permission, Query, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Dispute } from "@/types/models";

const DB = appwriteConfig.databaseId;

export interface DisputeInput {
  subjectType: string;
  subjectId?: string;
  subjectTitle?: string;
  category: string;
  description: string;
}

/** Disputes raised by the current user. */
export function useMyDisputes() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-disputes", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.disputes,
        queries: [
          Query.equal("raisedBy", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ],
      });
      return res.rows as unknown as Dispute[];
    },
  });
}

/** Raise a new dispute. */
export function useCreateDispute() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisputeInput) => {
      if (!user) throw new Error("You must be logged in to raise a dispute.");
      if (!input.description.trim()) throw new Error("Please describe the issue.");
      return tablesDB.createRow({
        databaseId: DB,
        tableId: TABLES.disputes,
        rowId: ID.unique(),
        data: {
          raisedBy: user.$id,
          raisedByName: profile?.name ?? user.name,
          subjectType: input.subjectType,
          subjectId: input.subjectId ?? "",
          subjectTitle: input.subjectTitle ?? "",
          category: input.category,
          description: input.description,
          status: "open",
        },
        permissions: [
          Permission.read(Role.user(user.$id)),
        ],
      }) as unknown as Dispute;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
    },
  });
}
