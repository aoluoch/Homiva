import type { Order } from "@/types/models";

export interface OrderGroup {
  groupId: string;
  orders: Order[];
  buyerName: string;
  phone: string;
  address: string;
  paymentRef: string;
  createdAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
}

/** True when a checkout still has line items waiting to be shipped or handed over. */
export function groupNeedsDelivery(group: Pick<OrderGroup, "orders" | "status">) {
  return group.orders.some((order) => order.status === "paid");
}

/** Group marketplace line items into one checkout / delivery. */
export function groupOrders(orders: Order[]): OrderGroup[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const key = order.orderGroupId || order.$id;
    const list = map.get(key) ?? [];
    list.push(order);
    map.set(key, list);
  }

  const groups: OrderGroup[] = [];
  for (const [groupId, list] of map.entries()) {
    const first = [...list].sort((a, b) =>
      a.$createdAt < b.$createdAt ? -1 : 1,
    )[0];
    const statuses = new Set(list.map((order) => String(order.status)));
    groups.push({
      groupId,
      orders: list,
      buyerName: first.buyerName || "Homiva customer",
      phone: first.phone || "",
      address: first.secureAddress || first.address || "",
      paymentRef: first.paymentRef || "",
      createdAt: first.$createdAt,
      subtotal: list.reduce((sum, order) => sum + (order.subtotal ?? 0), 0),
      deliveryFee: list.reduce((sum, order) => sum + (order.deliveryFee ?? 0), 0),
      total: list.reduce((sum, order) => sum + (order.amount ?? 0), 0),
      status: statuses.size === 1 ? [...statuses][0] : "mixed",
    });
  }
  return groups.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Checkouts that still have at least one paid line item to deliver. */
export function groupsAwaitingDelivery(orders: Order[] | undefined) {
  return groupOrders(orders ?? []).filter(groupNeedsDelivery);
}
