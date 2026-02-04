import { lazy } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shared/layouts/AppLayout";
import { ProtectedRoute } from "../shared/auth/ProtectedRoute";
import { LazySection } from "../shared/ui/LazySection";

const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const SearchPage = lazy(() => import("../pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const MapSearchPage = lazy(() =>
  import("../pages/MapSearchPage").then((m) => ({ default: m.MapSearchPage }))
);
const PublishPage = lazy(() => import("../pages/PublishPage").then((m) => ({ default: m.PublishPage })));
const ListingPage = lazy(() => import("../pages/ListingPage").then((m) => ({ default: m.ListingPage })));
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("../pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const ChangePasswordPage = lazy(() =>
  import("../pages/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage }))
);
const AgencyProfilePage = lazy(() =>
  import("../pages/AgencyProfilePage").then((m) => ({ default: m.AgencyProfilePage }))
);
const SavedSearchesPage = lazy(() =>
  import("../pages/SavedSearchesPage").then((m) => ({ default: m.SavedSearchesPage }))
);
const NotificationsPage = lazy(() =>
  import("../pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage }))
);
const MyRequestsPage = lazy(() =>
  import("../pages/MyRequestsPage").then((m) => ({ default: m.MyRequestsPage }))
);
const UserProfilePage = lazy(() =>
  import("../pages/UserProfilePage").then((m) => ({ default: m.UserProfilePage }))
);
const AdminPage = lazy(() => import("../pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

const withSuspense = (node: ReactNode) => <LazySection>{node}</LazySection>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: "buscar", element: withSuspense(<SearchPage />) },
      { path: "mapa", element: withSuspense(<MapSearchPage />) },
      {
        path: "publicar",
        element: withSuspense(
          <ProtectedRoute allowedRoles={["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"]}>
            <PublishPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "busquedas",
        element: withSuspense(
          <ProtectedRoute>
            <SavedSearchesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "notificaciones",
        element: withSuspense(
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "mis-solicitudes",
        element: withSuspense(
          <ProtectedRoute>
            <MyRequestsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "perfil",
        element: withSuspense(
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        ),
      },
      { path: "registro", element: withSuspense(<RegisterPage />) },
      { path: "login", element: withSuspense(<LoginPage />) },
      { path: "recuperar", element: withSuspense(<ForgotPasswordPage />) },
      { path: "reset-password", element: withSuspense(<ResetPasswordPage />) },
      {
        path: "change-password",
        element: withSuspense(
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        ),
      },
      { path: "agencia/:slug", element: withSuspense(<AgencyProfilePage />) },
      { path: "publicación/:id", element: withSuspense(<ListingPage />) },
      {
        path: "admin",
        element: withSuspense(
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "panel",
        element: withSuspense(
          <ProtectedRoute allowedRoles={["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"]}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: withSuspense(<NotFoundPage />) },
]);
