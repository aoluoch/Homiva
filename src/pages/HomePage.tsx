import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Home,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGridSkeleton } from "@/components/property/PropertyCardSkeleton";
import { useFeaturedProperties } from "@/hooks/useProperties";
import { KENYA_COUNTIES } from "@/lib/config";

export default function HomePage() {
  const navigate = useNavigate();
  const { data: featured, isLoading } = useFeaturedProperties();
  const [type, setType] = useState("sale");
  const [county, setCounty] = useState<string>("");
  const [search, setSearch] = useState("");

  const runSearch = () => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (county) params.set("county", county);
    if (search) params.set("q", search);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="homiva-gradient text-primary-foreground">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Your Complete Home Companion
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight md:text-5xl">
              Find your next home and keep it running beautifully
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-white/85">
              Discover properties for sale, long-term rentals and short stays,
              then request trusted maintenance and cleaning services all in one
              place.
            </p>
          </div>

          {/* Search bar */}
          <Card className="mx-auto mt-8 max-w-4xl">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[160px_1fr_180px_auto]">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Search by title, e.g. 'apartment'"
                  className="pl-9"
                />
              </div>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger>
                  <SelectValue placeholder="Any county" />
                </SelectTrigger>
                <SelectContent>
                  {KENYA_COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={runSearch} className="w-full md:w-auto">
                <Search className="h-4 w-4" /> Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <CategoryCard
            to="/properties?type=sale"
            icon={Home}
            title="Homes for Sale"
            desc="Own your dream home"
          />
          <CategoryCard
            to="/properties?type=rent"
            icon={KeyRound}
            title="Long-term Rentals"
            desc="Comfortable places to live"
          />
          <CategoryCard
            to="/properties?type=airbnb"
            icon={BedDouble}
            title="Airbnb & Short Stays"
            desc="Book your next getaway"
          />
        </div>
      </section>

      {/* Featured */}
      <section className="container py-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Latest properties</h2>
            <p className="text-muted-foreground">
              Freshly listed homes across Kenya
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/properties">View all</Link>
          </Button>
        </div>
        {isLoading ? (
          <PropertyGridSkeleton />
        ) : featured && featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PropertyCard key={p.$id} property={p} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No properties published yet. Check back soon or list your own.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Value props */}
      <section className="container py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <ValueProp
            icon={ShieldCheck}
            title="Trusted & verified"
            desc="Listings and service providers are reviewed by the Homiva team before going live."
          />
          <ValueProp
            icon={Building2}
            title="One account, many roles"
            desc="Be a buyer, landlord and Airbnb host from a single Homiva account."
          />
          <ValueProp
            icon={Wrench}
            title="Home services (coming soon)"
            desc="Maintenance, repairs and Mama Fua cleaning with transparent quotations."
          />
        </div>
      </section>
    </div>
  );
}

function CategoryCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Home;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}

function ValueProp({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Home;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
