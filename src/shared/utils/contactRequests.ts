type ContactKey = {
  propertyId: string;
  type: "INTEREST" | "VISIT";
};

const STORAGE_KEY = "alquila_contact_requests";

function readStore(): Record<string, boolean> {
  const raw = localStorage.getItem(STORAGE_KEY);
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
