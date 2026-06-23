import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detecta cambios sin guardar comparando un snapshot serializado del formulario
 * contra una línea base. Evita los falsos positivos del enfoque `onChange` (que se
 * marcaba "sucio" ante cualquier evento, sin importar si el valor realmente cambió).
 *
 * Uso:
 *   const snapshot = JSON.stringify({ ...campos editables... });
 *   const { isDirty, markPristine } = useDirtyTracker(snapshot);
 *   // tras cargar datos (efecto cuando ya están en el estado) o tras guardar: markPristine();
 */
export function useDirtyTracker(snapshot: string) {
  const baselineRef = useRef<string | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [isDirty, setIsDirty] = useState(false);

  // Línea base inicial (primer render: formulario vacío o valores por defecto).
  if (baselineRef.current === null) {
    baselineRef.current = snapshot;
  }

  useEffect(() => {
    setIsDirty(snapshot !== baselineRef.current);
  }, [snapshot]);

  /** Fija la línea base al estado actual (tras cargar datos o guardar). */
  const markPristine = useCallback(() => {
    baselineRef.current = snapshotRef.current;
    setIsDirty(false);
  }, []);

  return { isDirty, markPristine };
}
