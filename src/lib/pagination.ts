import { useInfiniteQuery } from "@tanstack/react-query";
import { Query, tablesDB } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";

/** Page sizes tuned for Appwrite Pro + large audiences (200k+ users). */
export const PAGE_SIZE = {
  browse: 24,
  admin: 25,
  inbox: 40,
  compact: 12,
} as const;

export type PageResult<T extends { $id: string }> = {
  rows: T[];
  total: number;
  nextCursor?: string;
};

/**
 * Cursor-based infinite list against TablesDB.
 * Uses Query.cursorAfter so deep pages stay O(page) instead of offset scans.
 */
export function useAppwriteInfiniteRows<T extends { $id: string }>(options: {
  queryKey: unknown[];
  tableId: string;
  /** Filter + order queries only — limit/cursor are appended. */
  buildQueries: () => string[];
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
}) {
  const {
    queryKey,
    tableId,
    buildQueries,
    pageSize = PAGE_SIZE.browse,
    enabled = true,
    staleTime,
  } = options;

  const query = useInfiniteQuery({
    queryKey,
    enabled,
    staleTime,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<PageResult<T>> => {
      const queries = [
        ...buildQueries(),
        Query.limit(pageSize),
        ...(pageParam ? [Query.cursorAfter(pageParam)] : []),
      ];
      const res = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId,
        queries,
      });
      const rows = res.rows as unknown as T[];
      return {
        rows,
        total: res.total,
        nextCursor:
          rows.length === pageSize ? rows[rows.length - 1]?.$id : undefined,
      };
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    items,
    total,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
}
