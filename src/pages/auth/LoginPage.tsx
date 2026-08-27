import * as React from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { requestEmailOtp, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState("");
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";
  const codeSent = Boolean(userId);

  const sendCode = async () => {
    const token = await requestEmailOtp(email.trim());
    setUserId(token.userId);
    setSecurityPhrase(token.phrase);
    setCode("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!codeSent) {
        await sendCode();
        toast.success("We sent a one-time code to your email.");
        return;
      }

      await verifyEmailOtp(userId, code.trim());
      toast.success("Welcome back to Homiva.");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Could not complete login.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      await sendCode();
      toast.success("We sent a fresh one-time code.");
    } catch (err) {
      toast.error((err as Error).message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-[1fr_440px]">
        <div className="hidden max-w-2xl lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            Passwordless Homiva
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.02] text-foreground">
            Walk back into your home desk with one email code.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            Your saved homes, service requests, trips, store orders and listing
            tools stay behind a short-lived Appwrite OTP.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
            <AuthMetric value="15 min" label="Code lifetime" />
            <AuthMetric value="0" label="Passwords to remember" />
          </div>
        </div>

        <div className="auth-panel">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              to="/"
              className="text-2xl font-black tracking-tight text-foreground"
              aria-label="Homiva home"
            >
              Homiva
            </Link>
            <span className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Secure OTP
            </span>
          </div>

          <div>
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
              {codeSent ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <h2 className="text-2xl font-bold">
              {codeSent ? "Check your inbox" : "Log in without a password"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {codeSent
                ? `Enter the one-time code sent to ${email}. Check spam or promotions if it does not land in your inbox.`
                : "Use the email connected to your Homiva account."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                disabled={codeSent}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {codeSent && (
              <>
                {securityPhrase && (
                  <div className="rounded-md border bg-secondary/50 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      Security phrase
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Match this phrase with the one in your email:{" "}
                      <span className="font-semibold text-primary">
                        {securityPhrase}
                      </span>
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="code">One-time code</Label>
                  <Input
                    id="code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter the code from your email"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : codeSent ? (
                <>
                  Verify and enter <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Send login code <Mail className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {codeSent && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={resendCode}
              >
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setUserId("");
                  setSecurityPhrase("");
                  setCode("");
                }}
              >
                Use another email
              </Button>
            </div>
          )}

          <div className="mt-7 flex items-start gap-3 rounded-md border bg-secondary/50 p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              New to Homiva?{" "}
              <Link to="/register" className="font-medium text-primary">
                Create your profile
              </Link>{" "}
              and keep the same OTP sign-in. Using Homiva means you accept the{" "}
              <Link to="/terms" className="font-medium text-primary">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium text-primary">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border bg-card/80 p-4 shadow-sm">
      <p className="text-2xl font-black text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
