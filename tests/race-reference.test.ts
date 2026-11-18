// Run with: bun test tests/race-reference.test.ts
import { describe, expect, test } from "bun:test";
import {
  displayValue,
  groupRaceReference,
  parseRaceReference,
} from "../src/lib/census/race-reference";

const url = "https://www.aceee.org/press/2016/04/report-energy-burden-low-income";
const mk = (over: Record<string, unknown>) => ({
  id: 1,
  race_ethnicity: "Black / African American",
  energy_burden_percent: "5.4",
  data_year: "ACEEE 2016 (48-city study)",
  source: "ACEEE 2016",
  source_url: url,
  ...over,
});

describe("race reference", () => {
  test("keeps stored numbers as they are and picks one figure per row", () => {
    const rows = parseRaceReference([
      mk({}),
      mk({
        id: 2,
        energy_burden_percent: null,
        pct_above_white_households: "45",
        race_ethnicity: "Native American",
      }),
      mk({
        id: 3,
        energy_burden_percent: null,
        low_income_median_burden_pct: "10.2",
        race_ethnicity: "Low-Income (All Races)",
      }),
    ]);
    expect(rows.map((r) => displayValue(r)?.text)).toEqual([
      "5.4% of income",
      "45% higher burden than white households",
      "10.2% of income",
    ]);
  });

  test("drops rows with no number, no source link or bad input", () => {
    const rows = parseRaceReference([
      mk({ id: 4, energy_burden_percent: null }),
      mk({ id: 5, source_url: null }),
      mk({ id: 6, source_url: "javascript:alert(1)" }),
      null,
      "x",
    ]);
    expect(rows).toEqual([]);
    expect(parseRaceReference("x")).toEqual([]);
  });

  test("groups by stored scope, unlabeled last, Black first within a group", () => {
    const rows = parseRaceReference([
      mk({ id: 1, race_ethnicity: "White (Non-Hispanic)", study_scope: "Detroit metro" }),
      mk({ id: 2, race_ethnicity: "Black / African American", study_scope: "Detroit metro" }),
      mk({ id: 3, study_scope: "National" }),
      mk({ id: 4 }),
    ]);
    const groups = groupRaceReference(rows);
    expect(groups.map((g) => g.scope)).toEqual(["Detroit metro", "National", null]);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual([2, 1]);
  });
});
