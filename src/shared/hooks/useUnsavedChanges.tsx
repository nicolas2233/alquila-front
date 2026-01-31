import { useEffect, useState } from "react";
import { useBlocker } from "react-router";

export function useUnsavedChanges(when: boolean) {
  const blocker = useBlocker(when);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShow(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!when) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  const confirmLeave = () => {
    setShow(false);
    blocker.proceed?.();
  };

  const cancelLeave = () => {
    setShow(false);
    blocker.reset?.();
  };

  return { show, confirmLeave, cancelLeave };
}
