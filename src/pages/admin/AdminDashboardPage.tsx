import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  Inbox,
  Loader2,
  Package,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminAction,
  useAllProfiles,
  usePendingApplications,
  usePendingProducts,
  usePendingProperties,
  usePendingStorefronts,
} from "@/hooks/useAdmin";
import { formatKES, initials, timeAgo } from "@/lib/utils";
import type {
  ApplicationStatus,
  Product,
  PropertyStatus,
  Storefront,
} from "@/types/models";

export default function AdminDashboardPage() {
  const { data: applications, isLoading: loadingApps } = usePendingApplications();
  const { data: properties, isLoading: loadingProps } = usePendingProperties();
  const { data: profiles, isLoading: loadingUsers } = useAllProfiles();
  const { data: storefronts, isLoading: loadingStores } = usePendingStorefronts();
  const { data: products, isLoading: loadingProducts } = usePendingProducts();

  const pendingApps = applications?.filter((a) => a.status === "pending") ?? [];
  const pendingProps = properties?.filter((p) => p.status === "pending") ?? [];
  const pendingStores = storefronts?.filter((s) => s.status === "pending") ?? [];
  const pendingProducts = products?.filter((p) => p.status === "pending") ?? [];

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">
            Role applications
            {pendingApps.length > 0 && (
              <Badge variant="accent" className="ml-2">
                {pendingApps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="properties">
            Listings
            {pendingProps.length > 0 && (
              <Badge variant="accent" className="ml-2">
                {pendingProps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="storefronts">
            Stores
            {pendingStores.length > 0 && (
              <Badge variant="accent" className="ml-2">
                {pendingStores.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products">
            Products
            {pendingProducts.length > 0 && (
              <Badge variant="accent" className="ml-2">
                {pendingProducts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-6">
          {loadingApps ? (
            <LoadingRows />
          ) : applications && applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((a) => (
                <ApplicationRow key={a.$id} application={a} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No applications"
              description="Role applications from users will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          {loadingProps ? (
            <LoadingRows />
          ) : properties && properties.length > 0 ? (
            <div className="space-y-3">
              {properties.map((p) => (
                <PropertyRow key={p.$id} property={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No listings"
              description="Submitted property listings will appear here for approval."
            />
          )}
        </TabsContent>

        <TabsContent value="storefronts" className="mt-6">
          {loadingStores ? (
            <LoadingRows />
          ) : storefronts && storefronts.length > 0 ? (
            <div className="space-y-3">
              {storefronts.map((s) => (
                <StorefrontRow key={s.$id} store={s} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title="No storefronts"
              description="Submitted business storefronts will appear here for approval."
            />
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {loadingProducts ? (
            <LoadingRows />
          ) : products && products.length > 0 ? (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductModerationRow key={p.$id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No products"
              description="Products submitted by sellers will appear here for approval."
            />
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          {loadingUsers ? (
            <LoadingRows />
          ) : profiles && profiles.length > 0 ? (
            <div className="space-y-3">
              {profiles.map((p) => (
                <Card key={p.$id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Avatar>
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Joined {timeAgo(p.$createdAt)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No users"
              description="Registered user profiles will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const appStatusVariant: Record<
  ApplicationStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  suspended: "secondary",
};

function ApplicationRow({
  application,
}: {
  application: import("@/types/models").RoleApplication;
}) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (
    type: "approveRole" | "rejectRole" | "suspendRole",
    label: string,
  ) => {
    let note: string | undefined;
    if (type === "rejectRole") {
      note = prompt("Reason for rejection (optional):") ?? undefined;
    }
    setBusy(type);
    action.mutate(
      { action: type, applicationId: application.$id, note },
      {
        onSuccess: () => toast.success(`Application ${label}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
        <Avatar>
          <AvatarFallback>{initials(application.userName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{application.userName}</p>
            <Badge variant="outline">{application.roleLabel}</Badge>
            <Badge variant={appStatusVariant[application.status]}>
              {application.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{application.userEmail}</p>
          {application.message && (
            <p className="mt-1 text-sm">"{application.message}"</p>
          )}
        </div>
        <div className="flex gap-2">
          {application.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => run("approveRole", "approved")}
                disabled={!!busy}
              >
                {busy === "approveRole" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => run("rejectRole", "rejected")}
                disabled={!!busy}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {application.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("suspendRole", "suspended")}
              disabled={!!busy}
            >
              Suspend
            </Button>
          )}
          {application.status === "suspended" && (
            <Button
              size="sm"
              onClick={() => run("approveRole", "reactivated")}
              disabled={!!busy}
            >
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const propStatusVariant: Record<
  PropertyStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  draft: "secondary",
};

function PropertyRow({
  property,
}: {
  property: import("@/types/models").Property;
}) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (type: "approveProperty" | "rejectProperty", label: string) => {
    let note: string | undefined;
    if (type === "rejectProperty") {
      note = prompt("Reason for rejection:") ?? undefined;
      if (note === undefined) return;
    }
    setBusy(type);
    action.mutate(
      { action: type, propertyId: property.$id, note },
      {
        onSuccess: () => toast.success(`Listing ${label}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{property.title}</p>
            <Badge variant={propStatusVariant[property.status]}>
              {property.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {property.listingType}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {property.town}, {property.county} &middot; {formatKES(property.price)}{" "}
            &middot; by {property.ownerName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="ghost">
            <a href={`/properties/${property.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {property.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => run("approveProperty", "approved & published")}
              disabled={!!busy}
            >
              {busy === "approveProperty" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {property.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("rejectProperty", "rejected")}
              disabled={!!busy}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StorefrontRow({ store }: { store: Storefront }) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (type: "approveStorefront" | "rejectStorefront" | "verifyStorefront", label: string) => {
    setBusy(type);
    action.mutate(
      { action: type, storefrontId: store.$id },
      {
        onSuccess: () => toast.success(`Store ${label}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{store.name}</p>
            <Badge
              variant={
                store.status === "approved"
                  ? "success"
                  : store.status === "rejected"
                    ? "destructive"
                    : "warning"
              }
            >
              {store.status}
            </Badge>
            {store.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            <Badge variant="outline">{store.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{store.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="ghost">
            <a href={`/stores/${store.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {store.status !== "approved" && (
            <Button size="sm" onClick={() => run("approveStorefront", "approved")} disabled={!!busy}>
              {busy === "approveStorefront" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {!store.verified && store.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => run("verifyStorefront", "verified")} disabled={!!busy}>
              <BadgeCheck className="h-4 w-4" /> Verify
            </Button>
          )}
          {store.status !== "rejected" && (
            <Button size="sm" variant="outline" onClick={() => run("rejectStorefront", "rejected")} disabled={!!busy}>
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductModerationRow({ product }: { product: Product }) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (type: "approveProduct" | "rejectProduct", label: string) => {
    setBusy(type);
    action.mutate(
      { action: type, productId: product.$id },
      {
        onSuccess: () => toast.success(`Product ${label}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{product.title}</p>
            <Badge
              variant={
                product.status === "approved"
                  ? "success"
                  : product.status === "rejected"
                    ? "destructive"
                    : "warning"
              }
            >
              {product.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {product.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatKES(product.price)} &middot; {product.storeName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="ghost">
            <a href={`/marketplace/${product.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {product.status !== "approved" && (
            <Button size="sm" onClick={() => run("approveProduct", "approved")} disabled={!!busy}>
              {busy === "approveProduct" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {product.status !== "rejected" && (
            <Button size="sm" variant="outline" onClick={() => run("rejectProduct", "rejected")} disabled={!!busy}>
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
