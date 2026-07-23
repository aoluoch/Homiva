import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";
import { useFavorites } from "@/hooks/useFavorites";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGridSkeleton } from "@/components/property/PropertyCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import type { Property } from "@/types/models";

export default function SavedPage() {
  const { data: favorites, isLoading: loadingFavs } = useFavorites();

  const { data: properties, isLoading } = useQuery({
    enabled: !!favorites,
    queryKey: ["saved-properties", favorites?.map((f) => f.propertyId)],
    queryFn: async () => {
      if (!favorites || favorites.length === 0) return [];
      const results = await Promise.all(
        favorites.map(async (f) => {
          try {
            const p = await tablesDB.getRow({
              databaseId: appwriteConfig.databaseId,
              tableId: TABLES.properties,
              rowId: f.propertyId,
            });
            return p as unknown as Property;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((p): p is Property => p !== null);
    },
  });

  const busy = loadingFavs || isLoading;

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold">Saved properties</h1>
      <p className="mb-8 text-muted-foreground">
        Properties you've bookmarked for later
      </p>

      {busy ? (
        <PropertyGridSkeleton />
      ) : properties && properties.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.$id} property={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="No saved properties yet"
          description="Tap the heart icon on any property to save it here."
          action={
            <Button asChild>
              <Link to="/properties">Browse properties</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
