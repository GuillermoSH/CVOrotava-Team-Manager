"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import FilterDropdown from "./FilterDropdown";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
};

type FilterBarProps = {
  filters: Record<string, string | undefined>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
  configs: FilterConfig[];
  className?: string;
};

export default function FilterBar({
  filters,
  setFilters,
  configs,
  className,
}: Readonly<FilterBarProps>) {
  const toggleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className ?? "mb-5"}`}
    >      {configs.map((config) => {
        const currentValue = filters[config.key];
        const selectedLabel = config.options.find((opt) => opt.value === currentValue)?.label;

        return (
          <FilterDropdown
            key={config.key}
            label={config.label}
            options={config.options.map((opt) => opt.label)}
            value={selectedLabel}
            onChange={(label) => {
              if (!label.trim()) {
                setFilters((prev) => ({ ...prev, [config.key]: undefined }));
                return;
              }
              const selected = config.options.find((opt) => opt.label === label);
              if (selected) toggleFilter(config.key, selected.value);
            }}
          />
        );
      })}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            const cleared = Object.fromEntries(
              Object.keys(filters).map((k) => [k, undefined])
            );
            setFilters(cleared);
          }}
          className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-faint)] hover:text-[var(--accent)]"
        >
          <FontAwesomeIcon icon={faXmark} className="text-[10px] opacity-80" />
          Limpiar todo
        </button>
      )}
    </div>
  );
}
