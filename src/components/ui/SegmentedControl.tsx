"use client";

import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-1 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
              active
                ? "bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_32%,transparent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
