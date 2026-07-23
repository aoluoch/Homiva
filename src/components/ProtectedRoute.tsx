import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

function FullPageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/** Requires an authenticated session. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Requires membership in at least one of the given role teams. */
export function RoleRoute({ anyOf }: { anyOf: string[] }) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (!anyOf.some((r) => roles.includes(r)))
    return <Navigate to="/profile" replace />;
  return <Outlet />;
}
