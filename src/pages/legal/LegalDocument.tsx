import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="container max-w-3xl py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
        Homiva
      </p>
      <h1 className="mt-3 text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated 27 August 2026. These pages describe Homiva as it works
        today in Kenya.
      </p>
      <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/90">
        {children}
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        Questions? Open{" "}
        <Link to="/messages" className="font-medium text-primary">
          Messages
        </Link>{" "}
        from your account, or raise a dispute from an order, booking or service
        request.
      </p>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
