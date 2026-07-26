import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/types/models";

const DB = appwriteConfig.databaseId;

/** The current user's notifications (most recent first). */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["notifications", user?.$id],
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.notifications,
        queries: [
          Query.equal("userId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ],
      });
      return res.rows as unknown as Notification[];
    },
  });
}

/** Count of unread notifications (polled). */
export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["notifications-unread", user?.$id],
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.notifications,
        queries: [
          Query.equal("userId", user!.$id),
          Query.equal("read", false),
          Query.limit(1),
        ],
      });
      return res.total;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.notifications,
        rowId: id,
        data: { read: true },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.$id] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", user?.$id] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          tablesDB.updateRow({
            databaseId: DB,
            tableId: TABLES.notifications,
            rowId: id,
            data: { read: true },
          }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.$id] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", user?.$id] });
    },
  });
}
