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

  return (
    <div className="grid grid-cols-2 md:flex text-xs gap-2 mb-6 flex-wrap">
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
    </div>
  );
}
