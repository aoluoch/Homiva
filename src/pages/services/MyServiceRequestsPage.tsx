import { Link } from "react-router-dom";
import {
  ClipboardList,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
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
  requested: "warning",
  reviewed: "secondary",
  quoted: "default",
  scheduled: "secondary",
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
          description="Request a Homiva-operated service to get an instant estimate."
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
                    {r.assignedTo && (
                      <span className="text-muted-foreground">
                        {" "}· {r.assignedTo}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(r.$createdAt)}
                  </p>
                  <ServiceRequestContact request={r} />
                </div>
                <div className="flex shrink-0 gap-2">
                  {(r.status === "quoted" ||
                    r.status === "scheduled" ||
                    r.status === "completed") && (
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
                  {r.status === "requested" && (
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

function ServiceRequestContact({ request }: { request: ServiceRequest }) {
  const location = [request.address, request.town, request.county]
    .filter(Boolean)
    .join(", ");

  if (!request.contactPhone && !location) return null;

  return (
    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
      {request.contactPhone && (
        <p className="flex items-center gap-1">
          <Phone className="h-3.5 w-3.5" />
          {request.contactPhone}
        </p>
      )}
      {location && (
        <p className="flex items-start gap-1">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{location}</span>
        </p>
      )}
      {request.latitude && request.longitude && (
        <a
          href={serviceRequestMapHref(request)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open pinned location
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function serviceRequestMapHref(request: ServiceRequest) {
  if (request.latitude && request.longitude) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      request.latitude,
    )}&mlon=${encodeURIComponent(request.longitude)}#map=16/${
      request.latitude
    }/${request.longitude}`;
  }
  const query = [request.address, request.town, request.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}
