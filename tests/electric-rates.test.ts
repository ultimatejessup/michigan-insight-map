// Run with: bun test tests/electric-rates.test.ts
import { describe, expect, test } from "bun:test";
import {
  formatTableDate,
  hasCollectionInProgress,
  lastCollectionInProgressDate,
  latestByUtility,
  parseRateRows,
  pivotForChart,
  statusAt,
  statusLabel,
  parseTerritoryRows,
  utilitiesForCounty,
  utilityList,
} from "../src/lib/rates/electric-rates";

const URL = "https://www.michigan.gov/documents/mpsc/rates1_594951_7.pdf";

const rows = [
  {
    utility: "DTE Electric",
    reading_date: "2026-10-01",
    residential_rate_cents_kwh: "22.75",
    source_url: URL,
    verification_status: "verified_mpsc_table",
  },
  {
    utility: "DTE Electric",
    reading_date: "2026-09-01",
    residential_rate_cents_kwh: "23.40",
    source_url: URL,
    verification_status: "verified_mpsc_table",
  },
  {
    utility: "Consumers Energy",
    reading_date: "2026-10-01",
    residential_rate_cents_kwh: "21.46",
    source_url: URL,
    verification_status: "verified_mpsc_table",
  },
  {
    utility: "Upper Peninsula Power (UPPCO)",
    reading_date: "2026-10-01",
    residential_rate_cents_kwh: "27.39",
    source_url: URL,
    verification_status: "source_linked",
  },
  {
    utility: "DTE Electric",
    reading_date: "2018-06-01",
    residential_rate_cents_kwh: "15.10",
    source_url: null,
    verification_status: "collection_in_progress",
  },
];

describe("parseRateRows", () => {
  test("keeps stored values exactly and sorts by table date", () => {
    const points = parseRateRows(rows);
    expect(points.map((p) => p.readingDate)).toEqual([
      "2018-06-01",
      "2026-09-01",
      "2026-10-01",
      "2026-10-01",
      "2026-10-01",
    ]);
    expect(
      points.find((p) => p.utility === "DTE Electric" && p.readingDate === "2026-10-01")?.value,
    ).toBe(22.75);
  });

  test("drops rows with a missing date, utility or number instead of inventing one", () => {
    const bad = [
      { utility: "DTE Electric", reading_date: null, residential_rate_cents_kwh: "20" },
      { utility: "", reading_date: "2026-10-01", residential_rate_cents_kwh: "20" },
      { utility: "DTE Electric", reading_date: "2026-10-01", residential_rate_cents_kwh: null },
      { utility: "DTE Electric", reading_date: "2026-10-01", residential_rate_cents_kwh: "abc" },
    ];
    expect(parseRateRows(bad)).toEqual([]);
    expect(parseRateRows(null)).toEqual([]);
  });

  test("an unknown or missing status is never shown as checked", () => {
    const [p] = parseRateRows([
      {
        utility: "DTE Electric",
        reading_date: "2026-10-01",
        residential_rate_cents_kwh: "22.75",
        source_url: URL,
      },
    ]);
    expect(p.status).toBe("collection_in_progress");
  });

  test("only http(s) links count as a source link", () => {
    const [p] = parseRateRows([
      {
        utility: "DTE Electric",
        reading_date: "2026-10-01",
        residential_rate_cents_kwh: "22.75",
        source_url: "javascript:alert(1)",
      },
    ]);
    expect(p.sourceUrl).toBeNull();
  });
});

describe("lookups and chart data", () => {
  const points = parseRateRows(rows);

  test("latest value per utility is a lookup of the newest stored row", () => {
    const latest = latestByUtility(points);
    expect(latest.get("DTE Electric")?.value).toBe(22.75);
    expect(latest.get("DTE Electric")?.readingDate).toBe("2026-10-01");
    expect(latest.get("Consumers Energy")?.value).toBe(21.46);
  });

  test("default utilities come first in the utility list", () => {
    expect(utilityList(points)).toEqual([
      "DTE Electric",
      "Consumers Energy",
      "Upper Peninsula Power (UPPCO)",
    ]);
  });

  test("pivot has one row per date and no computed values", () => {
    const pivot = pivotForChart(points, ["DTE Electric", "Consumers Energy"]);
    expect(pivot).toEqual([
      { date: "2018-06-01", "DTE Electric": 15.1 },
      { date: "2026-09-01", "DTE Electric": 23.4 },
      { date: "2026-10-01", "DTE Electric": 22.75, "Consumers Energy": 21.46 },
    ]);
  });

  test("status lookups and friendly labels", () => {
    expect(statusAt(points, "DTE Electric", "2026-10-01")).toBe("verified_mpsc_table");
    expect(statusAt(points, "DTE Electric", "2000-01-01")).toBeUndefined();
    expect(statusLabel("collection_in_progress")).toBe("Data collection in progress");
    expect(statusLabel("collection_in_progress").toLowerCase()).not.toContain("review");
    expect(hasCollectionInProgress(points, ["DTE Electric"])).toBe(true);
    expect(hasCollectionInProgress(points, ["Consumers Energy"])).toBe(false);
    expect(lastCollectionInProgressDate(points)).toBe("2018-06-01");
  });

  test("formats the MPSC table date without time zone shifts", () => {
    expect(formatTableDate("2026-10-01")).toBe("Oct 1, 2026");
    expect(formatTableDate("2023-01-01")).toBe("Jan 1, 2023");
  });
});

describe("service territory", () => {
  const territory = parseTerritoryRows([
    { rate_history_utility: "DTE Electric", geographies: { name: "Midland" } },
    { rate_history_utility: "Consumers Energy", geographies: { name: "Midland" } },
    { rate_history_utility: "DTE Electric", geographies: { name: "Midland" } },
    { rate_history_utility: "DTE Electric", geographies: { name: "St. Clair" } },
    { rate_history_utility: 5, geographies: { name: "Bad" } },
    null,
  ]);

  test("groups utilities by county and drops bad rows and duplicates", () => {
    expect(utilitiesForCounty(territory, "Midland")).toEqual(["DTE Electric", "Consumers Energy"]);
  });

  test("matches county names loosely", () => {
    expect(utilitiesForCounty(territory, "Midland County")).not.toBeNull();
    expect(utilitiesForCounty(territory, "Saint Clair")).toEqual(["DTE Electric"]);
  });

  test("returns null with no county or no record", () => {
    expect(utilitiesForCounty(territory, null)).toBeNull();
    expect(utilitiesForCounty(territory, "Keweenaw")).toBeNull();
    expect(parseTerritoryRows("nope").size).toBe(0);
  });
});
