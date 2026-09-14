import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  User as UserIcon,
  Clock,
  Wrench,
  Store,
  CalendarCheck,
  Bell,
  MessagesSquare,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { cn, initials } from "@/lib/utils";
import { APPLICABLE_ROLES, TEAMS, appwriteConfig } from "@/lib/config";
import { filePreview } from "@/lib/appwrite";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useCart } from "@/context/CartContext";
import { Logo } from "./Logo";

const propertyNavLinks = [
  { to: "/properties?type=sale", label: "Buy", type: "sale" },
  { to: "/properties?type=rent", label: "Rent", type: "rent" },
  { to: "/properties?type=airbnb", label: "Airbnb", type: "airbnb" },
] as const;

const otherNavLinks = [
  { to: "/services", label: "Services" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/partners", label: "Partners" },
] as const;

function navItemClass(active: boolean) {
  return cn(
    "rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-3",
    active && "bg-secondary text-secondary-foreground",
  );
}

export function Navbar() {
  const { user, profile, roles, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const listingType = new URLSearchParams(location.search).get("type");
  const onPropertyIndex = location.pathname === "/properties";
  const allPropertiesActive = onPropertyIndex && !listingType;

  const canManageListings = APPLICABLE_ROLES.some(
    (r) =>
      ["agents", "landlords", "airbnbOwners"].includes(r.key) &&
      roles.includes(r.team),
  );
  const isPartner = [TEAMS.movers, TEAMS.cleaningCompanies, TEAMS.interiorDesigners].some((team) =>
    roles.includes(team),
  );
  const { data: unread = 0 } = useUnreadCount();
  const { count: cartCount } = useCart();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const avatarUrl = profile?.avatarFileId
    ? filePreview(appwriteConfig.buckets.avatars, profile.avatarFileId, {
        width: 80,
        height: 80,
      })
    : undefined;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/[0.92] shadow-[0_1px_0_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-background/[0.86]">
      <div className="container flex h-16 min-w-0 items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <Logo size="nav" />
          <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1">
            {propertyNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={navItemClass(onPropertyIndex && listingType === link.type)}
              >
                {link.label}
              </Link>
            ))}
            {otherNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => navItemClass(isActive)}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/properties" className={navItemClass(allPropertiesActive)}>
              All Properties
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Link to="/cart" aria-label="Shopping cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </Button>
          {loading ? (
            <div
              className="hidden h-10 w-10 animate-pulse rounded-full bg-secondary sm:block"
              aria-hidden
            />
          ) : user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative hidden sm:inline-flex"
              >
                <Link to="/notifications" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
              >
                <Link to="/saved" aria-label="Saved properties">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar>
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                      <AvatarFallback>
                        {initials(profile?.name ?? user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="truncate">
                        {profile?.name ?? user.name}
                      </span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon /> Profile &amp; Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/saved")}>
                    <Heart /> Saved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/recently-viewed")}>
                    <Clock /> Recently Viewed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/messages")}>
                    <MessagesSquare /> Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders")}>
                    <ShoppingBag /> My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/cart")}>
                    <ShoppingCart /> Cart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/services/requests")}>
                    <Wrench /> My Service Requests
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/trips")}>
                    <CalendarCheck /> My Trips
                  </DropdownMenuItem>
                  {isPartner && (
                    <DropdownMenuItem onClick={() => navigate("/partner")}>
                      <Store /> Partner Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {canManageListings && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard /> Owner Dashboard
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button asChild variant="ghost">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild variant="accent">
                <Link to="/register">Get started</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t bg-background/95 lg:hidden">
          <nav className="container flex flex-col gap-1 py-3">
            {propertyNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={navItemClass(onPropertyIndex && listingType === link.type)}
              >
                {link.label}
              </Link>
            ))}
            {otherNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/cart"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <ShoppingCart className="mr-2 inline h-4 w-4" />
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
            <Link
              to="/properties"
              className={navItemClass(allPropertiesActive)}
            >
              <Building2 className="mr-2 inline h-4 w-4" />
              All Properties
            </Link>
            {!loading && user && (
              <>
                <Link
                  to="/notifications"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Bell className="mr-2 inline h-4 w-4" />
                  Notifications
                  {unread > 0 ? ` (${unread > 9 ? "9+" : unread})` : ""}
                </Link>
                <Link
                  to="/saved"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Heart className="mr-2 inline h-4 w-4" />
                  Saved
                </Link>
                <Link
                  to="/messages"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <MessagesSquare className="mr-2 inline h-4 w-4" />
                  Messages
                </Link>
                <Link
                  to="/profile"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <UserIcon className="mr-2 inline h-4 w-4" />
                  Profile &amp; Roles
                </Link>
                {canManageListings && (
                  <Link
                    to="/dashboard"
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    <LayoutDashboard className="mr-2 inline h-4 w-4" />
                    Owner Dashboard
                  </Link>
                )}
                {isPartner && (
                  <Link
                    to="/partner"
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    <Store className="mr-2 inline h-4 w-4" />
                    Partner Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    <Shield className="mr-2 inline h-4 w-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
            {!loading && !user && (
              <div className="mt-2 flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild variant="accent">
                  <Link to="/register">Get started</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
