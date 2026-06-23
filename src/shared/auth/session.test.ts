import { describe, it, expect, beforeEach } from "vitest";
import {
  getRoleFromToken,
  isTokenExpired,
  saveSession,
  getSessionUser,
  clearSession,
  getToken,
  type SessionUser,
} from "./session";

/** Construye un JWT falso (header.payload.sig) con payload base64url. */
function makeToken(payload: Record<string, unknown>) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
  return `header.${body}.sig`;
}

const baseUser: SessionUser = {
  id: "u1",
  email: "a@b.com",
  role: "OWNER",
  status: "ACTIVE",
};

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getRoleFromToken extrae el role del payload", () => {
    expect(getRoleFromToken(makeToken({ role: "AGENCY_ADMIN" }))).toBe("AGENCY_ADMIN");
  });

  it("getRoleFromToken devuelve null para tokens inválidos o vacíos", () => {
    expect(getRoleFromToken(null)).toBeNull();
    expect(getRoleFromToken("no-es-un-jwt")).toBeNull();
  });

  it("isTokenExpired detecta un token vencido", () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    expect(isTokenExpired(makeToken({ exp: past }))).toBe(true);
  });

  it("isTokenExpired acepta un token vigente", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(makeToken({ exp: future }))).toBe(false);
  });

  it("isTokenExpired trata como vencido un token nulo o malformado", () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired("xxx")).toBe(true);
  });

  it("saveSession/getSessionUser/clearSession funcionan con localStorage", () => {
    saveSession("tok-123", baseUser);
    expect(getToken()).toBe("tok-123");
    expect(getSessionUser()).toEqual(baseUser);
    clearSession();
    expect(getToken()).toBeNull();
    expect(getSessionUser()).toBeNull();
  });
});
