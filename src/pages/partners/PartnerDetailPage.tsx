import { useParams } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig, PARTNER_CATEGORIES } from "@/lib/config";
import { usePartnerCompany, usePartnerPortfolio } from "@/hooks/usePartners";

function asset(fileId?: string, width = 400, height = 300) {
  if (!fileId) return null;
  return filePreview(appwriteConfig.buckets.storeAssets, fileId, { width, height });
}

export default function PartnerDetailPage() {
  const { id } = useParams();
  const { data: company, isLoading } = usePartnerCompany(id);
  const { data: portfolio } = usePartnerPortfolio(company?.$id);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (!company || company.status !== "approved" || company.subscriptionStatus !== "active") {
    return (
      <div className="container py-16">
        <EmptyState
          icon={BriefcaseBusiness}
          title="Partner profile unavailable"
          description="This company profile is not currently published."
        />
      </div>
    );
  }

  const banner = asset(company.bannerFileId, 1200, 420);
  const logo = asset(company.logoFileId, 180, 180);

  return (
    <div className="container py-8">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-40 bg-secondary md:h-56">
          {banner && <img src={banner} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="-mt-16 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-4 border-background bg-primary/10 text-primary">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <BriefcaseBusiness className="h-10 w-10" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-bold">{company.name}</h1>
              {company.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <Badge variant="secondary" className="mt-1">
              {PARTNER_CATEGORIES.find((c) => c.key === company.category)?.label}
            </Badge>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {company.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {(company.town || company.county) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {company.town}
                  {company.town && company.county ? ", " : ""}
                  {company.county}
                </span>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {company.phone}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {company.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-xl font-bold">Work Portfolio</h2>
      {portfolio && portfolio.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((image) => (
            <img
              key={image.$id}
              src={asset(image.fileId, 600, 420) ?? ""}
              alt={image.caption ?? ""}
              className="aspect-[4/3] rounded-lg object-cover"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No portfolio images yet"
          description="This company has not published work images."
        />
      )}

      <div className="mt-12 max-w-2xl">
        <ReviewSection targetType="partner_company" targetId={company.$id} />
      </div>
    </div>
  );
}
