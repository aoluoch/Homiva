import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Query } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { executeHomivaAdmin } from "@/lib/homivaAdmin";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import type { Message } from "@/types/models";

const DB = appwriteConfig.databaseId;

/** Deterministic thread id for a pair of users (+ optional context). */
export function makeThreadId(a: string, b: string, contextId?: string): string {
  const pair = [a, b].sort().join("_");
  return contextId ? `${pair}__${contextId}` : pair;
}

export interface Thread {
  threadId: string;
  otherId: string;
  otherName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

/** Inbox: group the current user's messages into threads. */
export function useThreads() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["threads", user?.$id],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        tablesDB.listRows({
          databaseId: DB,
          tableId: TABLES.messages,
          queries: [
            Query.equal("senderId", user!.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(200),
          ],
        }),
        tablesDB.listRows({
          databaseId: DB,
          tableId: TABLES.messages,
          queries: [
            Query.equal("receiverId", user!.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(200),
          ],
        }),
      ]);
      const all = [...sent.rows, ...received.rows] as unknown as Message[];
      const map = new Map<string, Thread>();
      for (const m of all) {
        const isMine = m.senderId === user!.$id;
        const otherId = isMine ? m.receiverId : m.senderId;
        const otherName = isMine ? "" : m.senderName;
        const existing = map.get(m.threadId);
        if (!existing || m.$createdAt > existing.lastAt) {
          map.set(m.threadId, {
            threadId: m.threadId,
            otherId,
            otherName: otherName || existing?.otherName || "Homiva user",
            lastMessage: m.body,
            lastAt: m.$createdAt,
            unread:
              (existing?.unread ?? 0) +
              (!isMine && !m.read ? 1 : 0),
          });
        } else if (!isMine && !m.read) {
          existing.unread += 1;
        }
      }
      return [...map.values()].sort((a, b) =>
        a.lastAt < b.lastAt ? 1 : -1,
      );
    },
  });
}

export function useThreadMessages(threadId?: string) {
  return useQuery({
    enabled: !!threadId,
    queryKey: ["thread", threadId],
    refetchInterval: 10_000,
    queryFn: async () => {
      const res = await tablesDB.listRows({
        databaseId: DB,
        tableId: TABLES.messages,
        queries: [
          Query.equal("threadId", threadId!),
          Query.orderAsc("$createdAt"),
          Query.limit(200),
        ],
      });
      return res.rows as unknown as Message[];
    },
  });
}

export function useSendMessage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiverId,
      body,
      contextType,
      contextId,
    }: {
      receiverId: string;
      body: string;
      contextType?: string;
      contextId?: string;
    }) => {
      if (!user) throw new Error("You must be logged in.");
      const threadId = makeThreadId(user.$id, receiverId, contextId);
      await executeHomivaAdmin({
        action: "sendMessage",
        receiverId,
        body,
        contextType: contextType ?? "",
        contextId: contextId ?? "",
        senderName: profile?.name ?? user.name,
      });
      return { threadId };
    },
    onSuccess: (_d, vars) => {
      const threadId = makeThreadId(user!.$id, vars.receiverId, vars.contextId);
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

/** Mark received unread messages in an open thread as read. */
export function useMarkThreadRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messages: Message[]) => {
      if (!user) return;
      const unread = messages.filter(
        (m) => m.receiverId === user.$id && !m.read,
      );
      await Promise.all(
        unread.map((m) =>
          tablesDB.updateRow({
            databaseId: DB,
            tableId: TABLES.messages,
            rowId: m.$id,
            data: { read: true },
          }),
        ),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}
