import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDirtyTracker } from "./useDirtyTracker";

describe("useDirtyTracker", () => {
  it("arranca limpio y se marca sucio solo al cambiar el snapshot", () => {
    const { result, rerender } = renderHook(({ snap }) => useDirtyTracker(snap), {
      initialProps: { snap: JSON.stringify({ nombre: "Ana" }) },
    });
    expect(result.current.isDirty).toBe(false);

    // Re-render con el MISMO valor: sigue limpio (no falso positivo).
    rerender({ snap: JSON.stringify({ nombre: "Ana" }) });
    expect(result.current.isDirty).toBe(false);

    // Cambio real: se marca sucio.
    rerender({ snap: JSON.stringify({ nombre: "Beatriz" }) });
    expect(result.current.isDirty).toBe(true);
  });

  it("markPristine fija la línea base al estado actual", () => {
    const { result, rerender } = renderHook(({ snap }) => useDirtyTracker(snap), {
      initialProps: { snap: JSON.stringify({ v: 1 }) },
    });
    rerender({ snap: JSON.stringify({ v: 2 }) });
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.markPristine());
    expect(result.current.isDirty).toBe(false);

    // Volver al valor original ahora SÍ es un cambio (la base se movió a v:2).
    rerender({ snap: JSON.stringify({ v: 1 }) });
    expect(result.current.isDirty).toBe(true);
  });
});
