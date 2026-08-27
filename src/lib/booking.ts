/** Default Airbnb house rules used when a listing has no custom times. */
export const DEFAULT_CHECK_IN_TIME = "15:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

type LocationLike = {
  address?: string;
  town?: string;
  county?: string;
  latitude?: string;
  longitude?: string;
};

export function resolveCheckInTime(value?: string | null) {
  return (value || "").trim() || DEFAULT_CHECK_IN_TIME;
}

export function resolveCheckOutTime(value?: string | null) {
  return (value || "").trim() || DEFAULT_CHECK_OUT_TIME;
}

/** Format a 24h `HH:MM` clock as `3:00 PM`. */
export function formatClockTime(value?: string | null) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw || "—";
  const minutes = match[2];
  let hours = Number(match[1]);
  if (!Number.isFinite(hours)) return raw;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatStayDate(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso).slice(0, 10);
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function locationQuery(location: LocationLike) {
  return [location.address, location.town, location.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
}

/** OpenStreetMap pin for in-app previews. */
export function mapPreviewHref(location: LocationLike) {
  if (location.latitude && location.longitude) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      location.latitude,
    )}&mlon=${encodeURIComponent(location.longitude)}#map=16/${
      location.latitude
    }/${location.longitude}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(
    locationQuery(location),
  )}`;
}

/** Google Maps driving directions to the stay. */
export function mapsDirectionsHref(location: LocationLike) {
  const destination =
    location.latitude && location.longitude
      ? `${location.latitude},${location.longitude}`
      : locationQuery(location);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}`;
}
