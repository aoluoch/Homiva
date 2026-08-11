import { useEffect, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  ExternalLink,
  FileText,
  ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  Package,
  Phone,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyMapPreview } from "@/components/location/PropertyLocationPicker";
import {
  useAdminStats,
  useAuditLogs,
  useAdminAction,
  useAdminPartnerCompanies,
  useAllProfiles,
  usePendingApplications,
  usePendingProducts,
  usePendingProperties,
  type AdminStats,
} from "@/hooks/useAdmin";
import {
  useAdminUpdateMarketplaceDeliveryFee,
  useMarketplaceDeliveryFee,
} from "@/hooks/useMarketplace";
import {
  useAdminServiceRequests,
  useAdminUpdateServiceRequest,
} from "@/hooks/useServices";
import {
  useAdminCreateProduct,
  useAdminDeleteProduct,
  useAdminUpdateProduct,
  type ProductInput,
} from "@/hooks/useStore";
import { filePreview, fileView } from "@/lib/appwrite";
import {
  appwriteConfig,
  MARKETPLACE_CATEGORIES,
  PARTNER_CATEGORIES,
  PRODUCT_CONDITIONS,
} from "@/lib/config";
import { formatKES, initials, timeAgo } from "@/lib/utils";
import type {
  AuditLog,
  ApplicationStatus,
  Product,
  PartnerCompany,
  PropertyStatus,
  ServiceRequest,
} from "@/types/models";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const {
    items: applications,
    isLoading: loadingApps,
    hasMore: hasMoreApps,
    loadMore: loadMoreApps,
    isFetchingNextPage: loadingMoreApps,
  } = usePendingApplications();
  const { data: properties, isLoading: loadingProps } = usePendingProperties();
  const { data: profiles, isLoading: loadingUsers } = useAllProfiles();
  const { data: products, isLoading: loadingProducts } = usePendingProducts();
  const { data: partners, isLoading: loadingPartners } = useAdminPartnerCompanies();
  const { data: serviceRequests, isLoading: loadingServices } =
    useAdminServiceRequests();
  const { data: auditLogs, isLoading: loadingAuditLogs } = useAuditLogs();

  const pendingApps = applications.filter((a) => a.status === "pending");
  const pendingProps = properties?.filter((p) => p.status === "pending") ?? [];
  const pendingProducts = products?.filter((p) => p.status === "pending") ?? [];
  const pendingPartners = partners?.filter((p) => p.status === "pending") ?? [];
  const openServices =
    serviceRequests?.filter((r) => !["completed", "paid", "cancelled"].includes(String(r.status))) ?? [];

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
            <TabsTrigger value="partners" className="h-9">
              Partners
              {pendingPartners.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {pendingPartners.length}
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
            <TabsTrigger value="marketplace-settings" className="h-9">
              <Settings className="mr-1 h-4 w-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="services" className="h-9">
              Services
              {openServices.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {openServices.length}
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
          ) : applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((a) => (
                <ApplicationRow key={a.$id} application={a} />
              ))}
              <LoadMoreButton
                hasMore={hasMoreApps}
                loading={loadingMoreApps}
                onLoadMore={loadMoreApps}
                label="Load more applications"
              />
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

        <TabsContent value="partners" className="mt-6">
          {loadingPartners ? (
            <LoadingRows />
          ) : partners && partners.length > 0 ? (
            <div className="space-y-3">
              {partners.map((company) => (
                <PartnerCompanyRow key={company.$id} company={company} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title="No partner companies"
              description="Submitted partner company profiles will appear here for approval."
            />
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <div className="mb-4 flex justify-end">
            <AdminProductDialog />
          </div>
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
              description="Homiva marketplace products will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="marketplace-settings" className="mt-6">
          <AdminMarketplaceSettings />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {loadingServices ? (
            <LoadingRows />
          ) : serviceRequests && serviceRequests.length > 0 ? (
            <div className="space-y-3">
              {serviceRequests.map((request) => (
                <ServiceRequestRow key={request.$id} request={request} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="No service requests"
              description="Homiva-operated service requests will appear here."
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
    { label: "Published partners", value: stats.partnerCompaniesPublished.toLocaleString() },
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
  const applicationLocation = [
    application.address,
    application.town,
    application.county,
  ]
    .filter(Boolean)
    .join(", ");

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
          {(application.phone ||
            application.address ||
            application.town ||
            application.county) && (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {application.phone && (
                <a
                  href={`tel:${application.phone}`}
                  className="flex w-fit items-center gap-1 hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {application.phone}
                </a>
              )}
              {applicationLocation && (
                <p className="flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{applicationLocation}</span>
                </p>
              )}
              {application.latitude && application.longitude && (
                <a
                  href={applicationMapHref(application)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open in OpenStreetMap
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {application.latitude && application.longitude ? (
            <PropertyMapPreview
              className="mt-3 h-56 w-full sm:h-64"
              latitude={application.latitude}
              longitude={application.longitude}
              label={applicationLocation || application.userName}
            />
          ) : null}
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

function applicationMapHref(
  application: import("@/types/models").RoleApplication,
) {
  if (application.latitude && application.longitude) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      application.latitude,
    )}&mlon=${encodeURIComponent(application.longitude)}#map=16/${
      application.latitude
    }/${application.longitude}`;
  }
  const query = [application.address, application.town, application.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
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

  const run = (
    type:
      | "approveProperty"
      | "rejectProperty"
      | "verifyPropertyLocation"
      | "rejectPropertyLocation",
    label: string,
  ) => {
    let note: string | undefined;
    if (type === "rejectProperty" || type === "rejectPropertyLocation") {
      note = prompt("Reason for rejection:") ?? undefined;
      if (note === undefined) return;
    } else if (type === "verifyPropertyLocation") {
      note = prompt("Location verification note (optional):") ?? undefined;
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
            <Badge
              variant={
                property.locationVerificationStatus === "verified"
                  ? "success"
                  : property.locationVerificationStatus === "rejected"
                    ? "destructive"
                    : "warning"
              }
            >
              location {property.locationVerificationStatus ?? "pending"}
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
          {property.locationVerificationStatus !== "verified" && (
            <Button
              size="sm"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() =>
                run("verifyPropertyLocation", "physical location verified")
              }
              disabled={!!busy}
            >
              <BadgeCheck className="h-4 w-4" /> Verify location
            </Button>
          )}
          {property.locationVerificationStatus !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() =>
                run("rejectPropertyLocation", "physical location rejected")
              }
              disabled={!!busy}
            >
              Reject location
            </Button>
          )}
          {property.status !== "approved" && (
            <Button
              size="sm"
              className="w-full md:w-auto"
              onClick={() => run("approveProperty", "approved & published")}
              disabled={!!busy || property.locationVerificationStatus !== "verified"}
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

function PartnerCompanyRow({ company }: { company: PartnerCompany }) {
  const action = useAdminAction();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (
    type:
      | "approvePartnerCompany"
      | "rejectPartnerCompany"
      | "suspendPartnerCompany"
      | "featurePartnerCompany"
      | "unfeaturePartnerCompany",
    label: string,
  ) => {
    setBusy(type);
    action.mutate(
      { action: type, partnerCompanyId: company.$id },
      {
        onSuccess: () => toast.success(`Partner company ${label}.`),
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
            <p className="min-w-0 break-words font-medium">{company.name}</p>
            <Badge
              variant={
                company.status === "approved"
                  ? "success"
                  : company.status === "rejected" || company.status === "suspended"
                    ? "destructive"
                    : "warning"
              }
            >
              {company.status}
            </Badge>
            <Badge
              variant={
                company.subscriptionStatus === "active" ? "success" : "secondary"
              }
            >
              {company.subscriptionStatus}
            </Badge>
            <Badge variant="outline">
              {PARTNER_CATEGORIES.find((c) => c.key === company.category)?.label}
            </Badge>
            {company.featured && <Badge variant="accent">featured</Badge>}
          </div>
          <p className="break-words text-sm text-muted-foreground">
            {company.town || company.county
              ? `${company.town}${company.town && company.county ? ", " : ""}${company.county}`
              : "No location set"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:flex md:shrink-0 md:flex-wrap md:justify-end">
          {company.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => run("approvePartnerCompany", "approved")}
              disabled={!!busy}
            >
              {busy === "approvePartnerCompany" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {company.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("suspendPartnerCompany", "suspended")}
              disabled={!!busy}
            >
              Suspend
            </Button>
          )}
          {company.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("rejectPartnerCompany", "rejected")}
              disabled={!!busy}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                company.featured
                  ? "unfeaturePartnerCompany"
                  : "featurePartnerCompany",
                company.featured ? "unfeatured" : "featured",
              )
            }
            disabled={!!busy}
          >
            {company.featured ? "Unfeature" : "Feature"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceRequestRow({ request }: { request: ServiceRequest }) {
  const update = useAdminUpdateServiceRequest();
  const [status, setStatus] = useState(String(request.status || "requested"));
  const [quote, setQuote] = useState(String(request.quotedAmount || ""));
  const [assignedTo, setAssignedTo] = useState(request.assignedTo || "");
  const [note, setNote] = useState(request.adminNote || "");
  const photos = request.photoIds ?? [];
  const phone = request.contactPhone?.trim();

  const save = () => {
    update.mutate(
      {
        requestId: request.$id,
        status,
        quotedAmount: quote ? Number(quote) : undefined,
        assignedTo,
        adminNote: note,
      },
      {
        onSuccess: () => toast.success("Service request updated."),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{request.userName || "Homiva user"}</p>
            <Badge variant="secondary">{request.category}</Badge>
            <Badge variant={request.status === "paid" ? "success" : "warning"}>
              {String(request.status)}
            </Badge>
          </div>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No phone provided</p>
          )}
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {request.problem} {request.propertyType ? `· ${request.propertyType}` : ""}
            {request.town || request.county
              ? ` · ${request.town}${request.town && request.county ? ", " : ""}${request.county}`
              : ""}
          </p>
          {request.description && (
            <p className="mt-2 break-words text-sm">{request.description}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Estimate {formatKES(request.estimatedMin || 0)} -{" "}
            {formatKES(request.estimatedMax || 0)}
          </p>
          {photos.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((fileId) => (
                <a
                  key={fileId}
                  href={fileView(appwriteConfig.buckets.servicePhotos, fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-md border"
                >
                  <img
                    src={filePreview(appwriteConfig.buckets.servicePhotos, fileId, {
                      width: 240,
                      height: 240,
                    })}
                    alt={`Service photo from ${request.userName || "user"}`}
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImageIcon className="h-3 w-3" />
                    Open
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No photos attached</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "requested",
                "reviewed",
                "quoted",
                "scheduled",
                "in_progress",
                "completed",
                "paid",
                "cancelled",
              ].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Quoted amount"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
          <Input
            placeholder="Assigned Homiva team"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
          <Input
            placeholder="Admin note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button onClick={save} disabled={update.isPending} className="sm:col-span-2">
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save service update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminMarketplaceSettings() {
  const { data: deliveryFee = 0, isLoading } = useMarketplaceDeliveryFee();
  const updateFee = useAdminUpdateMarketplaceDeliveryFee();
  const [fee, setFee] = useState("");

  useEffect(() => {
    setFee(String(deliveryFee));
  }, [deliveryFee]);

  const save = () => {
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid delivery fee.");
      return;
    }
    updateFee.mutate(amount, {
      onSuccess: () => toast.success("Delivery fee updated."),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  return (
    <Card>
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_320px] md:items-end">
        <div>
          <h2 className="text-lg font-semibold">Marketplace checkout</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the delivery fee added to every cart checkout.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="delivery-fee">Delivery fee (KES)</Label>
          <div className="flex gap-2">
            <Input
              id="delivery-fee"
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={save} disabled={updateFee.isPending || isLoading}>
              {updateFee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductModerationRow({ product }: { product: Product }) {
  const action = useAdminAction();
  const update = useAdminUpdateProduct();
  const del = useAdminDeleteProduct();
  const [busy, setBusy] = useState<string | null>(null);
  const [stock, setStock] = useState(String(product.stock ?? 0));

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
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
          {product.coverImageId ? (
            <img
              src={filePreview(appwriteConfig.buckets.productImages, product.coverImageId, {
                width: 160,
                height: 120,
              })}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
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
        <div className="grid gap-2 sm:grid-cols-3 md:flex md:shrink-0 md:flex-wrap md:justify-end">
          <Button asChild size="sm" variant="ghost" className="w-full md:w-auto">
            <a href={`/marketplace/${product.$id}`} target="_blank" rel="noreferrer">
              View
            </a>
          </Button>
          <ProductEditDialog product={product} />
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
          <Input
            className="h-9 w-full md:w-24"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            aria-label="Stock"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update.mutate(
                { id: product.$id, values: { stock: Number(stock) } },
                {
                  onSuccess: () => toast.success("Stock updated."),
                  onError: (err) => toast.error((err as Error).message),
                },
              )
            }
            disabled={update.isPending}
          >
            Save stock
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              del.mutate(product.$id, {
                onSuccess: () => toast.success("Product deleted."),
                onError: (err) => toast.error((err as Error).message),
              })
            }
            disabled={del.isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductEditDialog({ product }: { product: Product }) {
  const update = useAdminUpdateProduct();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductInput>({
    title: product.title,
    description: product.description || "",
    category: product.category || MARKETPLACE_CATEGORIES[0].key,
    condition: product.condition || "new",
    price: product.price || 0,
    stock: product.stock || 0,
    county: product.county || "",
    town: product.town || "",
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setValues({
      title: product.title,
      description: product.description || "",
      category: product.category || MARKETPLACE_CATEGORIES[0].key,
      condition: product.condition || "new",
      price: product.price || 0,
      stock: product.stock || 0,
      county: product.county || "",
      town: product.town || "",
    });
    setFiles([]);
  }, [open, product]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!values.title.trim() || values.price <= 0) {
      toast.error("Product title and price are required.");
      return;
    }
    update.mutate(
      { id: product.$id, values, files },
      {
        onSuccess: () => {
          toast.success("Product updated.");
          setOpen(false);
          setFiles([]);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  const currentImages = product.imageIds?.length
    ? product.imageIds
    : product.coverImageId
      ? [product.coverImageId]
      : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full md:w-auto">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit marketplace product</DialogTitle>
        </DialogHeader>
        <ProductFields values={values} set={set} />
        {currentImages.length > 0 && (
          <div>
            <Label>Current images</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {currentImages.map((fileId) => (
                <div
                  key={fileId}
                  className="aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <img
                    src={filePreview(appwriteConfig.buckets.productImages, fileId, {
                      width: 160,
                      height: 160,
                    })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <ImageUploadPreview
          files={files}
          onChange={setFiles}
          label="Replace images"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminProductDialog() {
  const create = useAdminCreateProduct();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductInput>({
    title: "",
    description: "",
    category: MARKETPLACE_CATEGORIES[0].key,
    condition: "new",
    price: 0,
    stock: 1,
    county: "",
    town: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!values.title.trim() || values.price <= 0) {
      toast.error("Product title and price are required.");
      return;
    }
    create.mutate(
      { values, files },
      {
        onSuccess: () => {
          toast.success("Homiva product published.");
          setOpen(false);
          setValues({
            title: "",
            description: "",
            category: MARKETPLACE_CATEGORIES[0].key,
            condition: "new",
            price: 0,
            stock: 1,
            county: "",
            town: "",
          });
          setFiles([]);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Homiva product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Homiva marketplace product</DialogTitle>
        </DialogHeader>
        <ProductFields values={values} set={set} />
        <ImageUploadPreview files={files} onChange={setFiles} label="Images" />
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ProductFieldSetter = <K extends keyof ProductInput>(
  key: K,
  value: ProductInput[K],
) => void;

function ProductFields({
  values,
  set,
}: {
  values: ProductInput;
  set: ProductFieldSetter;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <Label>Title</Label>
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={values.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACE_CATEGORIES.map((category) => (
                <SelectItem key={category.key} value={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Condition</Label>
          <Select
            value={values.condition}
            onValueChange={(v) => set("condition", v as ProductInput["condition"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem
                  key={condition}
                  value={condition}
                  className="capitalize"
                >
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Price (KES)</Label>
          <Input
            type="number"
            value={values.price || ""}
            onChange={(e) => set("price", Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Stock</Label>
          <Input
            type="number"
            value={values.stock || ""}
            onChange={(e) => set("stock", Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>County</Label>
          <Input
            value={values.county || ""}
            onChange={(e) => set("county", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Town</Label>
          <Input
            value={values.town || ""}
            onChange={(e) => set("town", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

function ImageUploadPreview({
  files,
  onChange,
  label,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}) {
  const [previews, setPreviews] = useState<Array<{ name: string; url: string }>>([]);

  useEffect(() => {
    const next = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);
    return () => next.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 p-5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted">
        <Upload className="h-5 w-5" />
        <span>Select product images</span>
        <Input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) =>
            onChange(Array.from(e.target.files ?? []).slice(0, 8))
          }
        />
      </label>
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {previews.map((preview, index) => (
            <div
              key={`${preview.name}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={preview.url}
                alt={preview.name}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-1 top-1 h-7 w-7 opacity-95"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${preview.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
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
