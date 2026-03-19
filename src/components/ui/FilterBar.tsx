"use client";

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
};

export default function FilterBar({ filters, setFilters, configs }: Readonly<FilterBarProps>) {
  const toggleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {configs.map((config) => {
        const currentValue = filters[config.key];
        const selectedLabel = config.options.find((opt) => opt.value === currentValue)?.label;

        return (
          <FilterDropdown
            key={config.key}
            label={config.label}
            options={config.options.map((opt) => opt.label)}
            value={selectedLabel}
            onChange={(label) => {
              const selected = config.options.find((opt) => opt.label === label);
              toggleFilter(config.key, selected?.value || "");
            }}
          />
        );
      })}

      {activeCount > 0 && (
        <button
          onClick={() => {
            const cleared = Object.fromEntries(
              Object.keys(filters).map((k) => [k, undefined])
            );
            setFilters(cleared);
          }}
          className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors px-2 py-1"
        >
          Limpiar todo ✕
        </button>
      )}
    </div>
  );
}
