import type { ReactNode } from "react";

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-600" />
      {children}
    </span>
  );
}
