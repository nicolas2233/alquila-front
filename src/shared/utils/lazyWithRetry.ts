import type { ComponentType } from "react";

export type LazyProps<T extends ComponentType<any>> = T extends ComponentType<infer P> ? P : never;

export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  retries = 2
) {
  let attempt = 0;
  return async () => {
    while (attempt <= retries) {
      try {
        return await loader();
      } catch (error) {
        attempt += 1;
        if (attempt > retries) {
          throw error;
        }
      }
    }
    return loader();
  };
}
