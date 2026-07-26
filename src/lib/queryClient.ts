import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query defaults tuned for many concurrent Appwrite clients:
 * - longer staleTime reduces repeat reads under load
 * - gcTime keeps warm cache for back/forward navigation
 * - limited retries avoid stampedes on transient errors
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
