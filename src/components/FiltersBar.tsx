"use client";

import FilterDropdown from "./FilterDropdown";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
};

type FiltersBarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  seasons: string[];
};

export default function FiltersBar({ filters, setFilters, seasons }: Readonly<FiltersBarProps>) {
  const competitionTypes = [
    { label: "Liga", value: "league" },
    { label: "Amistoso", value: "friendly" },
  ];

  const genders = [
    { label: "Masculino", value: "male" },
    { label: "Femenino", value: "female" },
  ];

  const toggleFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  return (
    <div className="grid grid-cols-3 md:flex text-xs gap-2 mb-6">
      <FilterDropdown
        label="Temporada"
        options={seasons}
        value={filters.season}
        onChange={(val) => toggleFilter("season", val)}
      />
      <FilterDropdown
        label="Competición"
        options={competitionTypes.map((opt) => opt.label)}
        value={competitionTypes.find((opt) => opt.value === filters.competition_type)?.label}
        onChange={(label) => {
          const selected = competitionTypes.find((opt) => opt.label === label);
          toggleFilter("competition_type", selected?.value || "");
        }}
      />
      <FilterDropdown
        label="Género"
        options={genders.map((opt) => opt.label)}
        value={genders.find((opt) => opt.value === filters.gender)?.label}
        onChange={(label) => {
          const selected = genders.find((opt) => opt.label === label);
          toggleFilter("gender", selected?.value || "");
        }}
      />
    </div>
  );
}
