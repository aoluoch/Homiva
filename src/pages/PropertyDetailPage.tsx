import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Mail,
  Phone,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn, formatKES } from "@/lib/utils";
import { VIEWING_FEE_KES } from "@/lib/config";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useProperty } from "@/hooks/useProperties";
import {
  canUnlockPropertyViewing,
  useViewingAccess,
  usePayViewingFee,
} from "@/hooks/useViewing";
import { useRecordView } from "@/hooks/useRecentlyViewed";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useCreateInquiry } from "@/hooks/useInquiries";
import { PropertyMapPreview } from "@/components/location/PropertyLocationPicker";
import { propertyCover, PROPERTY_PLACEHOLDER } from "@/components/property/propertyImage";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { ReviewSection } from "@/components/reviews/ReviewSection";

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: property, isLoading, isError } = useProperty(id);
  const { data: hasAccess } = useViewingAccess(id);
  const payFee = usePayViewingFee();
  const recordView = useRecordView();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (user && id) recordView.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !property) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Property not available</h1>
        <p className="mt-2 text-muted-foreground">
          This property may have been removed or is awaiting approval.
        </p>
        <Button asChild className="mt-6">
          <Link to="/properties">Browse properties</Link>
        </Button>
      </div>
    );
  }

  const canUnlock = canUnlockPropertyViewing(property);
  const unlocked = !!hasAccess && canUnlock;
  const isFavorited = favorites?.some((f) => f.propertyId === property.$id);
  const gallery = property.imageIds?.length
    ? property.imageIds
    : property.coverImageId
      ? [property.coverImageId]
      : [];
  const heroSrc = activeImage
    ? filePreview(appwriteConfig.buckets.propertyImages, activeImage, {
        width: 1200,
        height: 800,
      })
    : propertyCover(property, { width: 1200, height: 800 });

  const handleFavorite = () => {
    if (!user) {
      toast.error("Log in to save properties.");
      return;
    }
    toggleFavorite.mutate(property.$id, {
      onSuccess: (res) =>
        toast.success(res.favorited ? "Saved" : "Removed from saved"),
    });
  };

  const handlePay = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/properties/${id}` } } });
      return;
    }
    if (!canUnlockPropertyViewing(property)) {
      toast.error(
        "This property is not yet verified by Homiva. Unlock will be available after location verification.",
      );
      return;
    }
    payFee.mutate(property.$id, {
      onSuccess: () =>
        toast.success("Payment successful. Property details unlocked!"),
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const priceSuffix =
    property.listingType === "rent"
      ? "/mo"
      : property.listingType === "airbnb"
        ? "/night"
        : "";

  return (
    <div className="container py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/properties">
          <ArrowLeft className="h-4 w-4" /> Back to properties
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: gallery + details */}
        <div>
          <div className="overflow-hidden rounded-xl border bg-muted">
            <img
              src={heroSrc}
              alt={property.title}
              onError={(e) => (e.currentTarget.src = PROPERTY_PLACEHOLDER)}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {gallery.map((fileId) => (
                <button
                  key={fileId}
                  onClick={() => setActiveImage(fileId)}
                  className={cn(
                    "h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    (activeImage ?? gallery[0]) === fileId
                      ? "border-primary"
                      : "border-transparent",
                  )}
                >
                  <img
                    src={filePreview(
                      appwriteConfig.buckets.propertyImages,
                      fileId,
                      { width: 200, height: 150 },
                    )}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={property.listingType === "sale" ? "default" : "accent"}
                >
                  {property.listingType === "sale"
                    ? "For Sale"
                    : property.listingType === "rent"
                      ? "For Rent"
                      : "Airbnb"}
                </Badge>
                {property.featured && <Badge variant="warning">Featured</Badge>}
              </div>
              <h1 className="mt-2 text-3xl font-bold">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {property.town}, {property.county}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-primary">
                {formatKES(property.price)}
                <span className="text-base font-normal text-muted-foreground">
                  {priceSuffix}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 rounded-xl border bg-card p-4">
            <Stat icon={BedDouble} label="Bedrooms" value={property.bedrooms} />
            <Stat icon={Bath} label="Bathrooms" value={property.bathrooms} />
            {property.sizeSqft ? (
              <Stat icon={Ruler} label="Size" value={`${property.sizeSqft} sqft`} />
            ) : null}
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">
              {property.description}
            </p>
          </section>

          {property.amenities?.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Amenities</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {property.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {a}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <ReviewSection targetType="property" targetId={property.$id} />
          </section>
        </div>

        {/* Right: sticky action card */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {property.listingType === "airbnb" && (
            <BookingWidget property={property} />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Listed by</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFavorite}
                  aria-label="Save"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorited && "fill-accent text-accent",
                    )}
                  />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{property.ownerName}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {property.ownerRole.replace("_", " ")}
                </p>
              </div>

              <Separator />

              {unlocked ? (
                <UnlockedPanel property={property} />
              ) : (
                <div className="rounded-lg border border-dashed bg-secondary/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4 text-accent" />
                    Details locked
                  </div>
                  {canUnlock ? (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Pay a one-time {formatKES(VIEWING_FEE_KES)} viewing fee to
                        unlock the exact location and contact details for this
                        property.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-4 w-full"
                        onClick={handlePay}
                        disabled={payFee.isPending}
                      >
                        {payFee.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>Unlock for {formatKES(VIEWING_FEE_KES)}</>
                        )}
                      </Button>
                      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" /> Secure payment via
                        Paystack
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Homiva has not verified this listing&apos;s location yet.
                        Unlock and payment will be available once an admin
                        completes verification.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-4 w-full"
                        disabled
                        aria-disabled
                      >
                        Unlock unavailable
                      </Button>
                      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" /> Awaiting location
                        verification
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function UnlockedPanel({
  property,
}: {
  property: import("@/types/models").Property;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-primary">
          <Check className="h-4 w-4" /> Details unlocked
        </div>
      </div>
      {property.address && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {property.address}
          </p>
        </div>
      )}
      {property.latitude && property.longitude ? (
        <PropertyMapPreview
          latitude={property.latitude}
          longitude={property.longitude}
          label={property.address ?? `${property.town}, ${property.county}`}
        />
      ) : null}
      {(property.latitude && property.longitude) || property.address ? (
        <Button asChild variant="outline" className="w-full">
          <a
            href={mapHref(property)}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin className="h-4 w-4" /> Open map
          </a>
        </Button>
      ) : null}
      {property.contactPhone && (
        <a
          href={`tel:${property.contactPhone}`}
          className="flex items-center gap-2 text-sm hover:text-primary"
        >
          <Phone className="h-4 w-4 text-primary" /> {property.contactPhone}
        </a>
      )}
      {property.contactEmail && (
        <a
          href={`mailto:${property.contactEmail}`}
          className="flex items-center gap-2 text-sm hover:text-primary"
        >
          <Mail className="h-4 w-4 text-primary" /> {property.contactEmail}
        </a>
      )}
      <InquiryDialog property={property} />
    </div>
  );
}

function mapHref(property: import("@/types/models").Property) {
  if (property.latitude && property.longitude) {
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      property.latitude,
    )}&mlon=${encodeURIComponent(property.longitude)}#map=16/${
      property.latitude
    }/${property.longitude}`;
  }
  const query = [property.address, property.town, property.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function InquiryDialog({
  property,
}: {
  property: import("@/types/models").Property;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const createInquiry = useCreateInquiry();

  const submit = () => {
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    createInquiry.mutate(
      { property, message, phone },
      {
        onSuccess: () => {
          toast.success("Inquiry sent to Homiva. We'll be in touch!");
          setOpen(false);
          setMessage("");
          setPhone("");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Contact Homiva</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inquire about this property</DialogTitle>
          <DialogDescription>
            Send a message to the Homiva team about "{property.title}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Your phone (optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2547..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I'm interested in viewing this property..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={createInquiry.isPending}>
            {createInquiry.isPending ? "Sending..." : "Send inquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="mt-6 h-8 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
