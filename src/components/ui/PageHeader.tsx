"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Shared page chrome — same pattern as Calendario:
 * title + optional subtitle + optional actions. No icon badge.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <header
      className={`mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between ${className ?? ""}`}
    >
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
