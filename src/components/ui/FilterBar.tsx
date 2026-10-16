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
  /** No se puede vaciar (ni con Limpiar). P. ej. temporada / género. */
  required?: boolean;
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
  const requiredKeys = new Set(configs.filter((c) => c.required).map((c) => c.key));

  const setFilterValue = (key: string, value: string | undefined) => {
    if (value === undefined && requiredKeys.has(key)) return;
    setFilters((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  };

  const clearableActive = configs.some((c) => !c.required && Boolean(filters[c.key]));

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? "mb-5"}`}>
      {configs.map((config) => {
        const currentValue = filters[config.key];
        const selectedLabel = config.options.find((opt) => opt.value === currentValue)?.label;

        return (
          <FilterDropdown
            key={config.key}
            label={config.label}
            options={config.options.map((opt) => opt.label)}
            value={selectedLabel}
            clearable={!config.required}
            onChange={(label) => {
              if (!label.trim()) {
                setFilterValue(config.key, undefined);
                return;
              }
              const selected = config.options.find((opt) => opt.label === label);
              if (selected) setFilterValue(config.key, selected.value);
            }}
          />
        );
      })}

      {clearableActive ? (
        <button
          type="button"
          onClick={() => {
            setFilters((prev) => {
              const next = { ...prev };
              for (const config of configs) {
                if (!config.required) next[config.key] = undefined;
              }
              return next;
            });
          }}
          className="inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-faint)] hover:text-[var(--accent)]"
        >
          <FontAwesomeIcon icon={faXmark} className="text-[10px] opacity-80" />
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
