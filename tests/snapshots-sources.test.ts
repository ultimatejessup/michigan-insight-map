import { describe, expect, test } from "bun:test";
import { parseWaterRates, parseWaterCounties, waterForCounty } from "@/lib/water/water-rates";
import { parseBroadbandRows, broadbandForCounty } from "@/lib/broadband/broadband";
import { groupByHost } from "@/lib/sources/sources";

describe("water", () => {
  test("links rates to counties, drops unsourced urls", () => {
    const rates = parseWaterRates([
      { id: 1, provider: "A", source_document: "not a url", water_commodity_rate: "2.5" },
      { id: 2, provider: "B", source_document: "https://x.org/a" },
    ]);
    expect(rates[0]?.sourceUrl).toBeNull();
    expect(rates[1]?.sourceUrl).toBe("https://x.org/a");
    const counties = parseWaterCounties([
      { water_sewage_rate_id: 2, is_primary: true, geographies: { name: "Wayne County" } },
    ]);
    expect(waterForCounty(rates, counties, "Wayne").map((r) => r.provider)).toEqual(["B"]);
  });
});

describe("broadband", () => {
  test("lists places separately and keeps fixed technologies only", () => {
    const doc = "FCC fixed, data as-of 2026-07-21";
    const map = parseBroadbandRows([
      { technology: "Fiber", availability_pct_of_zip: 40, source_document: doc, place: { name: "Warren" }, county: { name: "Macomb County" } },
      { technology: "Cable", availability_pct_of_zip: 99, source_document: doc, place: { name: "Warren" }, county: { name: "Macomb County" } },
      { technology: "Mobile 5G (Stationary)", availability_pct_of_zip: 5, source_document: doc, place: { name: "Warren" }, county: { name: "Macomb County" } },
    ]);
    const c = broadbandForCounty(map, "Macomb");
    expect(c?.places).toHaveLength(1);
    expect(c?.places[0]?.values).toEqual({ Fiber: 40, Cable: 99 });
    expect(c?.asOf).toBe("2026-07-21");
  });
});

describe("sources", () => {
  test("groups by host, dedupes, skips bad urls", () => {
    const g = groupByHost([
      { url: "https://www.a.com/x", label: "X" },
      { url: "https://a.com/x", label: "dup" },
      { url: "https://www.a.com/x", label: "again" },
      { url: "javascript:1", label: "bad" },
      { url: null, label: "none" },
    ]);
    expect(g.map((h) => h.host)).toEqual(["a.com"]);
    expect(g[0]?.links).toHaveLength(2);
  });
});
