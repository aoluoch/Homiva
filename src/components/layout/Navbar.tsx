import { Link, NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useState } from "react";
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

const navLinks = [
  { to: "/properties?type=sale", label: "Buy" },
  { to: "/properties?type=rent", label: "Rent" },
  { to: "/properties?type=airbnb", label: "Airbnb" },
  { to: "/services", label: "Services" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/partners", label: "Partners" },
];

export function Navbar() {
  const { user, profile, roles, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-2xl font-black tracking-tight text-foreground"
            aria-label="Homiva home"
          >
            Homiva
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    isActive && "bg-secondary text-secondary-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to="/properties"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              All Properties
            </NavLink>
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
          {user ? (
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
            <div className="hidden items-center gap-2 sm:flex">
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
            className="md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background/95 md:hidden">
          <nav className="container flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <ShoppingCart className="mr-2 inline h-4 w-4" />
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
            <Link
              to="/properties"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <Building2 className="mr-2 inline h-4 w-4" />
              All Properties
            </Link>
            {!user && (
              <div className="mt-2 flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild variant="accent">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
