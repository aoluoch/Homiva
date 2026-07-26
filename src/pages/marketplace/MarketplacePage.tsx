import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { useProducts, type ProductFilters } from "@/hooks/useMarketplace";
import { MARKETPLACE_CATEGORIES, PRODUCT_CONDITIONS } from "@/lib/config";

const ANY = "any";

export default function MarketplacePage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const q = params.get("q") ?? "";
  const condition = params.get("condition") ?? "";
  const sort = (params.get("sort") as ProductFilters["sort"]) ?? "newest";

  const filters: ProductFilters = useMemo(
    () => ({
      category: category || undefined,
      search: q || undefined,
      condition: condition || undefined,
      sort,
    }),
    [category, q, condition, sort],
  );

  const {
    items: data,
    total,
    isLoading,
    hasMore,
    loadMore,
    isFetchingNextPage,
  } = useProducts(filters);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Home Marketplace</h1>
        <p className="text-muted-foreground">
          Furniture, appliances, décor and building materials from verified sellers.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={!category ? "default" : "outline"}
          size="sm"
          onClick={() => update("category", "")}
        >
          All
        </Button>
        {MARKETPLACE_CATEGORIES.map((c) => (
          <Button
            key={c.key}
            variant={category === c.key ? "default" : "outline"}
            size="sm"
            onClick={() => update("category", c.key)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <div className="mb-8 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue={q}
            placeholder="Search products..."
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                update("q", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <Select
          value={condition || ANY}
          onValueChange={(v) => update("condition", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any condition</SelectItem>
            {PRODUCT_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      ) : data.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {data.length}
            {total > data.length ? ` of ${total}` : ""} product
            {total === 1 ? "" : "s"}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((p) => (
              <ProductCard key={p.$id} product={p} />
            ))}
          </div>
          <LoadMoreButton
            hasMore={hasMore}
            loading={isFetchingNextPage}
            onLoadMore={loadMore}
            label="Load more products"
          />
        </>
      ) : (
        <EmptyState
          icon={PackageSearch}
          title="No products found"
          description="Try a different category or check back soon as sellers add stock."
        />
      )}
    </div>
  );
}
