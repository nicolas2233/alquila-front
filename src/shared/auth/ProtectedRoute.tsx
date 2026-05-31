import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearSession, getRoleFromToken, getSessionUser, getToken, isTokenExpired } from "./session";

type ProtectedRouteProps = {
  children: ReactElement;
  allowedRoles?: string[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getToken();
  const user = getSessionUser();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isTokenExpired(token)) {
    clearSession();
    return <Navigate to="/login" state={{ from: location.pathname, sessionExpired: true }} replace />;
  }

  const tokenRole = getRoleFromToken(token);
  const effectiveRole = user?.role ?? tokenRole ?? null;

  if (allowedRoles && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
    if (effectiveRole === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/buscar" replace />;
  }

  return children;
}
