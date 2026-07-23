import * as React from "react";
import { Link } from "react-router-dom";
import { Bath, BedDouble, Heart, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatKES } from "@/lib/utils";
import type { ListingType, Property } from "@/types/models";
import { propertyCover, PROPERTY_PLACEHOLDER } from "./propertyImage";
import { useAuth } from "@/context/AuthContext";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { toast } from "sonner";

const listingLabels: Record<ListingType, string> = {
  sale: "For Sale",
  rent: "For Rent",
  airbnb: "Airbnb",
};

function priceSuffix(type: ListingType) {
  if (type === "rent") return "/mo";
  if (type === "airbnb") return "/night";
  return "";
}

export function PropertyCard({ property }: { property: Property }) {
  const { user } = useAuth();
  const { data: favorites } = useFavorites();
  const toggle = useToggleFavorite();

  const isFavorited = favorites?.some((f) => f.propertyId === property.$id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Log in to save properties.");
      return;
    }
    toggle.mutate(property.$id, {
      onSuccess: (res) =>
        toast.success(res.favorited ? "Saved to favorites" : "Removed from favorites"),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  return (
    <Link
      to={`/properties/${property.$id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={propertyCover(property, { width: 640, height: 480 })}
          alt={property.title}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = PROPERTY_PLACEHOLDER)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge
          variant={property.listingType === "sale" ? "default" : "accent"}
          className="absolute left-3 top-3 shadow"
        >
          {listingLabels[property.listingType]}
        </Badge>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleFavorite}
          className="absolute right-3 top-3 h-9 w-9 rounded-full bg-background/90 shadow"
          aria-label="Save property"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isFavorited && "fill-accent text-accent",
            )}
          />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold text-primary">
            {formatKES(property.price)}
            <span className="text-sm font-normal text-muted-foreground">
              {priceSuffix(property.listingType)}
            </span>
          </p>
        </div>
        <h3 className="line-clamp-1 font-semibold">{property.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">
            {property.town}, {property.county}
          </span>
        </p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" /> {property.bedrooms} bd
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" /> {property.bathrooms} ba
          </span>
          {property.sizeSqft ? (
            <span className="ml-auto text-xs">{property.sizeSqft} sqft</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
