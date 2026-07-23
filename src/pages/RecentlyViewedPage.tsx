import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGridSkeleton } from "@/components/property/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export default function RecentlyViewedPage() {
  const { data: properties, isLoading } = useRecentlyViewed();

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold">Recently viewed</h1>
      <p className="mb-8 text-muted-foreground">
        Pick up where you left off
      </p>

      {isLoading ? (
        <PropertyGridSkeleton />
      ) : properties && properties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.$id} property={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Properties you view will appear here for quick access."
          action={
            <Button asChild>
              <Link to="/properties">Start browsing</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
