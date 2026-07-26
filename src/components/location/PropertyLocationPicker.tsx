import * as React from "react";
import type { MapMouseEvent } from "maplibre-gl";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

const DEFAULT_COORDS = { lng: 36.8219, lat: -1.2921 };

type Coordinates = {
  lng: number;
  lat: number;
};

type LocationChange = {
  latitude: string;
  longitude: string;
  formattedAddress?: string;
};

export function PropertyLocationPicker({
  id,
  latitude,
  longitude,
  searchHint,
  className,
  size = "default",
  defaultOpen,
  onChange,
}: {
  id?: string;
  latitude?: string;
  longitude?: string;
  searchHint?: string;
  className?: string;
  /** `prominent` is used on role applications so the pin map is hard to miss. */
  size?: "default" | "prominent";
  defaultOpen?: boolean;
  onChange: (location: LocationChange) => void;
}) {
  const generatedId = React.useId();
  const searchId = id ?? `location-search-${generatedId}`;
  const initial = parseCoordinates(latitude, longitude);
  const [marker, setMarker] = React.useState<Coordinates>(
    initial ?? DEFAULT_COORDS,
  );
  const [hasPinned, setHasPinned] = React.useState(Boolean(initial));
  const [search, setSearch] = React.useState(searchHint ?? "");
  const [searching, setSearching] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(
    Boolean(initial) || Boolean(defaultOpen) || size === "prominent",
  );
  const [error, setError] = React.useState("");
  const mapHeight =
    size === "prominent"
      ? "h-[min(70vh,520px)] min-h-[380px]"
      : "h-[340px]";

  React.useEffect(() => {
    const parsed = parseCoordinates(latitude, longitude);
    if (!parsed) return;
    setMarker(parsed);
    setHasPinned(true);
    setMapOpen(true);
  }, [latitude, longitude]);

  React.useEffect(() => {
    setSearch((current) => current || searchHint || "");
  }, [searchHint]);

  const commitLocation = React.useCallback(
    (coords: Coordinates, formattedAddress?: string) => {
      setMarker(coords);
      setHasPinned(true);
      onChange({
        latitude: coords.lat.toFixed(6),
        longitude: coords.lng.toFixed(6),
        formattedAddress,
      });
    },
    [onChange],
  );

  const findLocation = async () => {
    const query = (search || searchHint || "").trim();
    if (!query) {
      setError("Enter an address, estate or landmark to search.");
      return;
    }

    setSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({
        format: "json",
        limit: "1",
        countrycodes: "ke",
        q: query,
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Location search failed.");
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;
      const result = results[0];
      if (!result) {
        setError("No matching Kenyan location found.");
        return;
      }

      const coords = { lng: Number(result.lon), lat: Number(result.lat) };
      setSearch(result.display_name ?? query);
      setMapOpen(true);
      commitLocation(coords, result.display_name);
    } catch (err) {
      setError((err as Error).message || "Could not search this location.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor={searchId}>Search and pin exact location</Label>
        <div className="flex gap-2">
          <Input
            id={searchId}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                findLocation();
              }
            }}
            placeholder="Search estate, road, building or landmark"
          />
          <Button
            type="button"
            variant="outline"
            onClick={findLocation}
            disabled={searching}
            aria-label="Search location"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {mapOpen ? (
        <div
          className={cn(
            "overflow-hidden rounded-lg border-2 border-primary/30 bg-muted shadow-sm",
            mapHeight,
          )}
        >
          <Map center={[marker.lng, marker.lat]} zoom={hasPinned ? 15 : 11}>
            <MapClickHandler onPick={commitLocation} />
            <MapMoveTo coordinates={marker} zoom={hasPinned ? 15 : 11} />
            <MapControls
              showLocate
              showFullscreen
              onLocate={(coords) =>
                commitLocation({ lng: coords.longitude, lat: coords.latitude })
              }
            />
            <MapMarker
              draggable
              longitude={marker.lng}
              latitude={marker.lat}
              onDragEnd={commitLocation}
            >
              <MarkerContent>
                <div className="cursor-move">
                  <MapPin
                    className="fill-primary text-primary-foreground drop-shadow-md"
                    size={size === "prominent" ? 42 : 34}
                  />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pinned location</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  </p>
                </div>
              </MarkerPopup>
            </MapMarker>
          </Map>
        </div>
      ) : (
        <div className="grid min-h-[200px] place-items-center rounded-lg border-2 border-dashed border-primary/25 bg-primary/5 p-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-primary/15 text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pin your exact location</p>
              <p className="text-xs text-muted-foreground">
                Search above or open the map — this is required for role review.
              </p>
            </div>
            <Button type="button" onClick={() => setMapOpen(true)}>
              <MapPin className="h-4 w-4" />
              Open map
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2",
          hasPinned
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-secondary/40",
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Latitude
          </p>
          <p className="font-mono font-medium">
            {hasPinned ? marker.lat.toFixed(6) : "Not pinned"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Longitude
          </p>
          <p className="font-mono font-medium">
            {hasPinned ? marker.lng.toFixed(6) : "Not pinned"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PropertyMapPreview({
  latitude,
  longitude,
  label,
  className,
}: {
  latitude?: string;
  longitude?: string;
  label?: string;
  className?: string;
}) {
  const coords = parseCoordinates(latitude, longitude);
  if (!coords) return null;

  return (
    <div
      className={cn(
        "h-48 overflow-hidden rounded-lg border-2 border-primary/25 bg-muted shadow-sm",
        className,
      )}
    >
      <Map
        center={[coords.lng, coords.lat]}
        zoom={15}
        interactive={false}
      >
        <MapMarker longitude={coords.lng} latitude={coords.lat}>
          <MarkerContent>
            <MapPin
              className="fill-primary text-primary-foreground drop-shadow-md"
              size={32}
            />
          </MarkerContent>
          {label ? (
            <MarkerPopup>
              <p className="max-w-56 text-sm font-medium">{label}</p>
            </MarkerPopup>
          ) : null}
        </MapMarker>
      </Map>
    </div>
  );
}

function MapClickHandler({
  onPick,
}: {
  onPick: (coords: Coordinates) => void;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map) return;
    const handleClick = (event: MapMouseEvent) => {
      onPick({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    };
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onPick]);

  return null;
}

function MapMoveTo({
  coordinates,
  zoom,
}: {
  coordinates: Coordinates;
  zoom: number;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    map?.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom,
      duration: 500,
    });
  }, [coordinates, map, zoom]);

  return null;
}

function parseCoordinates(latitude?: string, longitude?: string) {
  // Number("") === 0, so empty strings must be rejected or the picker
  // falsely treats an unpinned location as 0°N, 0°E (Null Island).
  if (typeof latitude !== "string" || typeof longitude !== "string") return null;
  const latRaw = latitude.trim();
  const lngRaw = longitude.trim();
  if (!latRaw || !lngRaw) return null;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
