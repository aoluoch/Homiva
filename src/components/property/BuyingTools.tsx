import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/context/AuthContext";
import {
  useCreateMortgageEnquiry,
  useCreateViewingRequest,
  useMyViewingRequests,
} from "@/hooks/useBuying";
import {
  MORTGAGE_DEFAULT_DEPOSIT_PCT,
  MORTGAGE_DEFAULT_RATE,
  MORTGAGE_TERMS,
  monthlyRepayment,
} from "@/lib/config";
import { toDateKey } from "@/lib/booking";
import { formatKES } from "@/lib/utils";
import type { Property } from "@/types/models";

export function MortgageCalculator({ property }: { property: Property }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const enquire = useCreateMortgageEnquiry();
  const [depositPct, setDepositPct] = useState(MORTGAGE_DEFAULT_DEPOSIT_PCT * 100);
  const [termYears, setTermYears] = useState<number>(MORTGAGE_TERMS[2] ?? 15);
  const [income, setIncome] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState("");

  const price = Number(property.price || 0);
  const deposit = Math.max(0, Math.round((price * depositPct) / 100));
  const loanAmount = Math.max(0, price - deposit);
  const repayment = useMemo(
    () => monthlyRepayment(loanAmount, MORTGAGE_DEFAULT_RATE, termYears),
    [loanAmount, termYears],
  );

  const submit = () => {
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: `/properties/${property.$id}` } },
      });
      return;
    }
    enquire.mutate(
      {
        property,
        deposit,
        loanAmount,
        termYears,
        interestRate: MORTGAGE_DEFAULT_RATE,
        monthlyRepayment: repayment,
        monthlyIncome: income ? Number(income) : undefined,
        phone,
        message,
      },
      {
        onSuccess: () => {
          toast.success("Mortgage enquiry sent to Homiva.");
          setMessage("");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Mortgage calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Indicative repayment at {MORTGAGE_DEFAULT_RATE}% a year. This is not a
          loan offer.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deposit">Deposit (%)</Label>
            <Input
              id="deposit"
              type="number"
              min={0}
              max={90}
              value={depositPct}
              onChange={(e) => setDepositPct(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select
              value={String(termYears)}
              onValueChange={(value) => setTermYears(Number(value))}
            >
              <SelectTrigger aria-label="Mortgage term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MORTGAGE_TERMS.map((years) => (
                  <SelectItem key={years} value={String(years)}>
                    {years} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span className="font-medium">{formatKES(deposit)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Loan</span>
            <span className="font-medium">{formatKES(loanAmount)}</span>
          </div>
          <div className="mt-2 flex justify-between font-semibold">
            <span>Est. monthly</span>
            <span className="text-primary">{formatKES(Math.round(repayment))}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="income">Monthly income (optional)</Label>
          <Input
            id="income"
            type="number"
            min={0}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="KES"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mortgage-phone">Phone</Label>
          <Input
            id="mortgage-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2547..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mortgage-note">Note (optional)</Label>
          <Textarea
            id="mortgage-note"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell Homiva how you'd like to proceed."
          />
        </div>
        <Button className="w-full" onClick={submit} disabled={enquire.isPending}>
          {enquire.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send mortgage enquiry
        </Button>
      </CardContent>
    </Card>
  );
}

export function ViewingRequestCard({ property }: { property: Property }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const create = useCreateViewingRequest();
  const { data: mine } = useMyViewingRequests();
  const alreadyRequested = mine?.some(
    (request) =>
      request.propertyId === property.$id &&
      request.status !== "declined" &&
      request.status !== "completed",
  );
  const tomorrow = addCalendarDays(1);
  const [preferredDate, setPreferredDate] = useState(tomorrow);
  const [alternateDate, setAlternateDate] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: `/properties/${property.$id}` } },
      });
      return;
    }
    create.mutate(
      {
        property,
        preferredDate,
        alternateDate: alternateDate || undefined,
        phone,
        message,
      },
      {
        onSuccess: () => {
          toast.success("Viewing request sent to Homiva.");
          setMessage("");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-primary" />
          Request a viewing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alreadyRequested ? (
          <p className="text-sm text-muted-foreground">
            You already have an open viewing request for this listing. Homiva
            will confirm the time.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Suggest a day for Homiva to arrange a visit. This does not unlock
              the address.
            </p>
            <div className="space-y-2">
              <Label htmlFor="view-date">Preferred date</Label>
              <Input
                id="view-date"
                type="date"
                min={tomorrow}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-alt">Alternate date (optional)</Label>
              <Input
                id="view-alt"
                type="date"
                min={tomorrow}
                value={alternateDate}
                onChange={(e) => setAlternateDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-phone">Phone</Label>
              <Input
                id="view-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2547..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-note">Note (optional)</Label>
              <Textarea
                id="view-note"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any timing or access notes."
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Request viewing
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function addCalendarDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}
