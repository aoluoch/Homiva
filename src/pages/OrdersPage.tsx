import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatKES, timeAgo } from "@/lib/utils";
import { useMyOrders } from "@/hooks/useStore";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  pending: "warning",
  paid: "secondary",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

export default function OrdersPage() {
  const { data, isLoading } = useMyOrders();

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">My Orders</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Products you buy from the marketplace will show up here."
          action={
            <Button asChild>
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <Card key={o.$id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{o.productTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty {o.quantity} · {formatKES(o.subtotal || o.amount)}
                  </p>
                  {(o.deliveryFee || 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Delivery {formatKES(o.deliveryFee || 0)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(o.$createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                  {o.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
