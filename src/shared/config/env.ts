export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? "",
  posthogHost: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com",
};
