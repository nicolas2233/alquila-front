export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  agencyId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
  mustChangePassword?: boolean;
  subscription?: {
    planCode: string;
    planName: string;
    maxProperties: number;
    baseMaxProperties?: number;
    adminGrantedExtraProperties?: number;
    adminGrantedUntil?: string | null;
    isAdminGrantActive?: boolean;
    priceAmount: number;
    priceCurrency: string;
    billingCycle?: "MONTHLY" | "ANNUAL" | string;
    cancelAtPeriodEnd?: boolean;
    hasPaymentMethod?: boolean;
    paymentProvider?: string | null;
    paymentProviderStatus?: string | null;
    paymentPayerEmail?: string | null;
    pendingPlan?: {
      planCode: string;
      planInternalCode?: string;
      planName: string;
      maxProperties: number;
      priceAmount: number;
      priceCurrency: string;
    } | null;
    pendingPlanEffectiveAt?: string | null;
    annualDiscountPercent?: number;
    annualPriceAmount?: number;
    annualMonthlyEquivalentAmount?: number;
    annualSavingsAmount?: number;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    trialEndsAt?: string | null;
    isTrialActive: boolean;
    trialDaysRemaining: number;
    nextBillingAt?: string | null;
  } | null;
};

const TOKEN_KEY = "domusbrag_token";
const USER_KEY = "domusbrag_user";
const LEGACY_TOKEN_KEY = "alquila_token";
const LEGACY_USER_KEY = "alquila_user";

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return legacyToken;
}

export function getRoleFromToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    const json = JSON.parse(decoded) as { role?: string };
    return json.role ?? null;
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  let raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    const legacyRaw = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyRaw) {
      localStorage.setItem(USER_KEY, legacyRaw);
      localStorage.removeItem(LEGACY_USER_KEY);
      raw = legacyRaw;
    }
  }
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
