// Run with: bun test tests/gas-rates.test.ts
import { describe, expect, test } from "bun:test";
import {
  gasUtilitiesForCounty,
  latestGasByUtility,
  parseGasRateRows,
  parseGasTerritoryRows,
} from "../src/lib/rates/gas-rates";

const URL =
  "https://www.michigan.gov/mpsc/-/media/Project/Websites/mpsc/consumer/nat-gas/gasrates.pdf";
const row = (over: Record<string, unknown>) => ({
  gas_utility: "DTE Gas",
  reading_date: "2026-10-01",
  customer_charge_monthly: "16.57",
  distribution_charge: "0.52953",
  gas_cost_charge: "0.36000",
  total_volumetric_charge: "0.88953",
  volumetric_unit: "Ccf",
  source_url: URL,
  verification_status: "collection_in_progress",
  ...over,
});

describe("gas rates", () => {
  const points = parseGasRateRows([
    row({}),
    row({ reading_date: "2026-09-01", total_volumetric_charge: "0.92153" }),
    row({
      gas_utility: "SEMCO Energy Gas",
      volumetric_unit: "Therm",
      total_volumetric_charge: "0.75500",
      verification_status: "source_linked",
    }),
    row({ volumetric_unit: "Mcf" }),
    row({ reading_date: "bad" }),
    row({ total_volumetric_charge: null }),
    null,
  ]);

  test("keeps stored values and units, drops unusable rows", () => {
    expect(points).toHaveLength(3);
    const semco = points.find((p) => p.utility === "SEMCO Energy Gas");
    expect(semco?.unit).toBe("Therm");
    expect(semco?.total).toBe(0.755);
    expect(semco?.status).toBe("source_linked");
  });

  test("latest is a lookup of the newest edition per utility", () => {
    const latest = latestGasByUtility(points);
    expect(latest.get("DTE Gas")?.readingDate).toBe("2026-10-01");
    expect(latest.get("DTE Gas")?.total).toBe(0.88953);
  });

  test("unknown status never shows as checked", () => {
    expect(parseGasRateRows([row({ verification_status: "weird" })])[0]?.status).toBe(
      "collection_in_progress",
    );
  });

  test("territory lists each utility once per county, matching names loosely", () => {
    const t = parseGasTerritoryRows([
      { gas_utility: "SEMCO Energy Gas", geographies: { name: "St. Clair" } },
      { gas_utility: "DTE Gas", geographies: { name: "St. Clair" } },
      { gas_utility: "DTE Gas", geographies: { name: "St. Clair" } },
      { gas_utility: "DTE Gas", geographies: null },
    ]);
    expect(gasUtilitiesForCounty(t, "Saint Clair County")).toEqual(["DTE Gas", "SEMCO Energy Gas"]);
    expect(gasUtilitiesForCounty(t, "Nope")).toBeNull();
    expect(gasUtilitiesForCounty(t, null)).toBeNull();
  });
});

import { gasUnitGroups, gasUtilityList, pivotGasForChart } from "../src/lib/rates/gas-rates";

describe("gas chart helpers", () => {
  const pts = parseGasRateRows([
    row({}),
    row({ reading_date: "2026-09-01", total_volumetric_charge: "0.92153" }),
    row({
      gas_utility: "Xcel Energy Gas",
      volumetric_unit: "Therm",
      total_volumetric_charge: "0.94384",
    }),
  ]);

  test("units are never mixed in a group", () => {
    expect(gasUnitGroups(pts, gasUtilityList(pts))).toEqual({
      Ccf: ["DTE Gas"],
      Therm: ["Xcel Energy Gas"],
    });
  });

  test("pivot keeps stored totals by date and ignores unselected utilities", () => {
    const rows = pivotGasForChart(pts, ["DTE Gas"]);
    expect(rows).toEqual([
      { date: "2026-09-01", "DTE Gas": 0.92153 },
      { date: "2026-10-01", "DTE Gas": 0.88953 },
    ]);
  });
});
