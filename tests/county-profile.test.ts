// Run with: bun test tests/county-profile.test.ts
import { describe, expect, test } from "bun:test";
import { parseCountyProfiles, profileForCounty } from "../src/lib/census/county-profile";

const rows = [
  {
    data_year: 2022,
    total_population: 83000,
    median_household_income: "70000.00",
    geographies: { name: "Midland" },
  },
  {
    data_year: 2024,
    total_population: 83757,
    median_household_income: "77538.00",
    geographies: { name: "Midland" },
  },
  {
    data_year: 2024,
    total_population: 255000,
    median_household_income: null,
    geographies: { name: "St. Clair" },
  },
  { data_year: "bad", total_population: 1, geographies: { name: "Nope" } },
  null,
];

describe("county profile", () => {
  const map = parseCountyProfiles(rows);
  test("keeps the newest year and converts numeric strings", () => {
    expect(profileForCounty(map, "Midland County")).toEqual({
      county: "Midland",
      dataYear: 2024,
      population: 83757,
      medianHouseholdIncome: 77538,
    });
  });
  test("keeps missing values as null, never zero", () => {
    expect(profileForCounty(map, "Saint Clair")?.medianHouseholdIncome).toBeNull();
  });
  test("returns null for no county, unknown county or bad input", () => {
    expect(profileForCounty(map, null)).toBeNull();
    expect(profileForCounty(map, "Nope")).toBeNull();
    expect(parseCountyProfiles("x").size).toBe(0);
  });
});
