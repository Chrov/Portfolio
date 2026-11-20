import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-ink-2",
      measured: "bg-accent-soft text-accent",
      simulated: "bg-sim-bg text-sim-text",
      expected: "bg-warn-bg text-warn-text",
      outline: "border border-line text-ink-2",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />;
}
