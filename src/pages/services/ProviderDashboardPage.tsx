import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  ExternalLink,
  Inbox,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KENYA_COUNTIES,
  SERVICE_CATEGORIES,
} from "@/lib/config";
import { formatKES, timeAgo } from "@/lib/utils";
import { storage } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAcceptJob,
  useMyServiceProviderProfile,
  useOpenServiceRequests,
  useProviderJobs,
  useSaveServiceProviderProfile,
  useUpdateServiceStatus,
} from "@/hooks/useServices";
import type { ServiceProvider, ServiceRequest } from "@/types/models";

function label(key: string) {
  return SERVICE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function photoUrl(id: string) {
  const url = storage.getFilePreview({
    bucketId: appwriteConfig.buckets.servicePhotos,
    fileId: id,
    width: 200,
    height: 200,
  });
  return url;
}

export default function ProviderDashboardPage() {
  const { data: providerProfile } = useMyServiceProviderProfile();
  const matchedCategories = providerProfile?.verified
    ? providerProfile.categories
    : undefined;
  const { data: open, isLoading: loadingOpen } =
    useOpenServiceRequests(matchedCategories);
  const { data: jobs, isLoading: loadingJobs } = useProviderJobs();
  const accept = useAcceptJob();
  const updateStatus = useUpdateServiceStatus();
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const canAcceptJobs = !!providerProfile?.verified;

  const onAccept = (request: ServiceRequest) => {
    const raw = quotes[request.$id];
    if (!canAcceptJobs) {
      toast.error("Complete and verify your provider profile before accepting jobs.");
      return;
    }
    const quotedAmount = raw ? Number(raw) : request.estimatedMax ?? 0;
    accept.mutate(
      { request, quotedAmount },
      {
        onSuccess: () => toast.success("Job accepted. It's now in your jobs."),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="container max-w-5xl py-5 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Provider Dashboard</h1>
        <p className="text-muted-foreground">
          Browse open jobs, send quotes, and manage work.
        </p>
      </div>

      <Tabs defaultValue="open">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <TabsList className="mb-4 h-auto min-w-max justify-start gap-1">
            <TabsTrigger value="profile" className="h-9">
              <ShieldCheck className="mr-1 h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="open" className="h-9">
              <Inbox className="mr-1 h-4 w-4" /> Open jobs
            </TabsTrigger>
            <TabsTrigger value="mine" className="h-9">
              <Briefcase className="mr-1 h-4 w-4" /> My jobs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <ProviderProfilePanel provider={providerProfile} />
        </TabsContent>

        <TabsContent value="open">
          {!canAcceptJobs && (
            <div className="mb-4 rounded-lg border border-dashed bg-secondary/40 p-4 text-sm text-muted-foreground">
              Submit your provider profile and wait for admin verification before
              accepting jobs.
            </div>
          )}
          {loadingOpen ? (
            <Skeleton className="h-40 w-full" />
          ) : !open || open.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No open jobs right now"
              description="New service requests will appear here for you to quote."
            />
          ) : (
            <div className="space-y-4">
              {open.map((r) => (
                <Card key={r.$id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{label(r.category)}</h3>
                          {r.emergency && (
                            <Badge variant="destructive">Emergency</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {r.problem} · {r.propertyType} · {r.size}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.town ? `${r.town}, ` : ""}
                          {r.county || "Location on request"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Customer estimate
                        </p>
                        <p className="font-semibold text-primary">
                          {formatKES(r.estimatedMin ?? 0)} -{" "}
                          {formatKES(r.estimatedMax ?? 0)}
                        </p>
                      </div>
                    </div>

                    {r.description && (
                      <p className="mt-3 text-sm">{r.description}</p>
                    )}

                    <ServiceContactSummary request={r} />

                    {r.photoIds?.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {r.photoIds.map((id) => (
                          <img
                            key={id}
                            src={photoUrl(id)}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        placeholder={`Quote (default ${r.estimatedMax ?? 0})`}
                        value={quotes[r.$id] ?? ""}
                        onChange={(e) =>
                          setQuotes((q) => ({ ...q, [r.$id]: e.target.value }))
                        }
                        className="max-w-[220px]"
                      />
                      <Button
                        onClick={() => onAccept(r)}
                        disabled={accept.isPending || !canAcceptJobs}
                      >
                        {accept.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Accept & quote
                      </Button>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(r.$createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {loadingJobs ? (
            <Skeleton className="h-40 w-full" />
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No accepted jobs yet"
              description="Accept an open job to see it here."
            />
          ) : (
            <div className="space-y-4">
              {jobs.map((r) => (
                <Card key={r.$id}>
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{label(r.category)}</h3>
                        <Badge variant="secondary">
                          {r.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.problem} · {r.userName}
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {formatKES(r.quotedAmount ?? r.estimatedMax ?? 0)}
                      </p>
                      <ServiceContactSummary request={r} />
                    </div>
                    <div className="flex gap-2">
                      {r.status === "accepted" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateStatus.mutate({
                              requestId: r.$id,
                              status: "in_progress",
                            })
                          }
                        >
                          Start work
                        </Button>
                      )}
                      {r.status === "in_progress" && (
                        <Button
                          onClick={() =>
                            updateStatus.mutate({
                              requestId: r.$id,
                              status: "completed",
                            })
                          }
                        >
                          Mark completed
                        </Button>
                      )}
                      {r.status === "paid" && (
                        <Badge variant="success">Paid</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServiceContactSummary({ request }: { request: ServiceRequest }) {
  const location = [request.address, request.town, request.county]
    .filter(Boolean)
    .join(", ");

  if (!request.contactPhone && !location) return null;

  return (
    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
      {request.contactPhone && (
        <a
          href={`tel:${request.contactPhone}`}
          className="flex w-fit items-center gap-1 hover:text-primary"
        >
          <Phone className="h-3.5 w-3.5" />
          {request.contactPhone}
        </a>
      )}
      {location && (
        <p className="flex items-start gap-1">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{location}</span>
        </p>
      )}
      {request.latitude && request.longitude && (
        <a
          href={serviceMapHref(request)}
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

function serviceMapHref(request: ServiceRequest) {
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

function ProviderProfilePanel({
  provider,
}: {
  provider?: ServiceProvider | null;
}) {
  const save = useSaveServiceProviderProfile();
  const [businessName, setBusinessName] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!provider) return;
    setBusinessName(provider.businessName ?? "");
    setCounty(provider.county || "Nairobi");
    setCategories(provider.categories ?? []);
  }, [provider]);

  const toggleCategory = (key: string) => {
    setCategories((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const submit = () => {
    save.mutate(
      {
        existing: provider,
        values: { businessName, county, categories },
      },
      {
        onSuccess: () =>
          toast.success("Provider profile submitted for verification."),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Provider profile</CardTitle>
            <CardDescription>
              Admins use this profile to verify your service business.
            </CardDescription>
          </div>
          {provider?.verified ? (
            <Badge variant="success">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
            </Badge>
          ) : (
            <Badge variant="warning">Pending verification</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Amani Plumbing & Repairs"
            />
          </div>
          <div className="space-y-2">
            <Label>Primary county</Label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Service categories</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_CATEGORIES.map((category) => (
              <label
                key={category.key}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={categories.includes(category.key)}
                  onChange={() => toggleCategory(category.key)}
                  className="h-4 w-4 accent-primary"
                />
                {category.label}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit for verification
        </Button>
      </CardContent>
    </Card>
  );
}
