import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  Home,
  KeyRound,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Wrench,
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
import { cn } from "@/lib/utils";

const journeyLinks = [
  {
    to: "/properties?type=sale",
    icon: Home,
    title: "Buy",
    desc: "Find listings with owner, agent and admin context in one place.",
  },
  {
    to: "/properties?type=rent",
    icon: KeyRound,
    title: "Rent",
    desc: "Shortlist practical homes and keep your saved search moving.",
  },
  {
    to: "/properties?type=airbnb",
    icon: BedDouble,
    title: "Stay",
    desc: "Book short stays and track every upcoming trip from your account.",
  },
  {
    to: "/services",
    icon: Wrench,
    title: "Repair",
    desc: "Request home help from providers when the work cannot wait.",
  },
  {
    to: "/marketplace",
    icon: ShoppingBag,
    title: "Shop",
    desc: "Browse storefronts for useful household goods and local finds.",
  },
];

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
    <div className="bg-background">
      <section className="home-hero border-b">
        <div className="container grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_460px] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
              <MapPin className="h-4 w-4 text-primary" />
              Built around Kenyan homes, stays, services and shops
            </div>
            <h1 className="max-w-3xl">
              <span className="sr-only">Homiva</span>
              <img
                src="/homiva_logo.jpg"
                alt=""
                className="h-24 w-full max-w-md rounded-md border bg-white object-contain px-4 shadow-sm md:h-32"
              />
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-muted-foreground">
              A calmer way to find a place, keep it running, book the stay,
              message the right person and buy what belongs in the home.
            </p>

            <div className="mt-8 grid gap-3 rounded-md border bg-card/95 p-3 shadow-sm md:grid-cols-[150px_1fr_180px_auto]">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger aria-label="Property type">
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
                  placeholder="Apartment, maisonette, furnished stay..."
                  className="pl-9"
                />
              </div>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger aria-label="County">
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
            </div>
          </div>

          <div className="home-market-board">
            <div className="flex items-start justify-between gap-5 border-b p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Today on the board
                </p>
                <p className="mt-1 text-3xl font-black">Home work, sorted.</p>
              </div>
              <img
                src="/homiva_logo.jpg"
                alt=""
                className="h-16 w-32 rounded-md border bg-white object-contain px-2"
              />
            </div>
            <div className="grid gap-3 p-5">
              <BoardItem label="Find a place" value="Sale, rent, short stay" />
              <BoardItem label="Keep it moving" value="Bookings and requests" />
              <BoardItem label="Run the business" value="Listings and shops" />
            </div>
            <div className="grid grid-cols-3 border-t text-center text-sm">
              <BoardStat value="5" label="home paths" />
              <BoardStat value="1" label="profile" />
              <BoardStat value="OTP" label="sign in" />
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-3 md:grid-cols-5">
          {journeyLinks.map((item, index) => (
            <JourneyCard key={item.to} {...item} active={index === 0} />
          ))}
        </div>
      </section>

      <section className="container py-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Fresh across Kenya
            </p>
            <h2 className="mt-2 text-3xl font-black">Latest properties</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/properties">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
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
          <Card className="rounded-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              No properties published yet. Check back soon or list your own.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="mt-8 border-y bg-secondary/50">
        <div className="container grid gap-8 py-12 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Why it feels different
            </p>
            <h2 className="mt-2 text-3xl font-black">
              One account follows the whole home journey.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ValueProp
              icon={ShieldCheck}
              title="Reviewed context"
              desc="Listings, providers and roles are designed around accountable profiles."
            />
            <ValueProp
              icon={Building2}
              title="Many roles"
              desc="A buyer can become a host, provider, landlord or shop owner."
            />
            <ValueProp
              icon={Wrench}
              title="After move-in"
              desc="Services, messages and orders stay close to the property journey."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function JourneyCard({
  to,
  icon: Icon,
  title,
  desc,
  active,
}: {
  to: string;
  icon: typeof Home;
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex min-h-[190px] flex-col justify-between rounded-md border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        active && "bg-primary text-primary-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary",
          active && "bg-white/15 text-primary-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p
          className={cn(
            "mt-2 text-sm leading-6 text-muted-foreground",
            active && "text-primary-foreground/80",
          )}
        >
          {desc}
        </p>
      </div>
    </Link>
  );
}

function BoardItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function BoardStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r p-4 last:border-r-0">
      <p className="text-xl font-black text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
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
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-accent/15 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
    </div>
  );
}
