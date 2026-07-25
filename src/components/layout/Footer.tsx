import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
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
            { to: "/", label: "Maintenance & Repairs (soon)" },
            { to: "/", label: "Mama Fua & Cleaning (soon)" },
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
      </div>
      <div className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Homiva. All rights reserved.</p>
          <p>Built for Kenyan homes.</p>
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
