import { useState } from "react";
import {
  BadgeCheck,
  Clock,
  FileText,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyLocationPicker } from "@/components/location/PropertyLocationPicker";
import { useAuth } from "@/context/AuthContext";
import {
  APPLICABLE_ROLES,
  KENYA_COUNTIES,
  ROLE_DOCUMENT_REQUIREMENTS,
  TEAMS,
} from "@/lib/config";
import { initials } from "@/lib/utils";
import {
  useApplyForRole,
  useMyApplications,
} from "@/hooks/useRoleApplications";
import type { ApplicationStatus } from "@/types/models";

const statusStyles: Record<
  ApplicationStatus,
  { variant: "success" | "warning" | "destructive" | "secondary"; label: string }
> = {
  approved: { variant: "success", label: "Approved" },
  pending: { variant: "warning", label: "Pending review" },
  rejected: { variant: "destructive", label: "Rejected" },
  suspended: { variant: "secondary", label: "Suspended" },
};

type RoleContactDetails = {
  phone?: string;
  county?: string;
  town?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
};

export default function ProfilePage() {
  const { user, profile, roles, isAdmin } = useAuth();
  const { data: applications } = useMyApplications();
  const apply = useApplyForRole();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [contactDetails, setContactDetails] = useState<
    Record<string, RoleContactDetails>
  >({});
  const [documentFiles, setDocumentFiles] = useState<
    Record<string, Record<string, File | undefined>>
  >({});

  const handleApply = (role: string, roleLabel: string) => {
    const contact = getContactForRole(role);
    const missingContact = [
      contact.phone,
      contact.county,
      contact.town,
      contact.address,
      contact.latitude,
      contact.longitude,
    ].some((value) => !value.trim());
    if (missingContact) {
      toast.error(
        "Add a contact phone, full address and pinned location before applying.",
      );
      return;
    }
    const requiredDocuments = ROLE_DOCUMENT_REQUIREMENTS[role] ?? [
      "National ID or passport",
    ];
    const uploadedForRole = documentFiles[role] ?? {};
    const missing = requiredDocuments.filter((label) => !uploadedForRole[label]);
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.join(", ")}.`);
      return;
    }

    apply.mutate(
      {
        role,
        roleLabel,
        message: messages[role],
        location: contact,
        documents: requiredDocuments.map((label) => ({
          label,
          file: uploadedForRole[label]!,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Application submitted for review.");
          setMessages((m) => ({ ...m, [role]: "" }));
          setContactDetails((details) => ({ ...details, [role]: {} }));
          setDocumentFiles((files) => ({ ...files, [role]: {} }));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  const setContact = (
    role: string,
    field: keyof RoleContactDetails,
    value: string,
  ) => {
    setContactDetails((current) => ({
      ...current,
      [role]: { ...(current[role] ?? {}), [field]: value },
    }));
  };

  const getContactForRole = (role: string) => {
    const details = contactDetails[role] ?? {};
    return {
      phone: details.phone ?? profile?.phone ?? "",
      county: details.county ?? "",
      town: details.town ?? "",
      address: details.address ?? "",
      latitude: details.latitude ?? "",
      longitude: details.longitude ?? "",
    };
  };

  const activeRoleLabels = [
    ...(isAdmin ? ["Administrator"] : []),
    ...APPLICABLE_ROLES.filter((r) => roles.includes(r.team)).map((r) => r.label),
  ];

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 text-xl">
            <AvatarFallback>{initials(profile?.name ?? user?.name)}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{profile?.name ?? user?.name}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {activeRoleLabels.length > 0 ? (
                activeRoleLabels.map((label) => (
                  <Badge key={label} variant="success">
                    <BadgeCheck className="mr-1 h-3 w-3" />
                    {label}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">Normal User</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role applications */}
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Roles &amp; Applications</h2>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Apply for additional roles on your single Homiva account. Each role is
        activated independently after admin approval.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {APPLICABLE_ROLES.map((role) => {
          const active = roles.includes(role.team);
          const latest = applications?.find((a) => a.role === role.team);
          const pending = latest?.status === "pending";
          const requiredDocuments = ROLE_DOCUMENT_REQUIREMENTS[role.team] ?? [];
          const filesForRole = documentFiles[role.team] ?? {};
          const contact = getContactForRole(role.team);
          const missingContact = [
            contact.phone,
            contact.county,
            contact.town,
            contact.address,
            contact.latitude,
            contact.longitude,
          ].some((value) => !value.trim());
          const missingDocuments = requiredDocuments.some(
            (label) => !filesForRole[label],
          );

          return (
            <Card key={role.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{role.label}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                  {active && (
                    <Badge variant="success" className="shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {active ? (
                  <p className="flex items-center gap-2 text-sm text-primary">
                    <BadgeCheck className="h-4 w-4" /> This role is active on your
                    account.
                  </p>
                ) : pending ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> Application under review.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Tell us why you'd like this role (optional)"
                      value={messages[role.team] ?? ""}
                      onChange={(e) =>
                        setMessages((m) => ({ ...m, [role.team]: e.target.value }))
                      }
                      rows={2}
                    />
                    <div className="space-y-3 rounded-md border bg-secondary/30 p-3">
                      <p className="text-sm font-medium">
                        Verification contact and physical location
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`role-phone-${role.key}`}>
                            Phone number
                          </Label>
                          <Input
                            id={`role-phone-${role.key}`}
                            value={contact.phone}
                            onChange={(e) =>
                              setContact(role.team, "phone", e.target.value)
                            }
                            placeholder="+2547..."
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>County</Label>
                          <Select
                            value={contact.county}
                            onValueChange={(value) =>
                              setContact(role.team, "county", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select county" />
                            </SelectTrigger>
                            <SelectContent>
                              {KENYA_COUNTIES.map((county) => (
                                <SelectItem key={county} value={county}>
                                  {county}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`role-town-${role.key}`}>
                            Town / Area
                          </Label>
                          <Input
                            id={`role-town-${role.key}`}
                            value={contact.town}
                            onChange={(e) =>
                              setContact(role.team, "town", e.target.value)
                            }
                            placeholder="Kilimani"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`role-address-${role.key}`}>
                            Full address
                          </Label>
                          <Input
                            id={`role-address-${role.key}`}
                            value={contact.address}
                            onChange={(e) =>
                              setContact(role.team, "address", e.target.value)
                            }
                            placeholder="Street, building, landmark"
                            required
                          />
                        </div>
                      </div>
                      <PropertyLocationPicker
                        id={`role-location-${role.key}`}
                        size="prominent"
                        defaultOpen
                        latitude={contact.latitude}
                        longitude={contact.longitude}
                        searchHint={[
                          contact.address,
                          contact.town,
                          contact.county,
                          "Kenya",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        onChange={({ latitude, longitude, formattedAddress }) =>
                          setContactDetails((current) => ({
                            ...current,
                            [role.team]: {
                              ...(current[role.team] ?? {}),
                              latitude,
                              longitude,
                              address:
                                formattedAddress ??
                                current[role.team]?.address ??
                                "",
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Required verification documents
                      </p>
                      {requiredDocuments.map((label, index) => {
                        const file = filesForRole[label];
                        const inputId = `role-doc-${role.key}-${index}`;

                        return (
                          <div
                            key={label}
                            className="flex items-center gap-3 rounded-md border bg-secondary/30 p-3"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-medium">
                                {label}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {file ? file.name : "PDF, JPEG, PNG or WEBP"}
                              </p>
                            </div>
                            {file ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() =>
                                  setDocumentFiles((current) => ({
                                    ...current,
                                    [role.team]: {
                                      ...(current[role.team] ?? {}),
                                      [label]: undefined,
                                    },
                                  }))
                                }
                                aria-label={`Remove ${label}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <label
                                htmlFor={inputId}
                                className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground"
                              >
                                <Upload className="h-4 w-4" />
                                Upload
                              </label>
                            )}
                            <input
                              id={inputId}
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setDocumentFiles((current) => ({
                                  ...current,
                                  [role.team]: {
                                    ...(current[role.team] ?? {}),
                                    [label]: file,
                                  },
                                }));
                                event.target.value = "";
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApply(role.team, role.label)}
                      disabled={apply.isPending || missingDocuments || missingContact}
                    >
                      Apply for role
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Application history */}
      {applications && applications.length > 0 && (
        <>
          <Separator className="my-8" />
          <h2 className="mb-4 text-xl font-semibold">Application history</h2>
          <div className="space-y-2">
            {applications.map((a) => {
              const style = statusStyles[a.status];
              return (
                <Card key={a.$id}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium">{a.roleLabel}</p>
                      {a.reviewNote && (
                        <p className="text-sm text-muted-foreground">
                          Note: {a.reviewNote}
                        </p>
                      )}
                    </div>
                    <Badge variant={style.variant}>
                      {a.status === "rejected" && (
                        <XCircle className="mr-1 h-3 w-3" />
                      )}
                      {style.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {roles.includes(TEAMS.admins) && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          You have administrator access.{" "}
          <a href="/admin" className="font-medium text-primary hover:underline">
            Open the admin dashboard
          </a>
          .
        </p>
      )}
    </div>
  );
}
