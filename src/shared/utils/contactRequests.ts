type ContactKey = {
  propertyId: string;
  type: "INTEREST" | "VISIT";
};

const STORAGE_KEY = "domusbrag_contact_requests";
const LEGACY_STORAGE_KEY = "alquila_contact_requests";

function readStore(): Record<string, boolean> {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      localStorage.setItem(STORAGE_KEY, legacyRaw);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      raw = legacyRaw;
    }
  }
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeStore(next: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function keyFor({ propertyId, type }: ContactKey) {
  return `${propertyId}:${type}`;
}

export function hasSentContactRequest(key: ContactKey) {
  const store = readStore();
  return Boolean(store[keyFor(key)]);
}

export function markContactRequestSent(key: ContactKey) {
  const store = readStore();
  store[keyFor(key)] = true;
  writeStore(store);
}
