import { Link } from "react-router-dom";
import { BadgeCheck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { useStorefronts } from "@/hooks/useStore";

function logoUrl(fid?: string) {
  if (!fid) return null;
  const url = filePreview(appwriteConfig.buckets.storeAssets, fid, {
    width: 120,
    height: 120,
  });
  return url;
}

export default function StoresPage() {
  const { data, isLoading } = useStorefronts();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Business Stores</h1>
        <p className="text-muted-foreground">
          Verified home businesses - furniture, appliances, décor and more.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => {
            const logo = logoUrl(s.logoFileId);
            return (
              <Link key={s.$id} to={`/stores/${s.$id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex gap-4 p-5">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="h-7 w-7" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        {s.verified && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {s.category}
                      </Badge>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Store}
          title="No stores yet"
          description="Approved business storefronts will appear here."
        />
      )}
    </div>
  );
}
