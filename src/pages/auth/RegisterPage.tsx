import * as React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  KeyRound,
  Loader2,
  Mail,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { requestEmailOtp, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState("");
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [loading, setLoading] = useState(false);

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
        toast.success("Your Homiva code is on its way.");
        return;
      }

      await verifyEmailOtp(userId, code.trim(), name);
      toast.success("Your Homiva profile is ready.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      await sendCode();
      toast.success("We sent a fresh Homiva code.");
    } catch (err) {
      toast.error((err as Error).message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-[440px_1fr]">
        <div className="auth-panel order-2 lg:order-1">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              to="/"
              className="text-2xl font-black tracking-tight text-foreground"
              aria-label="Homiva home"
            >
              Homiva
            </Link>
            <span className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              No password
            </span>
          </div>

          <div>
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
              {codeSent ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <h2 className="text-2xl font-bold">
              {codeSent ? "Confirm your email" : "Create your Homiva profile"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {codeSent
                ? `Enter the OTP sent to ${email}. Check spam or promotions if it does not land in your inbox.`
                : "Start with your name and email. Appwrite will send the OTP that creates your session."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                disabled={codeSent}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Wanjiru"
                autoComplete="name"
              />
            </div>

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
                  Verify and continue <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Send signup code <Mail className="h-4 w-4" />
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
                Edit details
              </Button>
            </div>
          )}

          <p className="mt-7 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary">
              Log in with OTP
            </Link>
          </p>
        </div>

        <div className="order-1 hidden lg:block lg:order-2">
          <div className="auth-story-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              One key for the whole home
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-black leading-[1.02] text-foreground">
              Buy, host, book services and run a storefront from one profile.
            </h1>
            <div className="mt-8 grid max-w-2xl gap-3">
              {[
                "Save properties and compare shortlists.",
                "Apply for owner, agent, provider or store roles.",
                "Track bookings, requests, messages and orders.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border bg-card/80 p-4 shadow-sm"
                >
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
