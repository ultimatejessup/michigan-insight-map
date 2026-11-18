import { describe, expect, test } from "bun:test";
import {
  filterSupplies,
  parseCounty,
  parseSupplies,
  suppliesForCounty,
  suppliesToCsv,
} from "@/lib/water/service-lines";

const rows = [
  { pws_id: "MI1", supply_name: "WARREN, CITY OF", lead_lines: 5, galvanized_prev_lead_lines: 33, non_lead_lines: 35146, lead_status_unknown_lines: 15573, total_service_lines: 50757, as_of: "March 2025", source_url: "https://example.org/x" },
  { pws_id: "MI2", supply_name: "=EVIL, \"Q\"", lead_lines: null, galvanized_prev_lead_lines: 0, non_lead_lines: 3, lead_status_unknown_lines: null, total_service_lines: null, as_of: "March 2025", source_url: "javascript:1" },
];

describe("service lines", () => {
  test("keeps blanks as null and rejects bad urls", () => {
    const s = parseSupplies(rows);
    expect(s.find((x) => x.pwsId === "MI2")?.lead).toBeNull();
    expect(s.find((x) => x.pwsId === "MI1")?.total).toBe(50757);
    expect(s.find((x) => x.pwsId === "MI2")?.sourceUrl).toContain("michigan.gov");
  });
  test("county placement and search", () => {
    const s = parseSupplies(rows);
    const c = parseCounty([{ pws_id: "MI1", geographies: { name: "Macomb County" } }]);
    expect(suppliesForCounty(s, c, "Macomb").map((x) => x.pwsId)).toEqual(["MI1"]);
    expect(suppliesForCounty(s, c, "Wayne")).toEqual([]);
    expect(filterSupplies(s, "warren")).toHaveLength(1);
  });
  test("csv leaves blanks blank and neutralizes formulas", () => {
    const csv = suppliesToCsv(parseSupplies(rows));
    expect(csv.split("\r\n")[0]).toContain("Supply name");
    expect(csv).toContain("\"'=EVIL, \"\"Q\"\"\"");
    expect(csv).toContain(",,0,3,,,March 2025");
  });
});
