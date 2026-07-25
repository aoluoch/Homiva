import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Mail, MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { useStorefront } from "@/hooks/useStore";
import { useStoreProducts } from "@/hooks/useMarketplace";

function asset(fid?: string, w = 200, h = 200) {
  if (!fid) return null;
  const url = filePreview(appwriteConfig.buckets.storeAssets, fid, {
    width: w,
    height: h,
  });
  return url;
}

export default function StorefrontPage() {
  const { id } = useParams();
  const { data: store, isLoading } = useStorefront(id);
  const { data: products } = useStoreProducts(id);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!store) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Store not found.
      </div>
    );
  }

  const banner = asset(store.bannerFileId, 1200, 400);
  const logo = asset(store.logoFileId, 160, 160);

  return (
    <div className="container py-8">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-40 bg-gradient-to-r from-primary/20 to-accent/20 md:h-56">
          {banner && (
            <img src={banner} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="-mt-16 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-4 border-background bg-primary/10 text-primary">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-10 w-10" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{store.name}</h1>
              {store.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <Badge variant="secondary" className="mt-1">
              {store.category}
            </Badge>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {store.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {(store.town || store.county) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {store.town}
                  {store.town && store.county ? ", " : ""}
                  {store.county}
                </span>
              )}
              {store.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {store.phone}
                </span>
              )}
              {store.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {store.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-xl font-bold">Products</h2>
      {products && products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.$id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Store}
          title="No products yet"
          description="This store hasn't listed any products."
          action={
            <Link to="/marketplace" className="text-sm text-primary underline">
              Browse the marketplace
            </Link>
          }
        />
      )}

      <div className="mt-12 max-w-2xl">
        <ReviewSection targetType="storefront" targetId={store.$id} />
      </div>
    </div>
  );
}
