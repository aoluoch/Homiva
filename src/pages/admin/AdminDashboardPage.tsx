import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  ImageIcon,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  Wallet,
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
  useAdminBookings,
  useAdminBookingProperties,
  useAdminInquiries,
  useAdminMortgageEnquiries,
  useAdminOrders,
  useAdminUpdateViewingRequest,
  useAdminViewingRequests,
  useUpdateInquiryStatus,
  useAdminOrderProducts,
  useAdminPartnerCompanies,
  useAdminUpdateOrderStatus,
  useAllProfiles,
  useApplicationsByOwner,
  usePendingApplications,
  usePendingProducts,
  usePendingProperties,
  useUpdateMortgageEnquiry,
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
import { VerificationDocumentLink } from "@/components/VerificationDocumentLink";
import {
  PROPERTY_PLACEHOLDER,
  propertyGallery,
  propertyImagePreview,
  propertyImageView,
} from "@/components/property/propertyImage";
import {
  appwriteConfig,
  MARKETPLACE_CATEGORIES,
  MORTGAGE_ENQUIRY_STATUSES,
  PARTNER_CATEGORIES,
  PRODUCT_CONDITIONS,
  TEAMS,
  VIEWING_REQUEST_STATUSES,
} from "@/lib/config";
import { formatKES, initials, timeAgo } from "@/lib/utils";
import {
  formatClockTime,
  formatStayDate,
  mapsDirectionsHref,
  resolveCheckInTime,
  resolveCheckOutTime,
} from "@/lib/booking";
import type {
  AuditLog,
  ApplicationStatus,
  Booking,
  Inquiry,
  MortgageEnquiry,
  Order,
  Product,
  PartnerCompany,
  Property,
  PropertyStatus,
  RoleApplication,
  ServiceRequest,
  ViewingRequest,
} from "@/types/models";
import { cn } from "@/lib/utils";

const APPLICATION_GROUPS = [
  {
    key: "property",
    label: "Agents & landlords",
    emptyTitle: "No agent or landlord applications",
    emptyDescription:
      "Real estate agent and landlord applications will appear here.",
    roles: [TEAMS.agents, TEAMS.landlords],
  },
  {
    key: "airbnb",
    label: "Airbnb owners",
    emptyTitle: "No Airbnb owner applications",
    emptyDescription: "Short-stay host applications will appear here.",
    roles: [TEAMS.airbnbOwners],
  },
  {
    key: "partners",
    label: "Partners",
    emptyTitle: "No partner applications",
    emptyDescription:
      "Mover, cleaning company and interior design applications will appear here.",
    roles: [TEAMS.movers, TEAMS.cleaningCompanies, TEAMS.interiorDesigners],
  },
] as const;

type ApplicationGroupKey = (typeof APPLICATION_GROUPS)[number]["key"];

function applicationsInGroup(
  applications: RoleApplication[],
  group: (typeof APPLICATION_GROUPS)[number],
) {
  const roles = new Set<string>(group.roles);
  return applications.filter((application) => roles.has(application.role));
}

function sortForReview(applications: RoleApplication[]) {
  const rank = (status: string) =>
    status === "pending" ? 0 : status === "suspended" ? 1 : 2;
  return [...applications].sort((a, b) => rank(a.status) - rank(b.status));
}

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
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
  const { data: applicationsByOwner } = useApplicationsByOwner();
  const { data: serviceRequests, isLoading: loadingServices } =
    useAdminServiceRequests();
  const { data: orders, isLoading: loadingOrders } = useAdminOrders();
  const {
    items: bookings,
    isLoading: loadingBookings,
    hasMore: hasMoreBookings,
    loadMore: loadMoreBookings,
    isFetchingNextPage: loadingMoreBookings,
    total: bookingsTotal,
  } = useAdminBookings();
  const {
    items: inquiries,
    isLoading: loadingInquiries,
    hasMore: hasMoreInquiries,
    loadMore: loadMoreInquiries,
    isFetchingNextPage: loadingMoreInquiries,
    total: inquiriesTotal,
  } = useAdminInquiries();
  const {
    items: viewingRequests,
    isLoading: loadingViewings,
    hasMore: hasMoreViewings,
    loadMore: loadMoreViewings,
    isFetchingNextPage: loadingMoreViewings,
    total: viewingsTotal,
  } = useAdminViewingRequests();
  const {
    items: mortgageEnquiries,
    isLoading: loadingMortgages,
    hasMore: hasMoreMortgages,
    loadMore: loadMoreMortgages,
    isFetchingNextPage: loadingMoreMortgages,
    total: mortgagesTotal,
  } = useAdminMortgageEnquiries();
  const {
    items: auditLogs,
    isLoading: loadingAuditLogs,
    hasMore: hasMoreAudit,
    loadMore: loadMoreAudit,
    isFetchingNextPage: loadingMoreAudit,
    total: auditTotal,
  } = useAuditLogs();

  const actorNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles ?? []) {
      map[profile.userId] = profile.name;
    }
    return map;
  }, [profiles]);

  const emailByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles ?? []) {
      if (profile.email) map[profile.userId] = profile.email;
    }
    return map;
  }, [profiles]);

  const pendingApps = applications.filter((a) => a.status === "pending");
  const pendingAppsByGroup = useMemo(() => {
    const counts = {} as Record<ApplicationGroupKey, number>;
    for (const group of APPLICATION_GROUPS) {
      counts[group.key] = applicationsInGroup(applications, group).filter(
        (application) => application.status === "pending",
      ).length;
    }
    return counts;
  }, [applications]);
  const pendingProps = properties?.filter((p) => p.status === "pending") ?? [];
  const pendingProducts = products?.filter((p) => p.status === "pending") ?? [];
  const pendingPartners = partners?.filter((p) => p.status === "pending") ?? [];
  const openServices =
    serviceRequests?.filter((r) => !["completed", "paid", "cancelled"].includes(String(r.status))) ?? [];
  const ordersToFulfil = orders?.filter((o) => o.status === "paid") ?? [];
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed" || booking.status === "completed",
  );
  const openInquiries = inquiries.filter((inquiry) => inquiry.status === "open");
  const openViewings = viewingRequests.filter(
    (request) => request.status === "requested",
  );
  const newMortgages = mortgageEnquiries.filter(
    (enquiry) => enquiry.status === "new",
  );

  return (
    <div className="container max-w-7xl py-5 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Admin dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Moderate the platform, fulfil orders and track performance.
            </p>
          </div>
        </div>
        {ordersToFulfil.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm shadow-sm">
            <Truck className="h-4 w-4 text-primary" />
            <span className="font-medium">{ordersToFulfil.length}</span>
            <span className="text-muted-foreground">orders to deliver</span>
          </div>
        )}
      </div>

      <Tabs defaultValue={initialTab}>
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
            <TabsTrigger value="inquiries" className="h-9">
              <Inbox className="mr-1 h-4 w-4" />
              Inquiries
              {openInquiries.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {openInquiries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="viewings" className="h-9">
              <CalendarClock className="mr-1 h-4 w-4" />
              Viewings
              {openViewings.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {openViewings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mortgage" className="h-9">
              <Calculator className="mr-1 h-4 w-4" />
              Mortgage
              {newMortgages.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {newMortgages.length}
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
            <TabsTrigger value="orders" className="h-9">
              <ShoppingCart className="mr-1 h-4 w-4" />
              Orders
              {ordersToFulfil.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {ordersToFulfil.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="h-9">
              <CalendarCheck className="mr-1 h-4 w-4" />
              Airbnb bookings
              {confirmedBookings.length > 0 && (
                <Badge variant="accent" className="ml-2">
                  {confirmedBookings.length}
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
          ) : (
            <Tabs defaultValue="property">
              <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
                <TabsList className="h-auto min-w-max justify-start gap-1">
                  {APPLICATION_GROUPS.map((group) => (
                    <TabsTrigger key={group.key} value={group.key} className="h-9">
                      {group.label}
                      {pendingAppsByGroup[group.key] > 0 && (
                        <Badge variant="accent" className="ml-2">
                          {pendingAppsByGroup[group.key]}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {APPLICATION_GROUPS.map((group) => (
                <TabsContent key={group.key} value={group.key} className="mt-1">
                  <ApplicationGroupQueue
                    group={group}
                    applications={applicationsInGroup(applications, group)}
                    hasMore={hasMoreApps}
                    loadingMore={loadingMoreApps}
                    onLoadMore={loadMoreApps}
                  />
                </TabsContent>
              ))}
            </Tabs>
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

        <TabsContent value="inquiries" className="mt-6">
          <InquiriesPanel
            inquiries={inquiries}
            isLoading={loadingInquiries}
            hasMore={hasMoreInquiries}
            loadingMore={loadingMoreInquiries}
            onLoadMore={loadMoreInquiries}
            total={inquiriesTotal}
            emailByUserId={emailByUserId}
          />
        </TabsContent>

        <TabsContent value="viewings" className="mt-6">
          <ViewingRequestsPanel
            requests={viewingRequests}
            isLoading={loadingViewings}
            hasMore={hasMoreViewings}
            loadingMore={loadingMoreViewings}
            onLoadMore={loadMoreViewings}
            total={viewingsTotal}
            emailByUserId={emailByUserId}
            nameByUserId={actorNameById}
          />
        </TabsContent>

        <TabsContent value="mortgage" className="mt-6">
          <MortgageEnquiriesPanel
            enquiries={mortgageEnquiries}
            isLoading={loadingMortgages}
            hasMore={hasMoreMortgages}
            loadingMore={loadingMoreMortgages}
            onLoadMore={loadMoreMortgages}
            total={mortgagesTotal}
          />
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          {loadingPartners ? (
            <LoadingRows />
          ) : partners && partners.length > 0 ? (
            <div className="space-y-3">
              {partners.map((company) => (
                <PartnerCompanyRow
                  key={company.$id}
                  company={company}
                  application={
                    applicationsByOwner?.[`${company.ownerId}::${company.role}`]
                  }
                  ownerName={actorNameById[company.ownerId]}
                />
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

        <TabsContent value="orders" className="mt-6">
          <OrdersPanel orders={orders} isLoading={loadingOrders} />
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <BookingsPanel
            bookings={bookings}
            isLoading={loadingBookings}
            hasMore={hasMoreBookings}
            loadingMore={loadingMoreBookings}
            onLoadMore={loadMoreBookings}
            total={bookingsTotal}
            emailByUserId={emailByUserId}
          />
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
          ) : auditLogs.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {auditTotal.toLocaleString()} recorded admin action
                {auditTotal === 1 ? "" : "s"} — most recent first.
              </p>
              {auditLogs.map((entry) => (
                <AuditLogRow
                  key={entry.$id}
                  entry={entry}
                  actorName={actorNameById[entry.actorId]}
                />
              ))}
              <LoadMoreButton
                hasMore={hasMoreAudit}
                loading={loadingMoreAudit}
                onLoadMore={loadMoreAudit}
                label="Load more audit entries"
              />
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No audit entries"
              description="Admin actions will be recorded here for traceability."
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
  const cards: Array<{
    label: string;
    value: string;
    hint?: string;
    icon: typeof Users;
    accent: string;
  }> = [
    { label: "Users", value: stats.users.toLocaleString(), icon: Users, accent: "bg-sky-500/10 text-sky-600" },
    { label: "Approved listings", value: stats.propertiesApproved.toLocaleString(), icon: Building2, accent: "bg-emerald-500/10 text-emerald-600" },
    { label: "Pending listings", value: stats.propertiesPending.toLocaleString(), icon: Clock, accent: "bg-amber-500/10 text-amber-600" },
    { label: "Published partners", value: stats.partnerCompaniesPublished.toLocaleString(), icon: Store, accent: "bg-violet-500/10 text-violet-600" },
    { label: "Bookings GMV", value: formatKES(stats.bookingsGmv), icon: CalendarCheck, accent: "bg-indigo-500/10 text-indigo-600" },
    { label: "Orders revenue", value: formatKES(stats.ordersRevenue), icon: ShoppingCart, accent: "bg-primary/10 text-primary" },
    { label: "Open jobs", value: stats.openJobs.toLocaleString(), hint: `${stats.completedJobs.toLocaleString()} completed`, icon: Wrench, accent: "bg-teal-500/10 text-teal-600" },
    { label: "Subscription MRR", value: formatKES(stats.subscriptionMrr), hint: `${stats.activeSubscriptions.toLocaleString()} active plan${stats.activeSubscriptions === 1 ? "" : "s"}`, icon: Wallet, accent: "bg-fuchsia-500/10 text-fuchsia-600" },
    { label: "Open disputes", value: stats.openDisputes.toLocaleString(), icon: AlertTriangle, accent: "bg-rose-500/10 text-rose-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="overflow-hidden transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", card.accent)}>
              <card.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-0.5 break-words text-xl font-bold sm:text-2xl">
                {card.value}
              </p>
              {card.hint ? (
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const PARTNER_SUBTYPES = [
  { key: "all", label: "All partners", roles: null as string[] | null },
  { key: "movers", label: "Movers", roles: [TEAMS.movers] },
  { key: "cleaning", label: "Cleaning", roles: [TEAMS.cleaningCompanies] },
  { key: "interior", label: "Interior design", roles: [TEAMS.interiorDesigners] },
] as const;

function ApplicationGroupQueue({
  group,
  applications,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  group: (typeof APPLICATION_GROUPS)[number];
  applications: RoleApplication[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [partnerSubtype, setPartnerSubtype] = useState("all");
  const visible = useMemo(() => {
    if (group.key !== "partners" || partnerSubtype === "all") {
      return sortForReview(applications);
    }
    const selected = PARTNER_SUBTYPES.find((item) => item.key === partnerSubtype);
    const roles = new Set(selected?.roles ?? []);
    return sortForReview(
      applications.filter((application) => roles.has(application.role)),
    );
  }, [applications, group.key, partnerSubtype]);
  const pending = visible.filter((application) => application.status === "pending");
  const reviewed = visible.filter((application) => application.status !== "pending");

  return (
    <div className="space-y-3">
      {group.key === "partners" && (
        <div className="flex flex-wrap gap-2">
          {PARTNER_SUBTYPES.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={partnerSubtype === item.key ? "default" : "outline"}
              onClick={() => setPartnerSubtype(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {visible.length > 0 ? (
        <>
          {pending.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground">
                Needs review ({pending.length})
              </h2>
              {pending.map((application) => (
                <ApplicationRow key={application.$id} application={application} />
              ))}
            </>
          )}
          {reviewed.length > 0 && (
            <>
              <h2 className="pt-1 text-sm font-medium text-muted-foreground">
                Reviewed ({reviewed.length})
              </h2>
              {reviewed.map((application) => (
                <ApplicationRow key={application.$id} application={application} />
              ))}
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon={Inbox}
          title={group.emptyTitle}
          description={group.emptyDescription}
        />
      )}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
        label="Load more applications"
      />
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
                <VerificationDocumentLink
                  key={fileId}
                  fileId={fileId}
                  label={
                    application.documentLabels?.[index] ??
                    `Document ${index + 1}`
                  }
                />
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
          {property.status !== "approved" &&
            property.locationVerificationStatus === "verified" && (
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
          {property.status !== "approved" &&
            property.locationVerificationStatus !== "verified" && (
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Verify the physical location before publishing.
            </p>
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

function PartnerCompanyRow({
  company,
  application,
  ownerName,
}: {
  company: PartnerCompany;
  application?: RoleApplication;
  ownerName?: string;
}) {
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

  const logo = company.logoFileId
    ? filePreview(appwriteConfig.buckets.storeAssets, company.logoFileId, {
        width: 96,
        height: 96,
      })
    : null;
  const phone = company.phone?.trim() || application?.phone?.trim();
  const email = company.email?.trim() || application?.userEmail?.trim();
  const companyLocation = [company.town, company.county]
    .filter(Boolean)
    .join(", ");
  const applicationLocation = [
    application?.address,
    application?.town,
    application?.county,
  ]
    .filter(Boolean)
    .join(", ");
  const documentIds = application?.documentIds ?? [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
            {logo ? (
              <img
                src={logo}
                alt={company.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 break-words font-medium">{company.name}</p>
              <Badge
                variant={
                  company.status === "approved"
                    ? "success"
                    : company.status === "rejected" ||
                        company.status === "suspended"
                      ? "destructive"
                      : "warning"
                }
              >
                {company.status}
              </Badge>
              <Badge
                variant={
                  company.subscriptionStatus === "active"
                    ? "success"
                    : "secondary"
                }
              >
                {company.subscriptionStatus}
              </Badge>
              <Badge variant="outline">
                {PARTNER_CATEGORIES.find((c) => c.key === company.category)?.label}
              </Badge>
              {company.verified && (
                <Badge variant="accent" className="gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> verified
                </Badge>
              )}
              {company.featured && <Badge variant="accent">featured</Badge>}
              {company.status === "approved" &&
                company.subscriptionStatus !== "active" && (
                  <Badge variant="warning">not on public directory</Badge>
                )}
            </div>

            {ownerName && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">Owner: {ownerName}</span>
              </p>
            )}

            {company.description && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {company.description}
              </p>
            )}

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="flex w-fit items-center gap-1 font-medium text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {phone}
                </a>
              ) : (
                <p className="text-xs">No phone provided</p>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex w-fit items-center gap-1 break-all hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {email}
                </a>
              )}
              <p className="flex items-start gap-1">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">
                  {applicationLocation || companyLocation || "No location set"}
                </span>
              </p>
              {application?.latitude && application?.longitude && (
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

            {application?.latitude && application?.longitude ? (
              <PropertyMapPreview
                className="mt-3 h-52 w-full sm:h-60"
                latitude={application.latitude}
                longitude={application.longitude}
                label={applicationLocation || company.name}
              />
            ) : null}

            {documentIds.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Verification documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {documentIds.map((fileId, index) => (
                    <VerificationDocumentLink
                      key={fileId}
                      fileId={fileId}
                      label={
                        application?.documentLabels?.[index] ??
                        `Document ${index + 1}`
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No verification documents on the linked application.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:flex md:shrink-0 md:flex-col md:items-stretch md:justify-start">
          <Button asChild size="sm" variant="ghost" className="w-full md:w-auto">
            <a href={`/partners/${company.$id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> View profile
            </a>
          </Button>
          {company.status !== "approved" && (
            <Button
              size="sm"
              className="w-full md:w-auto"
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
              className="w-full md:w-auto"
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
              className="w-full md:w-auto"
              onClick={() => run("rejectPartnerCompany", "rejected")}
              disabled={!!busy}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full md:w-auto"
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
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
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
        <div className="min-w-0">
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

// ---------------------------------------------------------------------------
// Property inquiries (Contact Homiva)
// ---------------------------------------------------------------------------

const inquiryStatusVariant: Record<
  Inquiry["status"],
  "warning" | "success" | "secondary"
> = {
  open: "warning",
  responded: "success",
  closed: "secondary",
};

function InquiriesPanel({
  inquiries,
  isLoading,
  hasMore,
  loadingMore,
  onLoadMore,
  total,
  emailByUserId,
}: {
  inquiries: Inquiry[];
  isLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  total: number;
  emailByUserId: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | Inquiry["status"]>("all");

  if (isLoading) return <LoadingRows />;
  if (inquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No inquiries yet"
        description="Messages sent from 'Contact Homiva' on a listing will appear here."
      />
    );
  }

  const countFor = (status: Inquiry["status"]) =>
    inquiries.filter((inquiry) => inquiry.status === status).length;
  const filters = [
    { key: "all" as const, label: "All", count: total || inquiries.length },
    { key: "open" as const, label: "Open", count: countFor("open") },
    { key: "responded" as const, label: "Responded", count: countFor("responded") },
    { key: "closed" as const, label: "Closed", count: countFor("closed") },
  ];
  const filtered =
    filter === "all"
      ? inquiries
      : inquiries.filter((inquiry) => inquiry.status === filter);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Property inquiries sent to Homiva. Follow up with the buyer or renter,
        then mark the inquiry as responded or closed.
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-secondary",
            )}
          >
            {item.label}
            <span className="ml-1 text-muted-foreground">({item.count})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing here"
          description="No inquiries match this filter."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inquiry) => (
            <InquiryCard
              key={inquiry.$id}
              inquiry={inquiry}
              email={emailByUserId[inquiry.userId] || ""}
            />
          ))}
        </div>
      )}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
        label="Load more inquiries"
      />
    </div>
  );
}

function InquiryCard({
  inquiry,
  email,
}: {
  inquiry: Inquiry;
  email: string;
}) {
  const update = useUpdateInquiryStatus();
  const [status, setStatus] = useState<Inquiry["status"]>(inquiry.status || "open");
  const phone = inquiry.phone?.trim();

  useEffect(() => {
    setStatus(inquiry.status || "open");
  }, [inquiry.status]);

  const save = () => {
    update.mutate(
      { id: inquiry.$id, status },
      {
        onSuccess: () => toast.success(`Inquiry marked ${status}.`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {inquiry.propertyTitle || "Property inquiry"}
            </p>
            <Badge variant={inquiryStatusVariant[inquiry.status] ?? "secondary"}>
              {inquiry.status}
            </Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">
            {inquiry.message}
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">
                {inquiry.userName || "Homiva user"}
              </span>
            </p>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex w-fit items-center gap-1 font-medium text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </a>
            ) : (
              <p className="text-xs">No phone provided</p>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex w-fit items-center gap-1 break-all hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {email}
              </a>
            )}
            <p className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {timeAgo(inquiry.$createdAt)}
            </p>
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-2">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as Inquiry["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">open</SelectItem>
              <SelectItem value="responded">responded</SelectItem>
              <SelectItem value="closed">closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save status
          </Button>
          {inquiry.propertyId && (
            <a
              href={`/properties/${inquiry.propertyId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Viewing request queue
// ---------------------------------------------------------------------------

const viewingStatusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  requested: "warning",
  confirmed: "success",
  declined: "destructive",
  completed: "secondary",
};

function ViewingRequestsPanel({
  requests,
  isLoading,
  hasMore,
  loadingMore,
  onLoadMore,
  total,
  emailByUserId,
  nameByUserId,
}: {
  requests: ViewingRequest[];
  isLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  total: number;
  emailByUserId: Record<string, string>;
  nameByUserId: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | ViewingRequest["status"]>("all");

  if (isLoading) return <LoadingRows />;
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No viewing requests yet"
        description="When a buyer or renter asks Homiva to arrange a visit, the request lands here."
      />
    );
  }

  const countFor = (status: ViewingRequest["status"]) =>
    requests.filter((request) => request.status === status).length;
  const filters = [
    { key: "all" as const, label: "All", count: total || requests.length },
    { key: "requested" as const, label: "Requested", count: countFor("requested") },
    { key: "confirmed" as const, label: "Confirmed", count: countFor("confirmed") },
    { key: "declined" as const, label: "Declined", count: countFor("declined") },
    { key: "completed" as const, label: "Completed", count: countFor("completed") },
  ];
  const filtered =
    filter === "all"
      ? requests
      : requests.filter((request) => request.status === filter);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Viewing requests from sale and rental listings. Confirm a time with the
        guest, then mark the visit confirmed, declined, or completed.
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-secondary",
            )}
          >
            {item.label}
            <span className="ml-1 text-muted-foreground">({item.count})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing here"
          description="No viewing requests match this filter."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <ViewingRequestCard
              key={request.$id}
              request={request}
              email={emailByUserId[request.userId] || ""}
              ownerName={nameByUserId[request.ownerId] || ""}
            />
          ))}
        </div>
      )}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
        label="Load more viewing requests"
      />
    </div>
  );
}

function ViewingRequestCard({
  request,
  email,
  ownerName,
}: {
  request: ViewingRequest;
  email: string;
  ownerName: string;
}) {
  const update = useAdminUpdateViewingRequest();
  const [status, setStatus] = useState(request.status || "requested");
  const [note, setNote] = useState(request.note ?? "");
  const phone = request.phone?.trim();

  useEffect(() => {
    setStatus(request.status || "requested");
    setNote(request.note ?? "");
  }, [request.status, request.note]);

  const save = () => {
    update.mutate(
      { id: request.$id, status, note },
      {
        onSuccess: () => toast.success(`Viewing marked ${status}.`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {request.propertyTitle || "Property viewing"}
            </p>
            <Badge variant={viewingStatusVariant[request.status] ?? "secondary"}>
              {request.status}
            </Badge>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              Preferred:{" "}
              <span className="font-medium">
                {formatStayDate(request.preferredDate)}
              </span>
            </p>
            {request.alternateDate ? (
              <p className="text-muted-foreground">
                Alternate: {formatStayDate(request.alternateDate)}
              </p>
            ) : null}
          </div>
          {request.message ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {request.message}
            </p>
          ) : null}
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">
                {request.userName || "Homiva user"}
              </span>
            </p>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex w-fit items-center gap-1 font-medium text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </a>
            ) : (
              <p className="text-xs">No phone provided</p>
            )}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="flex w-fit items-center gap-1 break-all hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {email}
              </a>
            ) : null}
            <p className="text-xs">
              Listing owner: {ownerName || "Listing owner"}
            </p>
            <p className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {timeAgo(request.$createdAt)}
            </p>
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWING_REQUEST_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note for Homiva…"
          />
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save status
          </Button>
          {request.propertyId && (
            <a
              href={`/properties/${request.propertyId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mortgage enquiry queue
// ---------------------------------------------------------------------------

const mortgageStatusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  new: "warning",
  contacted: "success",
  closed: "secondary",
};

function MortgageEnquiriesPanel({
  enquiries,
  isLoading,
  hasMore,
  loadingMore,
  onLoadMore,
  total,
}: {
  enquiries: MortgageEnquiry[];
  isLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  total: number;
}) {
  const [filter, setFilter] = useState<"all" | MortgageEnquiry["status"]>("all");

  if (isLoading) return <LoadingRows />;
  if (enquiries.length === 0) {
    return (
      <EmptyState
        icon={Calculator}
        title="No mortgage enquiries yet"
        description="When someone sends figures from a sale listing calculator, the enquiry lands here."
      />
    );
  }

  const countFor = (status: MortgageEnquiry["status"]) =>
    enquiries.filter((enquiry) => enquiry.status === status).length;
  const filters = [
    { key: "all" as const, label: "All", count: total || enquiries.length },
    { key: "new" as const, label: "New", count: countFor("new") },
    { key: "contacted" as const, label: "Contacted", count: countFor("contacted") },
    { key: "closed" as const, label: "Closed", count: countFor("closed") },
  ];
  const filtered =
    filter === "all"
      ? enquiries
      : enquiries.filter((enquiry) => enquiry.status === filter);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Indicative mortgage figures sent from sale listings. Follow up with the
        buyer, then mark the enquiry contacted or closed.
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-secondary",
            )}
          >
            {item.label}
            <span className="ml-1 text-muted-foreground">({item.count})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Nothing here"
          description="No mortgage enquiries match this filter."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((enquiry) => (
            <MortgageEnquiryCard key={enquiry.$id} enquiry={enquiry} />
          ))}
        </div>
      )}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
        label="Load more mortgage enquiries"
      />
    </div>
  );
}

function MortgageEnquiryCard({ enquiry }: { enquiry: MortgageEnquiry }) {
  const update = useUpdateMortgageEnquiry();
  const [status, setStatus] = useState(enquiry.status || "new");
  const [note, setNote] = useState(enquiry.note ?? "");
  const phone = enquiry.phone?.trim();

  useEffect(() => {
    setStatus(enquiry.status || "new");
    setNote(enquiry.note ?? "");
  }, [enquiry.status, enquiry.note]);

  const save = () => {
    update.mutate(
      { id: enquiry.$id, status, note },
      {
        onSuccess: () => toast.success(`Mortgage enquiry marked ${status}.`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {enquiry.propertyTitle || "Mortgage enquiry"}
            </p>
            <Badge variant={mortgageStatusVariant[enquiry.status] ?? "secondary"}>
              {enquiry.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Listing price {formatKES(enquiry.propertyPrice)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Deposit</dt>
              <dd className="font-medium">{formatKES(enquiry.deposit)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Loan</dt>
              <dd className="font-medium">{formatKES(enquiry.loanAmount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Est. monthly</dt>
              <dd className="font-medium">{formatKES(enquiry.monthlyRepayment)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Term</dt>
              <dd className="font-medium">{enquiry.termYears} years</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rate</dt>
              <dd className="font-medium">{enquiry.interestRate}%</dd>
            </div>
            {enquiry.monthlyIncome ? (
              <div>
                <dt className="text-muted-foreground">Income</dt>
                <dd className="font-medium">{formatKES(enquiry.monthlyIncome)}</dd>
              </div>
            ) : null}
          </dl>
          {enquiry.message ? (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">
              {enquiry.message}
            </p>
          ) : null}
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">
                {enquiry.userName || "Homiva user"}
              </span>
            </p>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex w-fit items-center gap-1 font-medium text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </a>
            ) : (
              <p className="text-xs">No phone provided</p>
            )}
            {enquiry.userEmail ? (
              <a
                href={`mailto:${enquiry.userEmail}`}
                className="flex w-fit items-center gap-1 break-all hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {enquiry.userEmail}
              </a>
            ) : null}
            <p className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {timeAgo(enquiry.$createdAt)}
            </p>
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MORTGAGE_ENQUIRY_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note for Homiva…"
          />
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save status
          </Button>
          {enquiry.propertyId && (
            <a
              href={`/properties/${enquiry.propertyId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Listing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Airbnb bookings (security / host + house details)
// ---------------------------------------------------------------------------

const bookingStatusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  confirmed: "success",
  completed: "secondary",
  pending: "warning",
  cancelled: "destructive",
};

function BookingsPanel({
  bookings,
  isLoading,
  hasMore,
  loadingMore,
  onLoadMore,
  total,
  emailByUserId,
}: {
  bookings: Booking[];
  isLoading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  total: number;
  emailByUserId: Record<string, string>;
}) {
  const [filter, setFilter] = useState<
    "all" | "confirmed" | "completed" | "cancelled" | "pending"
  >("all");
  const propertyIds = useMemo(
    () => bookings.map((booking) => booking.propertyId).filter(Boolean),
    [bookings],
  );
  const { data: propertyMap } = useAdminBookingProperties(propertyIds);

  if (isLoading) return <LoadingRows />;
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No Airbnb bookings yet"
        description="Confirmed stays appear here with the house, guest and host details for security review."
      />
    );
  }

  const countFor = (status: string) =>
    bookings.filter((booking) => booking.status === status).length;
  const filters = [
    { key: "all" as const, label: "All", count: total || bookings.length },
    { key: "confirmed" as const, label: "Confirmed", count: countFor("confirmed") },
    { key: "completed" as const, label: "Completed", count: countFor("completed") },
    { key: "cancelled" as const, label: "Cancelled", count: countFor("cancelled") },
  ];
  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((booking) => booking.status === filter);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Full house, guest and host records for every Airbnb booking. Use this
        when verifying a stay or investigating a dispute.
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-secondary",
            )}
          >
            {item.label}
            <span className="ml-1 text-muted-foreground">({item.count})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing here"
          description="No bookings match this filter."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <AdminBookingCard
              key={booking.$id}
              booking={booking}
              property={propertyMap?.[booking.propertyId]}
              guestEmail={
                booking.guestEmail || emailByUserId[booking.guestId] || ""
              }
            />
          ))}
        </div>
      )}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onLoadMore={onLoadMore}
        label="Load more bookings"
      />
    </div>
  );
}

function AdminBookingCard({
  booking,
  property,
  guestEmail,
}: {
  booking: Booking;
  property?: Property;
  guestEmail: string;
}) {
  const [photosOpen, setPhotosOpen] = useState(false);
  const images = propertyGallery(property);
  const location = [property?.address, property?.town, property?.county]
    .filter(Boolean)
    .join(", ");
  const checkInTime = resolveCheckInTime(
    booking.checkInTime || property?.checkInTime,
  );
  const checkOutTime = resolveCheckOutTime(
    booking.checkOutTime || property?.checkOutTime,
  );

  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <AdminBookingPhotos
          title={booking.propertyTitle}
          fileIds={images}
          onOpen={() => setPhotosOpen(true)}
        />
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words font-medium">
              {booking.propertyTitle}
            </p>
            <Badge variant={bookingStatusVariant[booking.status] ?? "secondary"}>
              {booking.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatStayDate(booking.checkIn)} → {formatStayDate(booking.checkOut)}{" "}
            · Check-in {formatClockTime(checkInTime)} · Check-out{" "}
            {formatClockTime(checkOutTime)} · {booking.nights} night
            {booking.nights === 1 ? "" : "s"} · {booking.guests} guest
            {booking.guests === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-medium text-primary">
            Paid {formatKES(booking.amount)}
            {booking.paymentRef ? (
              <span className="ml-2 font-normal text-muted-foreground">
                · {booking.paymentRef}
              </span>
            ) : null}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Guest
              </p>
              <p className="mt-1 font-medium">{booking.guestName}</p>
              {guestEmail && (
                <a
                  href={`mailto:${guestEmail}`}
                  className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {guestEmail}
                </a>
              )}
            </div>
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Host / owner
              </p>
              <p className="mt-1 font-medium">
                {property?.ownerName || "Listing owner"}
              </p>
              {property?.ownerRole && (
                <p className="capitalize text-muted-foreground">
                    {property.ownerRole.replace(/_/g, " ")}
                </p>
              )}
              {property?.contactPhone && (
                <a
                  href={`tel:${property.contactPhone}`}
                  className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {property.contactPhone}
                </a>
              )}
              {property?.contactEmail && (
                <a
                  href={`mailto:${property.contactEmail}`}
                  className="mt-1 flex items-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {property.contactEmail}
                </a>
              )}
            </div>
          </div>
          {property && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                House details
              </p>
              <p className="mt-1 flex items-start gap-1">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{location || `${property.town}, ${property.county}`}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                {property.bedrooms} bed · {property.bathrooms} bath
                {property.sizeSqft ? ` · ${property.sizeSqft} sqft` : ""}
              </p>
              {property.amenities?.length ? (
                <p className="mt-1 text-muted-foreground">
                  {property.amenities.join(" · ")}
                </p>
              ) : null}
              {property.description && (
                <p className="mt-2 line-clamp-3 text-muted-foreground">
                  {property.description}
                </p>
              )}
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((fileId, index) => (
                    <button
                      key={fileId}
                      type="button"
                      onClick={() => setPhotosOpen(true)}
                      className="overflow-hidden rounded-md border bg-muted empty:hidden"
                      aria-label={`View photo ${index + 1} of ${booking.propertyTitle}`}
                    >
                      <PropertyThumb
                        fileId={fileId}
                        alt={`${booking.propertyTitle} photo ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                        width={400}
                        height={300}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid gap-2 md:w-36">
          {images.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setPhotosOpen(true)}
            >
              <ImageIcon className="h-4 w-4" />
              Photos ({images.length})
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="w-full">
            <a
              href={`/properties/${booking.propertyId}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Listing
            </a>
          </Button>
          {(property?.latitude && property?.longitude) || property?.address ? (
            <Button asChild size="sm" variant="outline" className="w-full">
              <a
                href={mapsDirectionsHref(property)}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="h-4 w-4" />
                Directions
              </a>
            </Button>
          ) : null}
        </div>
        </div>
        <Dialog open={photosOpen} onOpenChange={setPhotosOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="break-words pr-6">
                {booking.propertyTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              {images.map((fileId, index) => (
                <a
                  key={fileId}
                  href={propertyImageView(fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border bg-muted"
                >
                  <PropertyThumb
                    fileId={fileId}
                    alt={`${booking.propertyTitle} photo ${index + 1}`}
                    className="max-h-[70vh] w-full object-contain"
                    width={1200}
                    height={900}
                    preferFull
                  />
                </a>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AdminBookingPhotos({
  title,
  fileIds,
  onOpen,
}: {
  title: string;
  fileIds: string[];
  onOpen: () => void;
}) {
  if (fileIds.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-lg border bg-muted text-muted-foreground">
        <Building2 className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        fileIds.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
      )}
    >
      {fileIds.slice(0, 4).map((fileId, index) => (
        <button
          key={fileId}
          type="button"
          onClick={onOpen}
          className="overflow-hidden rounded-lg border bg-muted empty:hidden"
          aria-label={
            index === 0
              ? `View photos of ${title}`
              : `View photo ${index + 1} of ${title}`
          }
        >
          <PropertyThumb
            fileId={fileId}
            alt={`${title} photo ${index + 1}`}
            className="aspect-[16/10] h-full max-h-72 w-full object-cover"
            width={index === 0 ? 960 : 640}
            height={index === 0 ? 600 : 400}
          />
        </button>
      ))}
    </div>
  );
}

function PropertyThumb({
  fileId,
  fallbackIds = [],
  alt,
  className,
  width,
  height,
  preferFull = false,
}: {
  fileId: string;
  fallbackIds?: string[];
  alt: string;
  className?: string;
  width: number;
  height: number;
  preferFull?: boolean;
}) {
  const candidates = [fileId, ...fallbackIds.filter((id) => id !== fileId)];
  const [index, setIndex] = useState(0);
  const current = candidates[Math.min(index, candidates.length - 1)] ?? fileId;
  const preview = propertyImagePreview(current, { width, height });
  const full = propertyImageView(current);
  const initialSrc = preferFull ? full : preview;
  const [src, setSrc] = useState(initialSrc);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    setSrc(preferFull ? full : preview);
  }, [current, preferFull, full, preview]);

  if (hidden) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        if (src === PROPERTY_PLACEHOLDER) {
          setHidden(true);
          return;
        }
        if (src !== full) {
          setSrc(full);
          return;
        }
        if (index < candidates.length - 1) {
          setIndex((value) => value + 1);
          return;
        }
        setHidden(true);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Orders / delivery fulfilment
// ---------------------------------------------------------------------------

interface OrderGroup {
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

const orderStatusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "secondary" | "outline"
> = {
  paid: "warning",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
  pending: "warning",
  mixed: "outline",
};

const orderStatusLabel: Record<string, string> = {
  paid: "To deliver",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Pending",
  mixed: "Mixed",
};

function groupOrders(orders: Order[]): OrderGroup[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const key = order.orderGroupId || order.$id;
    const list = map.get(key) ?? [];
    list.push(order);
    map.set(key, list);
  }

  const groups: OrderGroup[] = [];
  for (const [groupId, list] of map.entries()) {
    const first =
      [...list].sort((a, b) => (a.$createdAt < b.$createdAt ? -1 : 1))[0];
    const statuses = new Set(list.map((o) => String(o.status)));
    groups.push({
      groupId,
      orders: list,
      buyerName: first.buyerName || "Homiva customer",
      phone: first.phone || "",
      address: first.secureAddress || first.address || "",
      paymentRef: first.paymentRef || "",
      createdAt: first.$createdAt,
      subtotal: list.reduce((sum, o) => sum + (o.subtotal ?? 0), 0),
      deliveryFee: list.reduce((sum, o) => sum + (o.deliveryFee ?? 0), 0),
      total: list.reduce((sum, o) => sum + (o.amount ?? 0), 0),
      status: statuses.size === 1 ? [...statuses][0] : "mixed",
    });
  }
  return groups.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function OrdersPanel({
  orders,
  isLoading,
}: {
  orders?: Order[];
  isLoading: boolean;
}) {
  const [filter, setFilter] = useState<
    "all" | "paid" | "shipped" | "delivered" | "cancelled"
  >("all");
  const all = useMemo(() => orders ?? [], [orders]);
  const productIds = useMemo(
    () => all.map((o) => o.productId).filter(Boolean),
    [all],
  );
  const { data: productMap } = useAdminOrderProducts(productIds);

  if (isLoading) return <LoadingRows />;
  if (all.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No orders yet"
        description="Paid marketplace orders will appear here for delivery."
      />
    );
  }

  const groups = groupOrders(all);
  const countFor = (status: string) =>
    groups.filter((g) => g.status === status).length;
  const filters = [
    { key: "all" as const, label: "All", count: groups.length },
    { key: "paid" as const, label: "To deliver", count: countFor("paid") },
    { key: "shipped" as const, label: "Shipped", count: countFor("shipped") },
    { key: "delivered" as const, label: "Delivered", count: countFor("delivered") },
    { key: "cancelled" as const, label: "Cancelled", count: countFor("cancelled") },
  ];
  const filtered =
    filter === "all" ? groups : groups.filter((g) => g.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-secondary",
            )}
          >
            {f.label}
            <span className="ml-1 text-muted-foreground">({f.count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing here"
          description="No orders match this filter."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((group) => (
            <OrderGroupCard
              key={group.groupId}
              group={group}
              productMap={productMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function OrderItemRow({
  order,
  product,
  isFirst,
}: {
  order: Order;
  product?: Product;
  isFirst: boolean;
}) {
  const [open, setOpen] = useState(false);
  const images = product?.imageIds?.length
    ? product.imageIds
    : product?.coverImageId
      ? [product.coverImageId]
      : [];
  const thumbId = images[0] ?? null;

  return (
    <div
      className={cn("flex items-center gap-3 p-3", !isFirst && "border-t")}
    >
      {thumbId ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted"
              aria-label={`View full image of ${order.productTitle}`}
            >
              <img
                src={filePreview(
                  appwriteConfig.buckets.productImages,
                  thumbId,
                  { width: 112, height: 112 },
                )}
                alt={order.productTitle}
                className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ImageIcon className="h-4 w-4" />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="break-words pr-6">
                {order.productTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              {images.map((fileId) => (
                <a
                  key={fileId}
                  href={fileView(appwriteConfig.buckets.productImages, fileId)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border bg-muted"
                >
                  <img
                    src={filePreview(
                      appwriteConfig.buckets.productImages,
                      fileId,
                      { width: 1024 },
                    )}
                    alt={order.productTitle}
                    className="h-auto w-full object-contain"
                  />
                </a>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
          <Package className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{order.productTitle}</p>
        <p className="text-xs text-muted-foreground">
          Qty {order.quantity} · {formatKES(order.subtotal ?? 0)}
        </p>
      </div>
    </div>
  );
}

function OrderGroupCard({
  group,
  productMap,
}: {
  group: OrderGroup;
  productMap?: Record<string, Product>;
}) {
  const update = useAdminUpdateOrderStatus();
  const [busy, setBusy] = useState<string | null>(null);
  const orderIds = group.orders.map((o) => o.$id);
  const shortId = group.groupId.slice(-6).toUpperCase();
  const mapsHref = group.address
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(
        `${group.address}, Kenya`,
      )}`
    : null;

  const setStatus = (status: string) => {
    setBusy(status);
    update.mutate(
      {
        orderIds,
        status,
        summary: `Order #${shortId} for ${group.buyerName} marked ${status}.`,
      },
      {
        onSuccess: () => toast.success(`Order marked ${status}.`),
        onError: (err) => toast.error((err as Error).message),
        onSettled: () => setBusy(null),
      },
    );
  };

  const copyDetails = async () => {
    const text = [
      `Homiva order #${shortId}`,
      `Customer: ${group.buyerName}`,
      group.phone ? `Phone: ${group.phone}` : "",
      group.address ? `Address: ${group.address}` : "",
      "",
      "Items:",
      ...group.orders.map(
        (o) => `- ${o.productTitle} x${o.quantity} (${formatKES(o.subtotal ?? 0)})`,
      ),
      "",
      `Subtotal: ${formatKES(group.subtotal)}`,
      `Delivery: ${formatKES(group.deliveryFee)}`,
      `Total: ${formatKES(group.total)}`,
      group.paymentRef ? `Payment ref: ${group.paymentRef}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Delivery details copied.");
    } catch {
      toast.error("Could not copy details.");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{group.buyerName}</p>
              <p className="text-xs text-muted-foreground">
                Order #{shortId} · {timeAgo(group.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Payment successful
            </Badge>
            <Badge
              variant={orderStatusVariant[group.status] ?? "secondary"}
              className="capitalize"
            >
              {orderStatusLabel[group.status] ?? group.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0 space-y-3">
            <div className="rounded-lg border">
              {group.orders.map((order, i) => {
                const product = productMap?.[order.productId];
                return (
                  <OrderItemRow
                    key={order.$id}
                    order={order}
                    product={product}
                    isFirst={i === 0}
                  />
                );
              })}
            </div>
            <div className="grid gap-1 rounded-lg border p-3 text-sm">
              <OrderSummaryRow label="Subtotal" value={formatKES(group.subtotal)} />
              <OrderSummaryRow
                label="Delivery fee"
                value={formatKES(group.deliveryFee)}
              />
              <div className="mt-1 flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total paid</span>
                <span>{formatKES(group.total)}</span>
              </div>
              {group.paymentRef && (
                <p className="mt-1 flex items-center gap-1 break-all text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" /> Ref {group.paymentRef}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-primary" /> Delivery details
              </p>
              {group.phone ? (
                <a
                  href={`tel:${group.phone}`}
                  className="flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {group.phone}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">No phone provided</p>
              )}
              {group.address ? (
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="break-words">{group.address}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No delivery address provided
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {mapsHref && (
                  <Button asChild size="sm" variant="outline">
                    <a href={mapsHref} target="_blank" rel="noreferrer">
                      <MapPin className="h-3.5 w-3.5" /> Map
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={copyDetails}>
                  <Copy className="h-3.5 w-3.5" /> Copy details
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy || group.status === "shipped"}
                onClick={() => setStatus("shipped")}
              >
                {busy === "shipped" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Shipped
              </Button>
              <Button
                size="sm"
                disabled={!!busy || group.status === "delivered"}
                onClick={() => setStatus("delivered")}
              >
                {busy === "delivered" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Delivered
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="col-span-2 text-destructive hover:text-destructive"
                disabled={!!busy || group.status === "cancelled"}
                onClick={() => setStatus("cancelled")}
              >
                <X className="h-4 w-4" /> Cancel order
              </Button>
            </div>
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

function AuditLogRow({
  entry,
  actorName,
}: {
  entry: AuditLog;
  actorName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Activity className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {entry.action}
              </Badge>
              <span className="min-w-0 break-words text-sm font-medium">
                {entry.summary}
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {actorName ?? "Unknown admin"}
              </span>
              {" · "}
              {entry.targetType}
              {entry.targetId ? ` · ${entry.targetId}` : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 pl-11 text-xs text-muted-foreground md:pl-0 md:text-right">
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
