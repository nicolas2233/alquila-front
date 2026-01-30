import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shared/layouts/AppLayout";
import { HomePage } from "../pages/HomePage";
import { SearchPage } from "../pages/SearchPage";
import { MapSearchPage } from "../pages/MapSearchPage";
import { PublishPage } from "../pages/PublishPage";
import { ListingPage } from "../pages/ListingPage";
import { DashboardPage } from "../pages/DashboardPage";
import { RegisterPage } from "../pages/RegisterPage";
import { LoginPage } from "../pages/LoginPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { AgencyProfilePage } from "../pages/AgencyProfilePage";
import { SavedSearchesPage } from "../pages/SavedSearchesPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { MyRequestsPage } from "../pages/MyRequestsPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { AdminPage } from "../pages/AdminPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProtectedRoute } from "../shared/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "buscar", element: <SearchPage /> },
      { path: "mapa", element: <MapSearchPage /> },
      {
        path: "publicar",
        element: (
          <ProtectedRoute allowedRoles={["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"]}>
            <PublishPage />
          </ProtectedRoute>
        ),
      },
      { path: "busquedas", element: <ProtectedRoute><SavedSearchesPage /></ProtectedRoute> },
      { path: "notificaciones", element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
      { path: "mis-solicitudes", element: <ProtectedRoute><MyRequestsPage /></ProtectedRoute> },
      { path: "perfil", element: <ProtectedRoute><UserProfilePage /></ProtectedRoute> },
      { path: "registro", element: <RegisterPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "recuperar", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "change-password", element: <ProtectedRoute><ChangePasswordPage /></ProtectedRoute> },
      { path: "agencia/:slug", element: <AgencyProfilePage /> },
      { path: "publicaci?n/:id", element: <ListingPage /> },
      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "panel",
        element: (
          <ProtectedRoute allowedRoles={["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"]}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
