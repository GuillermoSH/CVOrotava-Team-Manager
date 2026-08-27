"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

type PaginationProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label: string;
};

/** Compact page control (n / total + chevrons), same as Calendario sections. */
export default function Pagination({
  page,
  pageCount,
  onChange,
  label,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center gap-2.5">
      <p className="text-xs tabular-nums text-[var(--text-muted)]">
        {page} / {pageCount}
        <span className="sr-only"> · {label}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`${label}: página anterior`}
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[0.65rem]" />
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`${label}: página siguiente`}
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-[0.65rem]" />
        </button>
      </div>
    </div>
  );
}
