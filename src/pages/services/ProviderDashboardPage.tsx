import { useState } from "react";
import { Briefcase, Inbox, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_CATEGORIES } from "@/lib/config";
import { formatKES, timeAgo } from "@/lib/utils";
import { storage } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import {
  useAcceptJob,
  useOpenServiceRequests,
  useProviderJobs,
  useUpdateServiceStatus,
} from "@/hooks/useServices";
import type { ServiceRequest } from "@/types/models";

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
  return typeof url === "string" ? url : url.toString();
}

export default function ProviderDashboardPage() {
  const { data: open, isLoading: loadingOpen } = useOpenServiceRequests();
  const { data: jobs, isLoading: loadingJobs } = useProviderJobs();
  const accept = useAcceptJob();
  const updateStatus = useUpdateServiceStatus();
  const [quotes, setQuotes] = useState<Record<string, string>>({});

  const onAccept = (request: ServiceRequest) => {
    const raw = quotes[request.$id];
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
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Provider Dashboard</h1>
        <p className="text-muted-foreground">
          Browse open jobs, send quotes, and manage work.
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="mb-6">
          <TabsTrigger value="open">
            <Inbox className="mr-1 h-4 w-4" /> Open jobs
          </TabsTrigger>
          <TabsTrigger value="mine">
            <Briefcase className="mr-1 h-4 w-4" /> My jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
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
                        disabled={accept.isPending}
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
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
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
