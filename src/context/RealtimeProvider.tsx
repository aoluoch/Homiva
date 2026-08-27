import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Channel, type RealtimeResponseEvent } from "appwrite";
import { client } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

type TableId = (typeof TABLES)[keyof typeof TABLES];

const ALL_TABLES = Object.values(TABLES) as TableId[];

/** Public tables every visitor should live-update from. */
const PUBLIC_TABLES: TableId[] = [
  TABLES.properties,
  TABLES.propertyImages,
  TABLES.storefronts,
  TABLES.products,
  TABLES.reviews,
  TABLES.partnerCompanies,
  TABLES.partnerPortfolioImages,
];

const tableQueryKeys: Partial<Record<TableId, string[][]>> = {
  [TABLES.profiles]: [["admin", "profiles"]],
  [TABLES.roleApplications]: [["my-applications"], ["admin", "applications"]],
  [TABLES.properties]: [
    ["properties"],
    ["property"],
    ["my-properties"],
    ["admin", "properties"],
    ["admin", "stats"],
    // Unlock CTA depends on status + locationVerificationStatus.
    ["viewing-access"],
  ],
  [TABLES.propertyImages]: [["property"], ["properties"], ["my-properties"]],
  [TABLES.viewingPayments]: [["viewing-access"]],
  [TABLES.recentlyViewed]: [["recently-viewed"]],
  [TABLES.favorites]: [["favorites"], ["saved-properties"]],
  [TABLES.inquiries]: [["inquiries"], ["admin", "stats"]],
  [TABLES.serviceRequests]: [
    ["my-service-requests"],
    ["open-service-requests"],
    ["provider-jobs"],
    ["admin", "stats"],
  ],
  [TABLES.serviceProviders]: [
    ["my-service-provider"],
    ["admin", "service-providers"],
  ],
  [TABLES.partnerCompanies]: [
    ["partner-companies"],
    ["partner-company"],
    ["my-partner-company"],
    ["admin", "partner-companies"],
    ["admin", "stats"],
  ],
  [TABLES.partnerPortfolioImages]: [
    ["partner-portfolio"],
    ["my-partner-portfolio"],
    ["partner-company"],
  ],
  [TABLES.invoices]: [
    ["my-invoices"],
    ["provider-invoices"],
    ["service-invoice"],
  ],
  [TABLES.payments]: [["admin", "stats"]],
  [TABLES.reviews]: [["reviews"]],
  [TABLES.auditLogs]: [["admin", "audit-logs"]],
  [TABLES.bookings]: [
    ["property-bookings"],
    ["my-trips"],
    ["host-bookings"],
    ["admin", "stats"],
  ],
  [TABLES.storefronts]: [
    ["my-storefront"],
    ["storefronts"],
    ["storefront"],
    ["admin", "storefronts"],
    ["admin", "stats"],
  ],
  [TABLES.products]: [
    ["products"],
    ["product"],
    ["store-products"],
    ["my-products"],
    ["admin", "products"],
    ["admin", "stats"],
  ],
  [TABLES.orders]: [["seller-orders"], ["my-orders"], ["admin", "stats"]],
  [TABLES.appSettings]: [["marketplace", "delivery-fee"]],
  [TABLES.subscriptions]: [
    ["my-storefront"],
    ["my-partner-company"],
    ["partner-companies"],
    ["admin", "stats"],
  ],
  [TABLES.messages]: [["threads"], ["thread"]],
  [TABLES.notifications]: [["notifications"], ["notifications-unread"]],
  [TABLES.disputes]: [["my-disputes"], ["admin", "disputes"], ["admin", "stats"]],
  [TABLES.mortgageEnquiries]: [
    ["my-mortgage-enquiries"],
    ["admin", "mortgage-enquiries"],
  ],
  [TABLES.viewingRequests]: [
    ["my-viewing-requests"],
    ["owner-viewing-requests"],
    ["admin", "viewing-requests"],
  ],
};

function tableFromEvent(event: RealtimeResponseEvent<unknown>): TableId | null {
  for (const channel of event.channels) {
    const match = channel.match(/tablesdb\.[^.]+\.tables\.([^.]+)\.rows/);
    const tableId = match?.[1] as TableId | undefined;
    if (tableId && ALL_TABLES.includes(tableId)) return tableId;
  }
  return null;
}

function affectedQueryKeys(tableId: TableId | null): string[][] {
  if (!tableId) return [];
  return tableQueryKeys[tableId] ?? [["admin"]];
}

/**
 * Keeps Homiva UI in sync with Appwrite Realtime.
 * - Guests: public marketplace channels
 * - Signed-in users: every TablesDB table + account/teams
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const pendingKeys = useRef(new Set<string>());
  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    const tables = user ? ALL_TABLES : PUBLIC_TABLES;
    const channels = [
      ...(user ? ["account", "teams", "memberships"] : []),
      ...tables.map((tableId) =>
        Channel.tablesdb(appwriteConfig.databaseId)
          .table(tableId)
          .row()
          .toString(),
      ),
    ];

    const flush = () => {
      flushTimer.current = null;
      const keys = [...pendingKeys.current];
      pendingKeys.current.clear();
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      }
    };

    const queueInvalidate = (queryKey: string[]) => {
      pendingKeys.current.add(JSON.stringify(queryKey));
      if (flushTimer.current) return;
      flushTimer.current = window.setTimeout(flush, 250);
    };

    const unsubscribe = client.subscribe(channels, (event) => {
      const isAuthEvent = event.channels.some(
        (channel) =>
          channel === "account" ||
          channel.startsWith("teams") ||
          channel.startsWith("memberships"),
      );

      if (isAuthEvent) {
        void refresh();
        return;
      }

      const tableId = tableFromEvent(event);
      for (const queryKey of affectedQueryKeys(tableId)) {
        queueInvalidate(queryKey);
      }
    });

    return () => {
      unsubscribe();
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      pendingKeys.current.clear();
    };
  }, [queryClient, refresh, user?.$id]);

  return <>{children}</>;
}
