import { useState } from "react";
import { BadgeCheck, Clock, ShieldCheck, XCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { APPLICABLE_ROLES, TEAMS } from "@/lib/config";
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

export default function ProfilePage() {
  const { user, profile, roles, isAdmin } = useAuth();
  const { data: applications } = useMyApplications();
  const apply = useApplyForRole();
  const [messages, setMessages] = useState<Record<string, string>>({});

  const handleApply = (role: string, roleLabel: string) => {
    apply.mutate(
      { role, roleLabel, message: messages[role] },
      {
        onSuccess: () => {
          toast.success("Application submitted for review.");
          setMessages((m) => ({ ...m, [role]: "" }));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
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
                    <Button
                      size="sm"
                      onClick={() => handleApply(role.team, role.label)}
                      disabled={apply.isPending}
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
