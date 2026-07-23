import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGridSkeleton } from "@/components/property/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useProperties, type PropertyFilters } from "@/hooks/useProperties";
import { KENYA_COUNTIES } from "@/lib/config";
import type { ListingType } from "@/types/models";

const ANY = "any";

export default function PropertiesPage() {
  const [params, setParams] = useSearchParams();

  const type = (params.get("type") as ListingType | null) ?? "all";
  const county = params.get("county") ?? "";
  const q = params.get("q") ?? "";
  const bedrooms = params.get("beds") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const sort = (params.get("sort") as PropertyFilters["sort"]) ?? "newest";

  const filters: PropertyFilters = useMemo(
    () => ({
      listingType: type,
      county: county || undefined,
      search: q || undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
    }),
    [type, county, q, bedrooms, maxPrice, sort],
  );

  const { data: properties, isLoading, isError } = useProperties(filters);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams({}, { replace: true });

  const titles: Record<string, string> = {
    all: "All Properties",
    sale: "Homes for Sale",
    rent: "Long-term Rentals",
    airbnb: "Airbnb & Short Stays",
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{titles[type]}</h1>
        <p className="text-muted-foreground">
          Browse verified listings across Kenya
        </p>
      </div>

      <Tabs value={type} onValueChange={(v) => update("type", v)}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sale">Buy</TabsTrigger>
          <TabsTrigger value="rent">Rent</TabsTrigger>
          <TabsTrigger value="airbnb">Airbnb</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="mb-8 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_repeat(4,minmax(0,160px))_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue={q}
            placeholder="Search title..."
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                update("q", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <Select value={county || ANY} onValueChange={(v) => update("county", v)}>
          <SelectTrigger>
            <SelectValue placeholder="County" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any county</SelectItem>
            {KENYA_COUNTIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bedrooms || ANY} onValueChange={(v) => update("beds", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any beds</SelectItem>
            <SelectItem value="1">1+ beds</SelectItem>
            <SelectItem value="2">2+ beds</SelectItem>
            <SelectItem value="3">3+ beds</SelectItem>
            <SelectItem value="4">4+ beds</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={maxPrice || ANY}
          onValueChange={(v) => update("maxPrice", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Max price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any price</SelectItem>
            <SelectItem value="50000">Up to 50K</SelectItem>
            <SelectItem value="150000">Up to 150K</SelectItem>
            <SelectItem value="1000000">Up to 1M</SelectItem>
            <SelectItem value="10000000">Up to 10M</SelectItem>
            <SelectItem value="100000000">Up to 100M</SelectItem>
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
        <Button variant="ghost" onClick={clearAll}>
          Clear
        </Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <PropertyGridSkeleton count={9} />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="Couldn't load properties"
          description="Make sure the Appwrite backend has been provisioned (run npm run setup:appwrite), then refresh."
        />
      ) : properties && properties.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} found
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.$id} property={p} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No properties match your filters"
          description="Try adjusting or clearing your filters to see more results."
          action={
            <Button variant="outline" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
