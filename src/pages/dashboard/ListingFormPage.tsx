import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
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
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
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
  bedrooms: 1,
  bathrooms: 1,
  sizeSqft: undefined,
  amenities: [],
  contactPhone: "",
  contactEmail: "",
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
        bedrooms: existing.bedrooms,
        bathrooms: existing.bathrooms,
        sizeSqft: existing.sizeSqft,
        amenities: existing.amenities ?? [],
        contactPhone: existing.contactPhone ?? "",
        contactEmail: existing.contactEmail ?? "",
      });
      setAmenitiesText((existing.amenities ?? []).join(", "));
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: PropertyFormValues = {
      ...form,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      sizeSqft: form.sizeSqft ? Number(form.sizeSqft) : undefined,
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

    if (isEdit && existing) {
      update.mutate(
        { property: existing, values, newFiles: files },
        {
          onSuccess: () => {
            toast.success("Listing updated and resubmitted for review.");
            navigate("/dashboard");
          },
          onError: (err) => toast.error((err as Error).message),
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
          onError: (err) => toast.error((err as Error).message),
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
                  min={0}
                  value={form.price || ""}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
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
                Full address (shown only after viewing fee)
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street, building, landmark"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min={0}
                  value={form.bedrooms}
                  onChange={(e) => set("bedrooms", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min={0}
                  value={form.bathrooms}
                  onChange={(e) => set("bathrooms", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size (sqft)</Label>
                <Input
                  id="size"
                  type="number"
                  min={0}
                  value={form.sizeSqft ?? ""}
                  onChange={(e) =>
                    set(
                      "sizeSqft",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
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

        <Card>
          <CardHeader>
            <CardTitle>Contact (shown after viewing fee)</CardTitle>
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
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {isEdit &&
                existing?.imageIds?.map((fileId) => (
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
                  </div>
                ))}
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
