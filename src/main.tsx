import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "leaflet/dist/leaflet.css";
import "./shared/styles/globals.css";
import { initPosthog } from "./shared/analytics/posthog";

initPosthog();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
