import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSessionUser, getToken } from "./session";

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

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/buscar" replace />;
  }

  return children;
}
