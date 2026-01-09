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
import { AgencyProfilePage } from "../pages/AgencyProfilePage";
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
      { path: "publicar", element: <ProtectedRoute><PublishPage /></ProtectedRoute> },
      { path: "registro", element: <RegisterPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "agencia/:slug", element: <AgencyProfilePage /> },
      { path: "publicacion/:id", element: <ListingPage /> },
      { path: "panel", element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
