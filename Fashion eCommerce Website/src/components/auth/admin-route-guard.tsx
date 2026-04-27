import { Navigate, Outlet, useLocation } from "react-router";

import { useAdminAuth } from "@/features/auth/context/admin-auth-context";

export function AdminRouteGuard() {
  const { isAdminAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
