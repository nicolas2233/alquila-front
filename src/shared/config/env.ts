export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  siteUrl: import.meta.env.VITE_SITE_URL ?? "https://domusbrag.com",
  mercadoPagoPublicKey: import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "",
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? "",
  posthogHost: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com",
};
