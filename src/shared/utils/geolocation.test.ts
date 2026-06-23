import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { requestGeolocationOnce, forceRequestGeolocation } from "./geolocation";

const getCurrentPosition = vi.fn();
const permQuery = vi.fn();
const fakePos = { coords: { latitude: 1, longitude: 2 } } as GeolocationPosition;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("requestGeolocationOnce", () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentPosition.mockReset();
    permQuery.mockReset();
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition },
      permissions: { query: permQuery },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa el permiso ya concedido sin volver a preguntar", async () => {
    permQuery.mockResolvedValue({ state: "granted" });
    getCurrentPosition.mockImplementation((success: PositionCallback) => success(fakePos));
    const onSuccess = vi.fn();
    requestGeolocationOnce({ onSuccess });
    await flush();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(fakePos);
    expect(localStorage.getItem("domusbrag_geo_choice")).toBe("granted");
  });

  it("no pide ubicación si el permiso está denegado", async () => {
    permQuery.mockResolvedValue({ state: "denied" });
    const onError = vi.fn();
    requestGeolocationOnce({ onSuccess: vi.fn(), onError });
    await flush();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("pregunta una vez en estado 'prompt' sin decisión previa", async () => {
    permQuery.mockResolvedValue({ state: "prompt" });
    getCurrentPosition.mockImplementation((success: PositionCallback) => success(fakePos));
    const onSuccess = vi.fn();
    requestGeolocationOnce({ onSuccess });
    await flush();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("NO vuelve a preguntar si el usuario ya rechazó antes", async () => {
    localStorage.setItem("domusbrag_geo_choice", "denied");
    permQuery.mockResolvedValue({ state: "prompt" });
    const onError = vi.fn();
    requestGeolocationOnce({ onSuccess: vi.fn(), onError });
    await flush();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});

describe("forceRequestGeolocation", () => {
  beforeEach(() => {
    localStorage.clear();
    getCurrentPosition.mockReset();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("siempre pide ubicación, ignorando el recordatorio", () => {
    localStorage.setItem("domusbrag_geo_choice", "denied");
    getCurrentPosition.mockImplementation((success: PositionCallback) => success(fakePos));
    const onSuccess = vi.fn();
    forceRequestGeolocation({ onSuccess });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(fakePos);
  });
});
