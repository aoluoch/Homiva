import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Channel, type RealtimeResponseEvent } from "appwrite";
import { client } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

type TableId = (typeof TABLES)[keyof typeof TABLES];

const tableIds = Object.values(TABLES);

const tableQueryKeys: Partial<Record<TableId, string[][]>> = {
  [TABLES.profiles]: [["admin", "profiles"]],
  [TABLES.roleApplications]: [["my-applications"], ["admin", "applications"]],
  [TABLES.properties]: [
    ["properties"],
    ["property"],
    ["my-properties"],
    ["admin", "properties"],
    ["admin", "stats"],
  ],
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
  [TABLES.subscriptions]: [["my-storefront"], ["admin", "stats"]],
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
    if (match && tableIds.includes(match[1] as TableId)) {
      return match[1] as TableId;
    }
  }
  return null;
}

function affectedQueryKeys(tableId: TableId | null): string[][] {
  if (!tableId) return [["admin"]];
  return tableQueryKeys[tableId] ?? [["admin"]];
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();

  useEffect(() => {
    const channels = [
      "account",
      "teams",
      "memberships",
      ...tableIds.map((tableId) =>
        Channel.tablesdb(appwriteConfig.databaseId).table(tableId).row().toString(),
      ),
    ];

    const unsubscribe = client.subscribe(channels, (event) => {
      const isAuthEvent = event.channels.some(
        (channel) =>
          channel === "account" ||
          channel.startsWith("teams") ||
          channel.startsWith("memberships"),
      );

      if (isAuthEvent) {
        void refresh();
        void queryClient.invalidateQueries();
        return;
      }

      const tableId = tableFromEvent(event);
      for (const queryKey of affectedQueryKeys(tableId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => unsubscribe();
  }, [queryClient, refresh, user?.$id]);

  return <>{children}</>;
}
