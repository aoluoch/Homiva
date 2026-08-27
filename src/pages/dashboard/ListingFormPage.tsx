import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KENYA_COUNTIES } from "@/lib/config";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/booking";
import { filePreview, formatAppwriteError } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { PropertyLocationPicker } from "@/components/location/PropertyLocationPicker";
import { useProperty } from "@/hooks/useProperties";
import {
  useCreateProperty,
  useUpdateProperty,
  type PropertyFormValues,
} from "@/hooks/usePropertyMutations";
import type { ListingType } from "@/types/models";

const emptyForm: PropertyFormValues = {
  title: "",
  description: "",
  listingType: "sale",
  price: 0,
  county: "Nairobi",
  town: "",
  address: "",
  latitude: "",
  longitude: "",
  bedrooms: 1,
  bathrooms: 1,
  sizeSqft: undefined,
  amenities: [],
  contactPhone: "",
  contactEmail: "",
  checkInTime: DEFAULT_CHECK_IN_TIME,
  checkOutTime: DEFAULT_CHECK_OUT_TIME,
};

export default function ListingFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: existing } = useProperty(id);
  const create = useCreateProperty();
  const update = useUpdateProperty();

  const [form, setForm] = useState<PropertyFormValues>(emptyForm);
  const [amenitiesText, setAmenitiesText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  // Existing (already-uploaded) images the owner keeps, in display order.
  const [keptImageIds, setKeptImageIds] = useState<string[]>([]);
  // Preferred cover among the existing kept images (null = first photo).
  const [coverImageId, setCoverImageId] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        listingType: existing.listingType,
        price: existing.price,
        county: existing.county,
        town: existing.town,
        address: existing.address ?? "",
        latitude: existing.latitude ?? "",
        longitude: existing.longitude ?? "",
        bedrooms: existing.bedrooms,
        bathrooms: existing.bathrooms,
        sizeSqft: existing.sizeSqft,
        amenities: existing.amenities ?? [],
        contactPhone: existing.contactPhone ?? "",
        contactEmail: existing.contactEmail ?? "",
        checkInTime: existing.checkInTime || DEFAULT_CHECK_IN_TIME,
        checkOutTime: existing.checkOutTime || DEFAULT_CHECK_OUT_TIME,
      });
      setAmenitiesText((existing.amenities ?? []).join(", "));
      setKeptImageIds(existing.imageIds ?? []);
      setCoverImageId(
        existing.coverImageId ?? existing.imageIds?.[0] ?? null,
      );
    }
  }, [existing]);

  const set = <K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeNewFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (fileId: string) => {
    setKeptImageIds((prev) => {
      const next = prev.filter((idValue) => idValue !== fileId);
      setCoverImageId((cover) =>
        cover === fileId ? (next[0] ?? null) : cover,
      );
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(Number(form.price));
    const bedrooms = Math.max(0, Math.floor(Number(form.bedrooms) || 0));
    const bathrooms = Math.max(0, Math.floor(Number(form.bathrooms) || 0));
    const sizeRaw = form.sizeSqft;
    const sizeSqft =
      sizeRaw === undefined || sizeRaw === null || String(sizeRaw) === ""
        ? undefined
        : Math.max(0, Math.floor(Number(sizeRaw)));

    if (!Number.isFinite(price) || price < 0) {
      toast.error("Please enter a valid price in KES.");
      return;
    }

    const values: PropertyFormValues = {
      ...form,
      price,
      bedrooms,
      bathrooms,
      sizeSqft,
      latitude: form.latitude?.trim() || undefined,
      longitude: form.longitude?.trim() || undefined,
      amenities: amenitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    if (!values.title || !values.description || !values.town) {
      toast.error("Please fill in the title, description and town.");
      return;
    }
    if (!isEdit && files.length === 0) {
      toast.error("Please add at least one photo.");
      return;
    }
    if (isEdit && keptImageIds.length + files.length === 0) {
      toast.error("A listing needs at least one photo. Add a new one before removing the last.");
      return;
    }

    if (isEdit && existing) {
      update.mutate(
        {
          property: existing,
          values,
          newFiles: files,
          keptImageIds,
          coverImageId,
        },
        {
          onSuccess: () => {
            toast.success("Listing updated and resubmitted for review.");
            navigate("/dashboard");
          },
          onError: (err) => toast.error(formatAppwriteError(err)),
        },
      );
    } else {
      create.mutate(
        { values, files },
        {
          onSuccess: () => {
            toast.success("Listing submitted for review.");
            navigate("/dashboard");
          },
          onError: (err) => toast.error(formatAppwriteError(err)),
        },
      );
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="container max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>

      <h1 className="mb-6 text-3xl font-bold">
        {isEdit ? "Edit listing" : "Create a listing"}
      </h1>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Modern 2-bedroom apartment in Kilimani"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Listing type</Label>
                <Select
                  value={form.listingType}
                  onValueChange={(v) => set("listingType", v as ListingType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                    <SelectItem value="airbnb">Airbnb / Short stay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price (KES{form.listingType === "rent" ? " / month" : ""}
                  {form.listingType === "airbnb" ? " / night" : ""})
                </Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="e.g. 2300000"
                  value={form.price || ""}
                  onChange={(e) =>
                    set(
                      "price",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full amount in KES (for 2.3M use 2300000). Decimals
                  are rounded to the nearest shilling.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the property, its features and neighbourhood..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location &amp; specs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>County</Label>
                <Select
                  value={form.county}
                  onValueChange={(v) => set("county", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KENYA_COUNTIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="town">Town / area</Label>
                <Input
                  id="town"
                  value={form.town}
                  onChange={(e) => set("town", e.target.value)}
                  placeholder="Kilimani"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">
                Full address (
                {form.listingType === "airbnb"
                  ? "shown to guests after they book"
                  : "shown only after viewing fee"}
                )
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, building, landmark"
              />
            </div>
            <PropertyLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              searchHint={[form.address, form.town, form.county, "Kenya"]
                .filter(Boolean)
                .join(", ")}
              onChange={({ latitude, longitude, formattedAddress }) =>
                setForm((current) => ({
                  ...current,
                  latitude,
                  longitude,
                  address: formattedAddress ?? current.address,
                }))
              }
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={Number.isFinite(form.bedrooms) ? form.bedrooms : 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      set("bedrooms", 0);
                      return;
                    }
                    const next = Number(raw);
                    if (Number.isFinite(next)) {
                      set("bedrooms", Math.max(0, Math.floor(next)));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={Number.isFinite(form.bathrooms) ? form.bathrooms : 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      set("bathrooms", 0);
                      return;
                    }
                    const next = Number(raw);
                    if (Number.isFinite(next)) {
                      set("bathrooms", Math.max(0, Math.floor(next)));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size (sqft)</Label>
                <Input
                  id="size"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.sizeSqft ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      set("sizeSqft", undefined);
                      return;
                    }
                    const next = Number(raw);
                    if (Number.isFinite(next)) {
                      set("sizeSqft", Math.max(0, Math.floor(next)));
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities (comma separated)</Label>
              <Input
                id="amenities"
                value={amenitiesText}
                onChange={(e) => setAmenitiesText(e.target.value)}
                placeholder="Parking, Borehole, CCTV, Backup generator"
              />
            </div>
          </CardContent>
        </Card>

        {form.listingType === "airbnb" && (
          <Card>
            <CardHeader>
              <CardTitle>Check-in &amp; check-out</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">Check-in time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={form.checkInTime || DEFAULT_CHECK_IN_TIME}
                  onChange={(e) => set("checkInTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">Check-out time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={form.checkOutTime || DEFAULT_CHECK_OUT_TIME}
                  onChange={(e) => set("checkOutTime", e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Guests receive these times in their booking confirmation email.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {form.listingType === "airbnb"
                ? "Host contact (shown to guests after they book)"
                : "Contact (shown after viewing fee)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Contact phone</Label>
              <Input
                id="phone"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="+2547..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cemail">Contact email</Label>
              <Input
                id="cemail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEdit && (
              <p className="text-sm text-muted-foreground">
                Remove any wrong or broken photos with the{" "}
                <X className="inline h-3.5 w-3.5 align-text-bottom" /> button and
                add replacements. Tap a photo's star to make it the cover shown
                to users.
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {isEdit &&
                keptImageIds.map((fileId) => {
                  const isCover = coverImageId
                    ? coverImageId === fileId
                    : keptImageIds[0] === fileId;
                  return (
                    <div
                      key={fileId}
                      className="relative aspect-square overflow-hidden rounded-lg border"
                    >
                      <img
                        src={filePreview(
                          appwriteConfig.buckets.propertyImages,
                          fileId,
                          { width: 200, height: 200 },
                        )}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverImageId(fileId)}
                        title={isCover ? "Cover photo" : "Make cover photo"}
                        className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow"
                      >
                        <Star
                          className={
                            isCover
                              ? "h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                              : "h-3.5 w-3.5 text-muted-foreground"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExistingImage(fileId)}
                        title="Remove photo"
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {isCover && (
                        <span className="absolute inset-x-0 bottom-0 bg-background/85 py-0.5 text-center text-[10px] font-medium">
                          Cover
                        </span>
                      )}
                    </div>
                  );
                })}
              {previews.map((src, i) => (
                <div
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <div className="text-center">
                  <ImagePlus className="mx-auto h-6 w-6" />
                  <span className="text-xs">Add photos</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onFilesSelected}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" type="button">
            <Link to="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Submit for review"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
