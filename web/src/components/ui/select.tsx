import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export function Select({ className, label, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">
      {label}
      <span className="relative">
        <select
          className={cn("h-9 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-8 text-sm normal-case tracking-normal text-ink hover:border-line-strong", className)}
          {...p}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-ink-3" />
      </span>
    </label>
  );
}
