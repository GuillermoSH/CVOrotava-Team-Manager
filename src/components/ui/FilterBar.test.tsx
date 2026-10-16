import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FilterBar, { type FilterConfig } from "./FilterBar";

const configs: FilterConfig[] = [
  {
    key: "season",
    label: "Temporada",
    required: true,
    options: [{ label: "2026-27", value: "2026-27" }],
  },
  {
    key: "gender",
    label: "Género",
    required: true,
    options: [
      { label: "Masculino", value: "male" },
      { label: "Femenino", value: "female" },
    ],
  },
  {
    key: "video_type",
    label: "Tipo",
    options: [{ label: "Partido", value: "match" }],
  },
];

describe("FilterBar", () => {
  it("no ofrece limpiar cuando solo hay filtros obligatorios activos", () => {
    const html = renderToStaticMarkup(
      <FilterBar
        filters={{ season: "2026-27", gender: "male" }}
        setFilters={vi.fn()}
        configs={configs.filter((c) => c.required)}
      />
    );
    expect(html).not.toContain("Limpiar filtros");
    expect(html).not.toContain("Limpiar todo");
  });

  it("ofrece limpiar solo cuando hay filtros secundarios activos", () => {
    const html = renderToStaticMarkup(
      <FilterBar
        filters={{ season: "2026-27", gender: "male", video_type: "match" }}
        setFilters={vi.fn()}
        configs={configs}
      />
    );
    expect(html).toContain("Limpiar filtros");
  });
});
