import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Package,
  ShieldCheck,
  Store,
  Users,
  Wrench,
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
  useAdminStats,
  useAuditLogs,
  useAdminAction,
  useAllProfiles,
  usePendingApplications,
  usePendingProducts,
  usePendingProperties,
  usePendingStorefronts,
  useServiceProviders,
  type AdminStats,
} from "@/hooks/useAdmin";
import { fileView } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { formatKES, initials, timeAgo } from "@/lib/utils";
import type {
  AuditLog,
  ApplicationStatus,
  Product,
  PropertyStatus,
  ServiceProvider,
  Storefront,
} from "@/types/models";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: applications, isLoading: loadingApps } = usePendingApplications();
  const { data: properties, isLoading: loadingProps } = usePendingProperties();
  const { data: profiles, isLoading: loadingUsers } = useAllProfiles();
  const { data: storefronts, isLoading: loadingStores } = usePendingStorefronts();
  const { data: products, isLoading: loadingProducts } = usePendingProducts();
  const { data: providers, isLoading: loadingProviders } = useServiceProviders();
  const { data: auditLogs, isLoading: loadingAuditLogs } = useAuditLogs();

  const pendingApps = applications?.filter((a) => a.status === "pending") ?? [];
  const pendingProps = properties?.filter((p) => p.status === "pending") ?? [];
  const pendingStores = storefronts?.filter((s) => s.status === "pending") ?? [];
  const pendingProducts = products?.filter((p) => p.status === "pending") ?? [];
  const unverifiedProviders =
    providers?.filter((provider) => !provider.verified) ?? [];

  return (
    <div className="container max-w-7xl py-5 sm:py-8">
      <div className="mb-5 flex items-center gap-2 sm:mb-6">
        <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
        <h1 className="text-2xl font-bold sm:text-3xl">Admin dashboard</h1>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <TabsList className="h-auto min-w-max justify-start gap-1 rounded-md">
            <TabsTrigger value="overview" className="h-9">
              <BarChart3 className="mr-1 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="applications" className="h-9">
              Role applications
              {pendingApps.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingApps.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties" className="h-9">
              Listings
              {pendingProps.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingProps.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="storefronts" className="h-9">
              Stores
              {pendingStores.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingStores.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="h-9">
              Products
              {pendingProducts.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingProducts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="providers" className="h-9">
              Providers
              {unverifiedProviders.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {unverifiedProviders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="h-9">
              Audit
            </TabsTrigger>
            <TabsTrigger value="users" className="h-9">
              Users
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          {loadingStats ? (
            <LoadingRows />
          ) : stats ? (
            <AdminOverview stats={stats} />
          ) : (
            <EmptyState
              icon={Activity}
              title="No metrics yet"
              description="Platform metrics will appear here as users transact."
            />
          )}
        </TabsContent>

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

        <TabsContent value="providers" className="mt-6">
          {loadingProviders ? (
            <LoadingRows />
          ) : providers && providers.length > 0 ? (
            <div className="space-y-3">
              {providers.map((provider) => (
                <ProviderRow key={provider.$id} provider={provider} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No provider profiles"
              description="Service providers will appear here after submitting their verification profile."
            />
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          {loadingAuditLogs ? (
            <LoadingRows />
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((entry) => (
                <AuditLogRow key={entry.$id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No audit entries"
              description="Admin actions will be recorded here."
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
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                    <Avatar>
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground sm:text-right">
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

function AdminOverview({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: "Users", value: stats.users.toLocaleString() },
    { label: "Approved listings", value: stats.propertiesApproved.toLocaleString() },
    { label: "Pending listings", value: stats.propertiesPending.toLocaleString() },
    { label: "Stores", value: stats.storefrontsApproved.toLocaleString() },
    { label: "Bookings GMV", value: formatKES(stats.bookingsGmv) },
    { label: "Orders revenue", value: formatKES(stats.ordersRevenue) },
    { label: "Completed jobs", value: stats.completedJobs.toLocaleString() },
    { label: "Subscription MRR", value: formatKES(stats.subscriptionMrr) },
    { label: "Open disputes", value: stats.openDisputes.toLocaleString() },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 break-words text-xl font-bold sm:text-2xl">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <Avatar className="shrink-0">
          <AvatarFallback>{initials(application.userName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {application.userName}
            </p>
            <Badge variant="outline">{application.roleLabel}</Badge>
            <Badge variant={appStatusVariant[application.status]}>
              {application.status}
            </Badge>
          </div>
          <p className="break-all text-sm text-muted-foreground">
            {application.userEmail}
          </p>
          {application.message && (
            <p className="mt-1 break-words text-sm">"{application.message}"</p>
          )}
          {application.documentIds && application.documentIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {application.documentIds.map((fileId, index) => (
                <a
                  key={fileId}
                  href={fileView(
                    appwriteConfig.buckets.verificationDocuments,
                    fileId,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-secondary"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {application.documentLabels?.[index] ?? `Document ${index + 1}`}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:flex md:shrink-0">
          {application.status === "pending" && (
            <>
              <Button
                size="sm"
                className="w-full md:w-auto"
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
                className="w-full md:w-auto"
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
              className="w-full md:w-auto"
              onClick={() => run("suspendRole", "suspended")}
              disabled={!!busy}
            >
              Suspend
            </Button>
          )}
          {application.status === "suspended" && (
            <Button
              size="sm"
              className="w-full md:w-auto"
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
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">{property.title}</p>
            <Badge variant={propStatusVariant[property.status]}>
              {property.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {property.listingType}
            </Badge>
          </div>
          <p className="break-words text-sm text-muted-foreground">
            {property.town}, {property.county} &middot; {formatKES(property.price)}{" "}
            &middot; by {property.ownerName}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:flex md:shrink-0">
          <Button asChild size="sm" variant="ghost" className="w-full md:w-auto">
            <a href={`/properties/${property.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {property.status !== "approved" && (
            <Button
              size="sm"
              className="w-full md:w-auto"
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
              className="w-full md:w-auto"
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
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">{store.name}</p>
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
          <p className="break-words text-sm text-muted-foreground">
            {store.description}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:flex md:shrink-0 md:flex-wrap md:justify-end">
          <Button asChild size="sm" variant="ghost" className="w-full md:w-auto">
            <a href={`/stores/${store.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {store.status !== "approved" && (
            <Button size="sm" className="w-full md:w-auto" onClick={() => run("approveStorefront", "approved")} disabled={!!busy}>
              {busy === "approveStorefront" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {!store.verified && store.status === "approved" && (
            <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => run("verifyStorefront", "verified")} disabled={!!busy}>
              <BadgeCheck className="h-4 w-4" /> Verify
            </Button>
          )}
          {store.status !== "rejected" && (
            <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => run("rejectStorefront", "rejected")} disabled={!!busy}>
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
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">{product.title}</p>
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
          <p className="break-words text-sm text-muted-foreground">
            {formatKES(product.price)} &middot; {product.storeName}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:flex md:shrink-0">
          <Button asChild size="sm" variant="ghost" className="w-full md:w-auto">
            <a href={`/marketplace/${product.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          {product.status !== "approved" && (
            <Button size="sm" className="w-full md:w-auto" onClick={() => run("approveProduct", "approved")} disabled={!!busy}>
              {busy === "approveProduct" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {product.status !== "rejected" && (
            <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => run("rejectProduct", "rejected")} disabled={!!busy}>
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ provider }: { provider: ServiceProvider }) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (type: "verifyProvider" | "unverifyProvider", label: string) => {
    setBusy(type);
    action.mutate(
      { action: type, providerId: provider.$id },
      {
        onSuccess: () => toast.success(`Provider ${label}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {provider.businessName}
            </p>
            <Badge variant={provider.verified ? "success" : "warning"}>
              {provider.verified ? "verified" : "pending verification"}
            </Badge>
            {provider.county && <Badge variant="outline">{provider.county}</Badge>}
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {(provider.categories ?? []).join(", ") || "No categories selected"}
          </p>
        </div>
        <div className="grid gap-2 md:flex md:shrink-0">
          {!provider.verified ? (
            <Button
              size="sm"
              className="w-full md:w-auto"
              onClick={() => run("verifyProvider", "verified")}
              disabled={!!busy}
            >
              {busy === "verifyProvider" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Verify
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => run("unverifyProvider", "unverified")}
              disabled={!!busy}
            >
              Remove verification
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogRow({ entry }: { entry: AuditLog }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{entry.action}</Badge>
            <span className="min-w-0 break-words text-sm font-medium">
              {entry.summary}
            </span>
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {entry.targetType}
            {entry.targetId ? ` · ${entry.targetId}` : ""} · actor {entry.actorId}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground md:text-right">
          {timeAgo(entry.$createdAt)}
        </span>
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
