import posthog from "posthog-js";
import { env } from "../config/env";
import type { SessionUser } from "../auth/session";

let initialized = false;

export function initPosthog() {
  if (initialized || !env.posthogKey) {
    return;
  }
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
  });
  initialized = true;
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (!env.posthogKey) return;
  posthog.capture(name, properties);
}

export function trackPageView(pathname: string) {
  if (!env.posthogKey) return;
  posthog.capture("$pageview", { pathname });
}

export function identifyUser(user: SessionUser | null) {
  if (!env.posthogKey) return;
  if (!user) {
    posthog.reset();
    return;
  }
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });
}
