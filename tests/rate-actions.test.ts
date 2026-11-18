// Run with: bun test tests/rate-actions.test.ts
import { describe, expect, test } from "bun:test";
import {
  actionNamesFor,
  actionsForUtilities,
  parseRateActions,
} from "../src/lib/rates/rate-actions";

const mk = (over: Record<string, unknown>) => ({
  id: 1,
  utility_name: "DTE Gas",
  action_type: "Rate Increase Approved",
  action_title: "DTE Gas Infrastructure Rate Increase",
  decision_date: "2026-09-10",
  amount_approved_millions: "74.52",
  residential_monthly_impact: "2.87",
  source_url: "https://www.michigan.gov/mpsc/commission/news-releases",
  ...over,
});

describe("rate actions", () => {
  const actions = parseRateActions([
    mk({}),
    mk({ id: 2, utility_name: "Consumers Energy Electric", decision_date: "2026-03-27" }),
    mk({ id: 3, utility_name: "", action_title: "Statewide reform", decision_date: "2026-07-16" }),
    mk({ id: 4, utility_name: "Multiple", action_title: "Undated reform", decision_date: null }),
    mk({ id: 5, source_url: null, action_title: "No source" }),
    mk({ id: 6, action_title: "" }),
    null,
  ]);

  test("keeps stored numbers, drops rows without a title, nulls bad links", () => {
    expect(actions).toHaveLength(5);
    expect(actions[0]?.approvedMillions).toBe(74.52);
    expect(actions[0]?.monthlyImpact).toBe(2.87);
    expect(actions.find((a) => a.id === 5)?.sourceUrl).toBeNull();
  });

  test("county actions are its utilities' plus statewide, newest first, undated last", () => {
    const names = actionNamesFor(["Consumers Energy", "DTE Electric"], ["DTE Gas"]);
    expect(names).toEqual(["Consumers Energy Electric", "DTE Electric", "DTE Gas"]);
    const r = actionsForUtilities(actions, names);
    expect(r.utility.map((a) => a.id)).toEqual([1, 5, 2]);
    expect(r.statewide.map((a) => a.id)).toEqual([3, 4]);
  });

  test("a utility with no actions yields none; no county yields all utility actions", () => {
    expect(actionsForUtilities(actions, ["SEMCO Energy Gas"]).utility).toEqual([]);
    expect(actionsForUtilities(actions, null).utility).toHaveLength(3);
  });
});
