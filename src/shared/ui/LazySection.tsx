import { Suspense } from "react";

export type LazySectionProps = {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
};

export function LazySection({ children, className, fallback }: LazySectionProps) {
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div
            className={
              className ??
              "mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-6 text-sm text-[#c7c2b8]"
            }
          >
            Cargando...
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
