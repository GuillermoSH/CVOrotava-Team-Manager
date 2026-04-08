"use client";

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type PageHeaderProps = {
  icon: IconDefinition;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[var(--accent-muted)]"
          aria-hidden
        >
          <FontAwesomeIcon
            icon={icon}
            className="text-lg text-[var(--accent)]"
          />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
