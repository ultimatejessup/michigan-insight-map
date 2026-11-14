// Run with: bun test tests/energy-burden.test.ts
import { describe, expect, test } from "bun:test";
import { burdenForCounty, parseBurdenRows } from "../src/lib/census/energy-burden";

const url = "https://data.openei.org/submissions/6219";
const mk = (bracket: string, pct: string, county = "Midland") => ({
  fpl_bracket: bracket,
  estimated_households: 100,
  avg_annual_household_income: "50000.00",
  avg_annual_energy_cost: "2000.00",
  energy_burden_pct: pct,
  data_year: 2022,
  source_url: url,
  source_document: "DOE LEAD",
  geographies: { name: county },
});

describe("energy burden", () => {
  const map = parseBurdenRows([
    mk("400%+", "1.5"),
    mk("ALL", "3.2"),
    mk("0-100%", "20.1"),
    mk("100-150%", "9.0"),
    mk("ALL", "4.0", "St. Clair"),
    { fpl_bracket: "ALL", data_year: "bad", geographies: { name: "Nope" } },
    null,
  ]);

  test("separates the county-wide figure from income brackets", () => {
    const m = burdenForCounty(map, "Midland County");
    expect(m?.all?.burdenPct).toBe(3.2);
    expect(m?.brackets.map((b) => b.bracket)).toEqual(["0-100%", "100-150%", "400%+"]);
    expect(m?.sourceUrl).toBe(url);
  });

  test("matches names loosely and keeps missing values null", () => {
    expect(burdenForCounty(map, "Saint Clair")?.all?.burdenPct).toBe(4);
    expect(burdenForCounty(map, "Saint Clair")?.brackets).toEqual([]);
  });

  test("returns null for no county, unknown county or bad input", () => {
    expect(burdenForCounty(map, null)).toBeNull();
    expect(burdenForCounty(map, "Nope")).toBeNull();
    expect(parseBurdenRows("x").size).toBe(0);
  });
});
