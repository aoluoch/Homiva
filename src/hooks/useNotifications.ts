import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Notification } from "@/types/models";

const DB = appwriteConfig.databaseId;

export const ADMIN_ORDERS_LINK = "/admin?tab=orders";

function asNotification(row: unknown): Notification {
  const record = row as Record<string, unknown>;
  const nested = record.data;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;
  const typed = fields as unknown as Notification;
  return {
    ...typed,
    $id: String(record.$id ?? typed.$id ?? ""),
    $createdAt: String(record.$createdAt ?? typed.$createdAt ?? ""),
    $updatedAt: String(record.$updatedAt ?? typed.$updatedAt ?? ""),
    read: Boolean(typed.read),
  };
}

function invalidateNotificationQueries(
  qc: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  qc.invalidateQueries({ queryKey: ["notifications", userId] });
  qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
}

function markCachedNotificationsRead(
  qc: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
  shouldMark: (notification: Notification) => boolean,
) {
  if (!userId) return;
  qc.setQueryData<Notification[]>(["notifications", userId], (current) =>
    current?.map((notification) =>
      shouldMark(notification) ? { ...notification, read: true } : notification,
    ),
  );
}

export function isAdminOrderNotification(notification: Notification) {
  const link = notification.link || "";
  return notification.type === "order" || link.includes(ADMIN_ORDERS_LINK);
}

export function matchesOrderGroup(
  notification: Notification,
  groupId?: string,
) {
  if (!isAdminOrderNotification(notification)) return false;
  if (!groupId) return true;
  const link = notification.link || "";
  return !link.includes("group=") || link.includes(groupId);
}

async function listUserNotifications(userId: string, limit = 50) {
  const res = await tablesDB.listRows({
    databaseId: DB,
    tableId: TABLES.notifications,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ],
  });
  return (res.rows as unknown[]).map(asNotification);
}

export async function markMatchingNotificationsRead(
  userId: string,
  match: (notification: Notification) => boolean,
) {
  const notifications = await listUserNotifications(userId);
  const unread = notifications.filter(
    (notification) => !notification.read && match(notification),
  );
  await Promise.all(
    unread.map((notification) =>
      tablesDB.updateRow({
        databaseId: DB,
        tableId: TABLES.notifications,
        rowId: notification.$id,
        data: { read: true },
      }),
    ),
  );
  return unread.map((notification) => notification.$id);
}

/** The current user's notifications (most recent first). */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["notifications", user?.$id],
    queryFn: async () => listUserNotifications(user!.$id),
  });
}

/** Count of unread notifications, derived from the same inbox list. */
export function useUnreadCount() {
  const query = useNotifications();
  return {
    ...query,
    data: (query.data ?? []).filter((notification) => !notification.read).length,
  };
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications", user?.$id] });
      const previous = qc.getQueryData<Notification[]>([
        "notifications",
        user?.$id,
      ]);
      markCachedNotificationsRead(qc, user?.$id, (notification) => notification.$id === id);
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(["notifications", user?.$id], context.previous);
      }
    },
    onSettled: () => invalidateNotificationQueries(qc, user?.$id),
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
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ["notifications", user?.$id] });
      const previous = qc.getQueryData<Notification[]>([
        "notifications",
        user?.$id,
      ]);
      const idSet = new Set(ids);
      markCachedNotificationsRead(qc, user?.$id, (notification) =>
        idSet.has(notification.$id),
      );
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        qc.setQueryData(["notifications", user?.$id], context.previous);
      }
    },
    onSettled: () => invalidateNotificationQueries(qc, user?.$id),
  });
}

/** Mark admin order-to-deliver notifications as read when the inbox is opened. */
export function useMarkOrderNotificationsSeen(enabled: boolean) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !user?.$id) return;
    const userId = user.$id;
    let cancelled = false;

    void (async () => {
      try {
        const ids = await markMatchingNotificationsRead(userId, isAdminOrderNotification);
        if (cancelled || ids.length === 0) return;
        markCachedNotificationsRead(qc, userId, (notification) =>
          ids.includes(notification.$id),
        );
        invalidateNotificationQueries(qc, userId);
      } catch {
        // Opening the orders tab must not fail if a notification cannot be marked.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, qc, user?.$id]);
}
