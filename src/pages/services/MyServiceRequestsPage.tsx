import { Link } from "react-router-dom";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_CATEGORIES } from "@/lib/config";
import { formatKES, timeAgo } from "@/lib/utils";
import {
  useMyServiceRequests,
  usePayForService,
  useUpdateServiceStatus,
} from "@/hooks/useServices";
import type { ServiceRequest } from "@/types/models";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  pending: "warning",
  accepted: "secondary",
  in_progress: "secondary",
  completed: "default",
  paid: "success",
  cancelled: "destructive",
};

function label(key: string) {
  return SERVICE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export default function MyServiceRequestsPage() {
  const { data, isLoading } = useMyServiceRequests();
  const pay = usePayForService();
  const updateStatus = useUpdateServiceStatus();

  const onPay = (request: ServiceRequest) => {
    pay.mutate(
      { request },
      {
        onSuccess: () => toast.success("Payment successful. Thank you!"),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Service Requests</h1>
          <p className="text-muted-foreground">
            Track your maintenance and cleaning jobs.
          </p>
        </div>
        <Button asChild>
          <Link to="/services/request">
            <Plus className="h-4 w-4" /> New request
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requests yet"
          description="Request a service to get an instant estimate from verified providers."
          action={
            <Button asChild>
              <Link to="/services/request">Request a service</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map((r) => (
            <Card key={r.$id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{label(r.category)}</h3>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.problem} {r.propertyType ? `· ${r.propertyType}` : ""}
                    {r.town ? ` · ${r.town}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {r.quotedAmount && r.quotedAmount > 0 ? (
                      <span className="font-medium text-primary">
                        Quote: {formatKES(r.quotedAmount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Estimate: {formatKES(r.estimatedMin ?? 0)} -{" "}
                        {formatKES(r.estimatedMax ?? 0)}
                      </span>
                    )}
                    {r.providerName && (
                      <span className="text-muted-foreground">
                        {" "}· {r.providerName}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(r.$createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {(r.status === "completed" || r.status === "accepted" ||
                    r.status === "in_progress") && (
                    <Button
                      onClick={() => onPay(r)}
                      disabled={pay.isPending}
                    >
                      {pay.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Pay{" "}
                      {formatKES(
                        r.quotedAmount && r.quotedAmount > 0
                          ? r.quotedAmount
                          : r.estimatedMax ?? 0,
                      )}
                    </Button>
                  )}
                  {r.status === "pending" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatus.mutate({
                          requestId: r.$id,
                          status: "cancelled",
                        })
                      }
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
