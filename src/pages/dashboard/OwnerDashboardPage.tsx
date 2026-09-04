import { Link } from "react-router-dom";
import {
  Building2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMyProperties } from "@/hooks/useProperties";
import { useDeleteProperty } from "@/hooks/usePropertyMutations";
import {
  useOwnerViewingRequests,
  useUpdateViewingRequest,
} from "@/hooks/useBuying";
import { formatKES } from "@/lib/utils";
import { formatStayDate } from "@/lib/booking";
import { propertyCover, PROPERTY_PLACEHOLDER } from "@/components/property/propertyImage";
import type { PropertyStatus, ViewingRequest } from "@/types/models";

const statusVariant: Record<
  PropertyStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  draft: "secondary",
};

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const {
    items: properties,
    total,
    isLoading,
    hasMore,
    loadMore,
    isFetchingNextPage,
  } = useMyProperties(user?.$id);
  const del = useDeleteProperty();

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Listing deleted."),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const stats = {
    total: total || properties.length,
    approved: properties.filter((p) => p.status === "approved").length,
    pending: properties.filter((p) => p.status === "pending").length,
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Owner dashboard</h1>
          <p className="text-muted-foreground">
            Manage your property listings
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/new">
            <Plus className="h-4 w-4" /> New listing
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total listings" value={stats.total} />
        <StatCard label="Approved (live)" value={stats.approved} />
        <StatCard label="Pending review" value={stats.pending} />
      </div>

      <OwnerViewingRequests />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-3">
          {properties.map((p) => (
            <Card key={p.$id}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <img
                  src={propertyCover(p, { width: 160, height: 120 })}
                  alt={p.title}
                  onError={(e) => (e.currentTarget.src = PROPERTY_PLACEHOLDER)}
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{p.title}</h3>
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.town}, {p.county}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {formatKES(p.price)}
                  </p>
                  {p.status === "rejected" && p.rejectionReason && (
                    <p className="mt-1 text-xs text-destructive">
                      Rejected: {p.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/properties/${p.$id}`}>View</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/dashboard/edit/${p.$id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(p.$id, p.title)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <LoadMoreButton
            hasMore={hasMore}
            loading={isFetchingNextPage}
            onLoadMore={loadMore}
            label="Load more listings"
          />
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No listings yet"
          description="Create your first property listing. It will go live once approved by the Homiva team."
          action={
            <Button asChild>
              <Link to="/dashboard/new">
                <Plus className="h-4 w-4" /> Create listing
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function OwnerViewingRequests() {
  const { data: requests, isLoading } = useOwnerViewingRequests();
  const update = useUpdateViewingRequest();
  const open = (requests ?? []).filter(
    (r) => r.status === "requested" || r.status === "confirmed",
  );

  const setStatus = (request: ViewingRequest, status: string) => {
    update.mutate(
      { id: request.$id, status },
      {
        onSuccess: () => toast.success(`Viewing ${status}.`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  if (isLoading || !open.length) return null;

  return (
    <div className="mb-8 space-y-3">
      <h2 className="text-lg font-semibold">Viewing requests</h2>
      {open.map((request) => (
        <Card key={request.$id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {request.propertyTitle || "Property viewing"}
                </p>
                <Badge variant="warning">{request.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {request.userName || "Homiva user"} · preferred{" "}
                {formatStayDate(request.preferredDate)}
                {request.phone ? ` · ${request.phone}` : ""}
              </p>
              {request.message ? (
                <p className="mt-1 text-sm">{request.message}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {request.status === "requested" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setStatus(request, "confirmed")}
                    disabled={update.isPending}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(request, "declined")}
                    disabled={update.isPending}
                  >
                    Decline
                  </Button>
                </>
              )}
              {request.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus(request, "completed")}
                  disabled={update.isPending}
                >
                  Mark completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
