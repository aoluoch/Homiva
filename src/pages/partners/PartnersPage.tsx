import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig, PARTNER_CATEGORIES } from "@/lib/config";
import { usePartnerCompanies } from "@/hooks/usePartners";

function logoUrl(fileId?: string) {
  if (!fileId) return null;
  return filePreview(appwriteConfig.buckets.storeAssets, fileId, {
    width: 160,
    height: 160,
  });
}

export default function PartnersPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const { data, isLoading } = usePartnerCompanies(category);

  const update = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("category", value);
    else next.delete("category");
    setParams(next, { replace: true });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Partner Companies</h1>
        <p className="text-muted-foreground">
          Approved movers, cleaning companies and interior design teams.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!category ? "default" : "outline"}
          onClick={() => update("")}
        >
          All
        </Button>
        {PARTNER_CATEGORIES.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={category === item.key ? "default" : "outline"}
            onClick={() => update(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((company) => {
            const logo = logoUrl(company.logoFileId);
            return (
              <Link key={company.$id} to={`/partners/${company.$id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex gap-4 p-5">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                      {logo ? (
                        <img src={logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BriefcaseBusiness className="h-7 w-7" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-semibold">{company.name}</h3>
                        {company.verified && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {PARTNER_CATEGORIES.find((c) => c.key === company.category)?.label}
                      </Badge>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {company.description}
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
          icon={BriefcaseBusiness}
          title="No partner companies yet"
          description="Approved and subscribed partner companies will appear here."
        />
      )}
    </div>
  );
}
