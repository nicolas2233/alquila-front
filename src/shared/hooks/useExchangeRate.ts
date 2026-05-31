import { useEffect, useState } from "react";
import { env } from "../config/env";

let rateCache: number | null = null;
let cacheTs = 0;

export function useExchangeRate() {
  const [usdToArs, setUsdToArs] = useState<number | null>(rateCache);

  useEffect(() => {
    if (rateCache && Date.now() - cacheTs < 30 * 60 * 1000) {
      setUsdToArs(rateCache);
      return;
    }
    let cancelled = false;
    fetch(`${env.apiUrl}/exchange-rate`)
      .then((r) => r.json())
      .then((data: { usdToArs?: number }) => {
        if (cancelled || !data.usdToArs) return;
        rateCache = data.usdToArs;
        cacheTs = Date.now();
        setUsdToArs(data.usdToArs);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return usdToArs;
}
