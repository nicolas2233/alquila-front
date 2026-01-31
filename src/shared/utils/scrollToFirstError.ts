export function scrollToFirstError(container?: HTMLElement | null) {
  if (!container) return;
  const errorField = container.querySelector(
    '[data-error="true"], [aria-invalid="true"]'
  ) as HTMLElement | null;
  const firstField = container.querySelector("input, select, textarea") as
    | HTMLElement
    | null;
  const target = errorField ?? firstField ?? container;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}
