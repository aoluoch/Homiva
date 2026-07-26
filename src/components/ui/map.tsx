import * as React from "react";
import { createPortal } from "react-dom";
import * as MapLibreGL from "maplibre-gl";
import type { MapOptions, MarkerOptions, PopupOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, Locate, Maximize, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultStyles = {
  light: rasterStyle(
    "carto-light",
    "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  ),
  dark: rasterStyle(
    "carto-dark",
    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  ),
};

export type MapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type Theme = "light" | "dark";
type MapStyle = string | MapLibreGL.StyleSpecification;
type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = React.createContext<MapContextValue | null>(null);

function rasterStyle(id: string, tileUrl: string): MapLibreGL.StyleSpecification {
  return {
    version: 8,
    sources: {
      [id]: {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id, type: "raster", source: id }],
  };
}

export function useMap() {
  const context = React.useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

function getDocumentTheme(): Theme | null {
  if (typeof document === "undefined") return null;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return root.dataset.theme === "dark" ? "dark" : null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useResolvedTheme(theme?: Theme) {
  const [detectedTheme, setDetectedTheme] = React.useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme(),
  );

  React.useEffect(() => {
    if (theme) return;
    const observer = new MutationObserver(() => {
      setDetectedTheme(getDocumentTheme() ?? getSystemTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      if (!getDocumentTheme()) setDetectedTheme(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", onSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", onSystemChange);
    };
  }, [theme]);

  return theme ?? detectedTheme;
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

type MapProps = {
  children?: React.ReactNode;
  className?: string;
  theme?: Theme;
  styles?: { light?: MapStyle; dark?: MapStyle };
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
} & Omit<MapOptions, "container" | "style">;

export const Map = React.forwardRef<MapLibreGL.Map, MapProps>(function Map(
  {
    children,
    className,
    theme,
    styles,
    viewport,
    onViewportChange,
    loading = false,
    ...props
  },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = React.useState<MapLibreGL.Map | null>(
    null,
  );
  const [isLoaded, setIsLoaded] = React.useState(false);
  const resolvedTheme = useResolvedTheme(theme);
  const onViewportChangeRef = React.useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  React.useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [
    mapInstance,
  ]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const initialStyle =
      resolvedTheme === "dark"
        ? styles?.dark ?? defaultStyles.dark
        : styles?.light ?? defaultStyles.light;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...props,
      ...viewport,
    });

    const handleLoad = () => setIsLoaded(true);
    const handleMove = () => onViewportChangeRef.current?.(getViewport(map));

    map.on("load", handleLoad);
    map.on("move", handleMove);
    setMapInstance(map);

    return () => {
      map.off("load", handleLoad);
      map.off("move", handleMove);
      map.remove();
      setIsLoaded(false);
      setMapInstance(null);
    };
    // MapLibre owns these options after initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!mapInstance) return;
    const nextStyle =
      resolvedTheme === "dark"
        ? styles?.dark ?? defaultStyles.dark
        : styles?.light ?? defaultStyles.light;
    mapInstance.setStyle(nextStyle);
  }, [mapInstance, resolvedTheme, styles?.dark, styles?.light]);

  React.useEffect(() => {
    if (!mapInstance || !viewport) return;
    mapInstance.jumpTo(viewport);
  }, [mapInstance, viewport]);

  const contextValue = React.useMemo(
    () => ({ map: mapInstance, isLoaded }),
    [mapInstance, isLoaded],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <div ref={containerRef} className="h-full w-full" />
        {(!isLoaded || loading) && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {mapInstance ? children : null}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
};

const MarkerContext = React.createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = React.useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: React.ReactNode;
  onClick?: (event: MouseEvent) => void;
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

export function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap();
  const callbacksRef = React.useRef({
    onClick,
    onDragStart,
    onDrag,
    onDragEnd,
  });
  callbacksRef.current = { onClick, onDragStart, onDrag, onDragEnd };

  const marker = React.useMemo(() => {
    const instance = new MapLibreGL.Marker({
      ...markerOptions,
      draggable,
      element: document.createElement("div"),
    }).setLngLat([longitude, latitude]);

    instance.getElement().addEventListener("click", (event: MouseEvent) => {
      callbacksRef.current.onClick?.(event);
    });
    instance.on("dragstart", () => {
      const lngLat = instance.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    instance.on("drag", () => {
      const lngLat = instance.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    instance.on("dragend", () => {
      const lngLat = instance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    return instance;
    // Marker event subscriptions are stable; changing callbacks are read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);

  React.useEffect(() => {
    marker.setLngLat([longitude, latitude]);
    marker.setDraggable(draggable);
  }, [marker, longitude, latitude, draggable]);

  const contextValue = React.useMemo(() => ({ marker, map }), [marker, map]);

  return (
    <MarkerContext.Provider value={contextValue}>
      {children}
    </MarkerContext.Provider>
  );
}

export function MarkerContent({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div className={cn("relative grid place-items-center", className)}>
      {children ?? (
        <div className="h-4 w-4 rounded-full border-2 border-white bg-primary shadow" />
      )}
    </div>,
    marker.getElement(),
  );
}

export function MarkerPopup({
  children,
  className,
  closeButton = false,
  ...popupOptions
}: {
  children: React.ReactNode;
  className?: string;
  closeButton?: boolean;
} & Omit<PopupOptions, "className">) {
  const { marker, map } = useMarkerContext();
  const container = React.useMemo(() => document.createElement("div"), []);
  const popup = React.useMemo(
    () =>
      new MapLibreGL.Popup({
        offset: 16,
        closeButton: false,
        ...popupOptions,
      })
        .setMaxWidth("none")
        .setDOMContent(container),
    // Popup options are intentionally captured at creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  React.useEffect(() => {
    if (!map) return;
    marker.setPopup(popup);
    return () => {
      marker.setPopup(null);
    };
  }, [map, marker, popup]);

  return createPortal(
    <div className={cn("rounded-md border bg-popover p-3 text-popover-foreground shadow-md", className)}>
      {closeButton ? (
        <button
          type="button"
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          onClick={() => popup.remove()}
          aria-label="Close popup"
        >
          x
        </button>
      ) : null}
      {children}
    </div>,
    container,
  );
}

type MapControlsProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showLocate?: boolean;
  showFullscreen?: boolean;
  className?: string;
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-8 left-2",
  "bottom-right": "bottom-8 right-2",
};

export function MapControls({
  position = "bottom-right",
  showZoom = true,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap();
  const [locating, setLocating] = React.useState(false);

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        };
        map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15 });
        onLocate?.(coords);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  };

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col overflow-hidden rounded-md border bg-background shadow-sm",
        positionClasses[position],
        className,
      )}
    >
      {showZoom ? (
        <>
          <MapControlButton label="Zoom in" onClick={() => map?.zoomIn()}>
            <Plus className="h-4 w-4" />
          </MapControlButton>
          <MapControlButton label="Zoom out" onClick={() => map?.zoomOut()}>
            <Minus className="h-4 w-4" />
          </MapControlButton>
        </>
      ) : null}
      {showLocate ? (
        <MapControlButton label="Use my location" onClick={locate} disabled={locating}>
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
        </MapControlButton>
      ) : null}
      {showFullscreen ? (
        <MapControlButton
          label="Fullscreen"
          onClick={() => {
            const container = map?.getContainer();
            if (!container) return;
            if (document.fullscreenElement) document.exitFullscreen();
            else container.requestFullscreen();
          }}
        >
          <Maximize className="h-4 w-4" />
        </MapControlButton>
      ) : null}
    </div>
  );
}

function MapControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="grid h-9 w-9 place-items-center border-b last:border-b-0 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
