// Precio corto para pines del mapa: "US$ 85k", "$ 450k", "US$ 1,2M".
export function compactPrice(amount: number, currency: "ARS" | "USD" | string): string {
  const symbol = currency === "USD" ? "US$" : "$";
  if (!Number.isFinite(amount) || amount <= 0) return "Consultar";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded = millions >= 10 ? Math.round(millions).toString() : millions.toFixed(1).replace(/\.0$/, "");
    return `${symbol} ${rounded.replace(".", ",")}M`;
  }
  if (amount >= 1_000) {
    return `${symbol} ${Math.round(amount / 1_000)}k`;
  }
  return `${symbol} ${Math.round(amount)}`;
}

export function currencySymbol(currency: string): string {
  return currency === "USD" ? "US$" : "$";
}
