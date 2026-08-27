import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex text-2xl font-black tracking-tight text-foreground"
            aria-label="Homiva home"
          >
            Homiva
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Your complete home companion. Discover properties, manage homes and
            access trusted home services across Kenya.
          </p>
        </div>
        <FooterCol
          title="Real Estate"
          links={[
            { to: "/properties?type=sale", label: "Homes for sale" },
            { to: "/properties?type=rent", label: "Long-term rentals" },
            { to: "/properties?type=airbnb", label: "Airbnb & short stays" },
            { to: "/properties", label: "Search properties" },
          ]}
        />
        <FooterCol
          title="Services"
          links={[
            {
              to: "/services/request?category=repairs",
              label: "Maintenance & Repairs",
            },
            {
              to: "/services/request?category=cleaning",
              label: "Mama Fua & Cleaning",
            },
            { to: "/services", label: "All home services" },
            { to: "/services/request", label: "Request a service" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: "/profile", label: "Profile & roles" },
            { to: "/saved", label: "Saved properties" },
            { to: "/dashboard", label: "List a property" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { to: "/privacy", label: "Privacy policy" },
            { to: "/terms", label: "Terms & conditions" },
          ]}
        />
      </div>
      <div className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Homiva. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span>Built for Kenyan homes.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2">
        {links.map((link, i) => (
          <li key={i}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
