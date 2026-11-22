"use client";
import { useLayoutEffect, useRef } from "react";
import { cn } from "./cn";

/** Radio-style toggle with a thumb that slides (with a slight overshoot) to the active option. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const w = wrap.current;
    const th = thumb.current;
    if (!w || !th) return;
    const place = () => {
      const btn = w.querySelector<HTMLButtonElement>('[aria-checked="true"]');
      if (!btn) return;
      th.style.transform = `translateX(${btn.offsetLeft - 2}px)`;
      th.style.width = `${btn.offsetWidth}px`;
    };
    place();
    // Enable the transition only after the first placement, so the thumb never slides in on load
    const id = requestAnimationFrame(() => th.setAttribute("data-ready", ""));
    const ro = new ResizeObserver(place);
    ro.observe(w);
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, [value, options.length]);

  return (
    <div ref={wrap} role="radiogroup" aria-label={label} className="relative inline-flex rounded-md border border-line bg-surface-2 p-0.5">
      <span ref={thumb} aria-hidden className="seg-thumb pointer-events-none absolute left-0.5 top-0.5 bottom-0.5 rounded-[5px] bg-surface shadow-sm" />
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("press relative z-[1] h-7 rounded-[5px] px-2.5 text-[12.5px] font-medium cursor-pointer",
            value === o.value ? "text-ink" : "text-ink-3 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
