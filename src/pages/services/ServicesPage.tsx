import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICE_CATEGORIES } from "@/lib/config";
import { serviceIcon } from "@/lib/serviceIcons";
import { formatKES } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const steps = [
  {
    icon: ClipboardList,
    title: "Describe the job",
    body: "Pick a service, property type, size, problem and urgency, then add photos.",
  },
  {
    icon: Wallet,
    title: "Get an instant estimate",
    body: "See a transparent price range up front - no surprises, no AI guesswork.",
  },
  {
    icon: ShieldCheck,
    title: "Verified pros deliver",
    body: "A vetted provider accepts, completes the work, and you pay securely.",
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="container py-8">
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary to-background p-8 md:p-12">
        <h1 className="max-w-2xl text-3xl font-bold md:text-4xl">
          Home services you can trust, on demand
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Cleaning, repairs, plumbing, electrical, movers and more - request a
          verified professional and get an upfront price estimate in minutes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => navigate("/services/request")}>
            Request a service <ArrowRight className="h-4 w-4" />
          </Button>
          {user && (
            <Button size="lg" variant="outline" asChild>
              <Link to="/services/requests">My requests</Link>
            </Button>
          )}
        </div>
      </section>

      <h2 className="mb-4 text-2xl font-bold">Browse services</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SERVICE_CATEGORIES.map((cat) => {
          const Icon = serviceIcon(cat.icon);
          return (
            <Link key={cat.key} to={`/services/request?category=${cat.key}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      From {formatKES(cat.baseFee)}
                    </p>
                  </div>
                  <p className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                    Request <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-6 mt-12 text-2xl font-bold">How it works</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.title} className="rounded-xl border bg-card p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-accent">
              <s.icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
