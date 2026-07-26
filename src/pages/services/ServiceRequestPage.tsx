import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SERVICE_CATEGORIES,
  SERVICE_SIZE_TIERS,
  SERVICE_URGENCY,
  PROPERTY_TYPES,
  KENYA_COUNTIES,
  type ServiceSizeKey,
  type ServiceUrgencyKey,
} from "@/lib/config";
import { serviceIcon } from "@/lib/serviceIcons";
import { estimatePrice } from "@/lib/servicePricing";
import { cn, formatKES } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCreateServiceRequest } from "@/hooks/useServices";
import { PropertyLocationPicker } from "@/components/location/PropertyLocationPicker";

const STEPS = [
  "Service",
  "Property",
  "Size",
  "Problem",
  "Photos",
  "Urgency",
  "Review",
];

export default function ServiceRequestPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const create = useCreateServiceRequest();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [propertyType, setPropertyType] = useState("");
  const [size, setSize] = useState<ServiceSizeKey | "">("");
  const [problem, setProblem] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [urgency, setUrgency] = useState<ServiceUrgencyKey | "">("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phone, setPhone] = useState("");

  const activeCategory = SERVICE_CATEGORIES.find((c) => c.key === category);

  const estimate = useMemo(() => {
    if (!category || !size || !urgency) return null;
    return estimatePrice({
      categoryKey: category,
      size: size as ServiceSizeKey,
      urgency: urgency as ServiceUrgencyKey,
      photoCount: files.length,
    });
  }, [category, size, urgency, files.length]);

  const canNext = () => {
    switch (step) {
      case 0:
        return !!category;
      case 1:
        return !!propertyType;
      case 2:
        return !!size;
      case 3:
        return !!problem;
      case 4:
        return true; // photos optional
      case 5:
        return !!urgency;
      default:
        return true;
    }
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...list].slice(0, 6));
  };

  const submit = async () => {
    if (!user) {
      toast.error("Please log in to submit a request.");
      navigate("/login");
      return;
    }
    if (!estimate) return;
    if (
      !phone.trim() ||
      !county.trim() ||
      !town.trim() ||
      !address.trim() ||
      !latitude.trim() ||
      !longitude.trim()
    ) {
      toast.error(
        "Add a contact phone, full address and pinned location before submitting.",
      );
      return;
    }
    try {
      await create.mutateAsync({
        values: {
          category,
          problem,
          description,
          propertyType,
          size,
          urgency,
          county,
          town,
          address,
          latitude,
          longitude,
          contactPhone: phone,
          estimatedMin: estimate.min,
          estimatedMax: estimate.max,
          emergency: urgency === "emergency",
        },
        files,
      });
      toast.success("Request submitted! Homiva will review and schedule it shortly.");
      navigate("/services/requests");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      <button
        onClick={() => navigate("/services")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to services
      </button>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                i < step && "border-primary bg-primary text-primary-foreground",
                i === step && "border-primary text-primary",
                i > step && "border-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded",
                  i < step ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-bold">{STEPS[step]}</h2>

        {/* Step 0: Service */}
        {step === 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              What do you need help with?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICE_CATEGORIES.map((c) => {
                const Icon = serviceIcon(c.icon);
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      setCategory(c.key);
                      setProblem("");
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      category === c.key
                        ? "border-primary bg-primary/5"
                        : "hover:bg-secondary",
                    )}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">
                        {c.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        From {formatKES(c.baseFee)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 1: Property type */}
        {step === 1 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              What type of property is this for?
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setPropertyType(t)}
                  className={cn(
                    "rounded-lg border p-3 text-sm font-medium transition-colors",
                    propertyType === t
                      ? "border-primary bg-primary/5"
                      : "hover:bg-secondary",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Size */}
        {step === 2 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              How big is the space? This affects the estimate.
            </p>
            <div className="grid gap-3">
              {SERVICE_SIZE_TIERS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSize(s.key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                    size === s.key
                      ? "border-primary bg-primary/5"
                      : "hover:bg-secondary",
                  )}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    x{s.multiplier}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Problem */}
        {step === 3 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Choose the problem category and add any details.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeCategory?.problems.map((p) => (
                <button
                  key={p}
                  onClick={() => setProblem(p)}
                  className={cn(
                    "rounded-lg border p-3 text-sm font-medium transition-colors",
                    problem === p
                      ? "border-primary bg-primary/5"
                      : "hover:bg-secondary",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="desc">Additional details (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue, access notes, preferred time..."
                className="mt-1"
              />
            </div>
          </>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Add up to 6 photos so Homiva understands the job (optional).
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center hover:bg-secondary">
              <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Click to upload photos</span>
              <span className="text-xs text-muted-foreground">
                JPG or PNG, up to 6 images
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFiles}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 5: Urgency */}
        {step === 5 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              How soon do you need this done?
            </p>
            <div className="grid gap-3">
              {SERVICE_URGENCY.map((u) => (
                <button
                  key={u.key}
                  onClick={() => setUrgency(u.key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                    urgency === u.key
                      ? "border-primary bg-primary/5"
                      : "hover:bg-secondary",
                  )}
                >
                  <span className="text-sm font-medium">{u.label}</span>
                  {u.surcharge > 0 && (
                    <span className="text-xs text-accent">
                      +{Math.round(u.surcharge * 100)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 6: Review + estimate */}
        {step === 6 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Review your request and confirm your location.
            </p>
            {estimate && (
              <div className="mb-6 rounded-xl border bg-primary/5 p-5 text-center">
                <p className="text-sm text-muted-foreground">Estimated price</p>
                <p className="text-3xl font-bold text-primary">
                  {formatKES(estimate.min)} - {formatKES(estimate.max)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Final price is confirmed by the provider after review.
                </p>
              </div>
            )}
            <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
              <Detail label="Service" value={activeCategory?.label} />
              <Detail label="Property" value={propertyType} />
              <Detail
                label="Size"
                value={SERVICE_SIZE_TIERS.find((s) => s.key === size)?.label}
              />
              <Detail label="Problem" value={problem} />
              <Detail
                label="Urgency"
                value={SERVICE_URGENCY.find((u) => u.key === urgency)?.label}
              />
              <Detail label="Photos" value={`${files.length} attached`} />
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>County</Label>
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select county" />
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
              <div>
                <Label htmlFor="town">Town / Area</Label>
                <Input
                  id="town"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Kilimani"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="phone">Contact phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  placeholder="+2547..."
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Full address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                  placeholder="Street, building, landmark"
                  required
                />
              </div>
              <PropertyLocationPicker
                id="service-location"
                className="sm:col-span-2"
                latitude={latitude}
                longitude={longitude}
                searchHint={[address, town, county, "Kenya"]
                  .filter(Boolean)
                  .join(", ")}
                onChange={({ latitude, longitude, formattedAddress }) => {
                  setLatitude(latitude);
                  setLongitude(longitude);
                  if (formattedAddress) setAddress(formattedAddress);
                }}
              />
            </div>
          </>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={
                create.isPending ||
                !estimate ||
                !phone.trim() ||
                !county.trim() ||
                !town.trim() ||
                !address.trim() ||
                !latitude.trim() ||
                !longitude.trim()
              }
            >
              {create.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Submit request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}
