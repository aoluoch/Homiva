import { useEffect, useState } from "react";
import { BadgeCheck, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import {
  KENYA_COUNTIES,
  PARTNER_CATEGORIES,
  PARTNER_ROLE_CATEGORY,
  SUBSCRIPTION_PLANS,
  TEAMS,
} from "@/lib/config";
import { filePreview } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { cn, formatKES } from "@/lib/utils";
import {
  useDeletePartnerPortfolioImage,
  useMyPartnerCompany,
  usePartnerPortfolio,
  useSavePartnerCompany,
  useSubscribePartnerCompany,
  useUploadPartnerPortfolio,
} from "@/hooks/usePartners";
import type { PartnerCompanyInput } from "@/hooks/usePartners";

const PARTNER_TEAMS = [TEAMS.movers, TEAMS.cleaningCompanies, TEAMS.interiorDesigners];

function fileUrl(fileId?: string, width = 320, height = 240) {
  if (!fileId) return null;
  return filePreview(appwriteConfig.buckets.storeAssets, fileId, { width, height });
}

export default function PartnerDashboardPage() {
  const { roles } = useAuth();
  const { data: company, isLoading } = useMyPartnerCompany();
  const hasPartnerRole = PARTNER_TEAMS.some((team) => roles.includes(team));

  if (!hasPartnerRole) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={BadgeCheck}
          title="Partner approval required"
          description="Apply for a moving, cleaning company, or interior design role from your profile first."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="h-64 p-6" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Partner Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your company profile, portfolio and monthly publication plan.
        </p>
      </div>
      <ProfileForm company={company} />
      {company && (
        <>
          <SubscriptionPanel company={company} />
          <PortfolioPanel company={company} />
        </>
      )}
    </div>
  );
}

function ProfileForm({ company }: { company?: import("@/types/models").PartnerCompany | null }) {
  const { roles } = useAuth();
  const save = useSavePartnerCompany();
  const [values, setValues] = useState<PartnerCompanyInput>({
    name: "",
    description: "",
    phone: "",
    email: "",
    county: "Nairobi",
    town: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);

  useEffect(() => {
    if (!company) return;
    setValues({
      name: company.name ?? "",
      description: company.description ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      county: company.county ?? "Nairobi",
      town: company.town ?? "",
    });
  }, [company]);

  const role = PARTNER_TEAMS.find((team) => roles.includes(team));
  const category = role ? PARTNER_ROLE_CATEGORY[role] : undefined;

  const set = <K extends keyof PartnerCompanyInput>(key: K, value: PartnerCompanyInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    save.mutate(
      { existing: company, values, logo, banner },
      {
        onSuccess: () => {
          toast.success(company ? "Partner profile updated." : "Partner profile submitted for approval.");
          setLogo(null);
          setBanner(null);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">Company Profile</h2>
          {company && <Badge variant={company.status === "approved" ? "success" : "warning"}>{company.status}</Badge>}
          {company?.subscriptionStatus === "active" && <Badge variant="success">published</Badge>}
          {category && (
            <Badge variant="secondary">
              {PARTNER_CATEGORIES.find((item) => item.key === category)?.label}
            </Badge>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>Company name</Label>
          <Input value={values.name} onChange={(e) => set("name", e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            className="mt-1"
            rows={4}
          />
        </div>
        <div>
          <Label>County</Label>
          <select
            value={values.county}
            onChange={(e) => set("county", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {KENYA_COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Town</Label>
          <Input value={values.town} onChange={(e) => set("town", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={values.email} onChange={(e) => set("email", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Logo</Label>
          <Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="mt-1" />
        </div>
        <div>
          <Label>Banner</Label>
          <Input type="file" accept="image/*" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {company ? "Save profile" : "Submit profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionPanel({ company }: { company: import("@/types/models").PartnerCompany }) {
  const subscribe = useSubscribePartnerCompany();
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <Card
          key={plan.key}
          className={cn(company.plan === plan.key && "border-primary ring-1 ring-primary")}
        >
          <CardContent className="p-6">
            <h3 className="text-lg font-bold">{plan.label}</h3>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatKES(plan.price)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={company.plan === plan.key && company.subscriptionStatus === "active" ? "outline" : "default"}
              disabled={subscribe.isPending || (company.plan === plan.key && company.subscriptionStatus === "active")}
              onClick={() => subscribe.mutate({ partnerCompanyId: company.$id, plan: plan.key }, {
                onSuccess: () => toast.success("Subscription activated."),
                onError: (err) => toast.error((err as Error).message),
              })}
            >
              {company.plan === plan.key && company.subscriptionStatus === "active" ? "Current plan" : "Choose plan"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortfolioPanel({ company }: { company: import("@/types/models").PartnerCompany }) {
  const { data } = usePartnerPortfolio(company.$id);
  const upload = useUploadPartnerPortfolio();
  const del = useDeletePartnerPortfolioImage();
  const [files, setFiles] = useState<File[]>([]);

  const submit = () => {
    if (files.length === 0) return;
    upload.mutate(
      { partner: company, files },
      {
        onSuccess: () => {
          toast.success("Portfolio uploaded.");
          setFiles([]);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Portfolio</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
            />
            <Button onClick={submit} disabled={upload.isPending || files.length === 0}>
              <ImagePlus className="h-4 w-4" /> Upload
            </Button>
          </div>
        </div>
        {data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((image) => (
              <div key={image.$id} className="relative">
                <img
                  src={fileUrl(image.fileId, 500, 360) ?? ""}
                  alt=""
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute right-2 top-2 h-8 w-8 bg-background/90"
                  onClick={() => del.mutate(image.$id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Upload images of completed work so customers can inspect your style.</p>
        )}
      </CardContent>
    </Card>
  );
}
