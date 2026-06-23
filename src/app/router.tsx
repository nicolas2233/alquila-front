import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shared/layouts/AppLayout";
import { ProtectedRoute } from "../shared/auth/ProtectedRoute";
import { LazySection } from "../shared/ui/LazySection";
import { lazyWithRetry } from "../shared/utils/lazyWithRetry";

const HomePage = lazyWithRetry(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const SearchPage = lazyWithRetry(() => import("../pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const MapSearchPage = lazyWithRetry(() =>
  import("../pages/MapSearchPage").then((m) => ({ default: m.MapSearchPage }))
);
const PublishPage = lazyWithRetry(() => import("../pages/PublishPage").then((m) => ({ default: m.PublishPage })));
const ListingPage = lazyWithRetry(() => import("../pages/ListingPage").then((m) => ({ default: m.ListingPage })));
const DashboardPage = lazyWithRetry(() =>
  import("../pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const RegisterPage = lazyWithRetry(() => import("../pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazyWithRetry(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazyWithRetry(() =>
  import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazyWithRetry(() =>
  import("../pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazyWithRetry(() =>
  import("../pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage }))
);
const ChangePasswordPage = lazyWithRetry(() =>
  import("../pages/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage }))
);
const AgencyProfilePage = lazyWithRetry(() =>
  import("../pages/AgencyProfilePage").then((m) => ({ default: m.AgencyProfilePage }))
);
const SavedSearchesPage = lazyWithRetry(() =>
  import("../pages/SavedSearchesPage").then((m) => ({ default: m.SavedSearchesPage }))
);
const NotificationsPage = lazyWithRetry(() =>
  import("../pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage }))
);
const MyRequestsPage = lazyWithRetry(() =>
  import("../pages/MyRequestsPage").then((m) => ({ default: m.MyRequestsPage }))
);
const UserProfilePage = lazyWithRetry(() =>
  import("../pages/UserProfilePage").then((m) => ({ default: m.UserProfilePage }))
);
const LegalPage = lazyWithRetry(() => import("../pages/LegalPage").then((m) => ({ default: m.LegalPage })));
const AdminPage = lazyWithRetry(() => import("../pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazyWithRetry(() =>
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
        path: "publicar/:id/editar",
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
      { path: "verificar-email", element: withSuspense(<VerifyEmailPage />) },
      {
        path: "change-password",
        element: withSuspense(
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        ),
      },
      { path: "agencia/:slug", element: withSuspense(<AgencyProfilePage />) },
      { path: "publicacion/:slugId", element: withSuspense(<ListingPage />) },
      { path: "publicación/:slugId", element: withSuspense(<ListingPage />) },
      { path: "legal/:doc", element: withSuspense(<LegalPage />) },
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
      { path: "*", element: withSuspense(<NotFoundPage />) },
    ],
  },
  { path: "*", element: withSuspense(<NotFoundPage />) },
]);
