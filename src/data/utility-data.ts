import michigan from "./michigan-counties.json";

/**
 * NO INVENTED DATA.
 * Every series below is intentionally empty until a real, sourced dataset is
 * connected. Components must render the "Data coming soon" state whenever a
 * series is empty, and must never display a fabricated number.
 */

export type UtilityKey = "electric" | "gas" | "water" | "broadband";

export type MonthlyRatePoint = {
  /** ISO month, e.g. "2018-05" */
  month: string;
  utility: string;
  value: number;
};

export type Source = {
  label: string;
  url: string;
} | null;

export type UtilityDataset = {
  key: UtilityKey;
  label: string;
  unitShort: string;
  /** Utility companies available as a filter. Empty until data is connected. */
  utilities: string[];
  /** Monthly rate history. Empty until data is connected. */
  series: MonthlyRatePoint[];
  source: Source;
  comingSoonNote: string;
};

export const utilityDatasets: UtilityDataset[] = [
  {
    key: "electric",
    label: "Electric",
    unitShort: "¢/kWh",
    utilities: [],
    series: [],
    source: null,
    comingSoonNote:
      "Monthly residential electric rate history (May 2018 onward) will appear here once the rate dataset is connected.",
  },
  {
    key: "gas",
    label: "Natural Gas",
    unitShort: "$/Mcf",
    utilities: [],
    series: [],
    source: null,
    comingSoonNote:
      "Monthly residential natural gas rate history (May 2018 onward) will appear here once the rate dataset is connected.",
  },
  {
    key: "water",
    label: "Water",
    unitShort: "$/month",
    utilities: [],
    series: [],
    source: null,
    comingSoonNote:
      "Michigan water and sewer rates are set by hundreds of local systems, so there is no single statewide dataset loaded yet.",
  },
  {
    key: "broadband",
    label: "Broadband",
    unitShort: "$/month",
    utilities: [],
    series: [],
    source: null,
    comingSoonNote:
      "Home internet pricing varies by address and provider, and no verified dataset is loaded yet.",
  },
];

export type MapMetricKey = "burden" | "rate";

export type MapMetric = {
  key: MapMetricKey;
  label: string;
  unit: string;
  /** County FIPS -> value. Empty until a sourced dataset is connected. */
  values: Record<string, number>;
  source: Source;
  comingSoonNote: string;
};

export const mapMetrics: MapMetric[] = [
  {
    key: "burden",
    label: "Energy burden",
    unit: "% of household income",
    values: {},
    source: null,
    comingSoonNote:
      "County energy burden will be shaded here once the DOE LEAD Tool dataset is connected.",
  },
  {
    key: "rate",
    label: "Average rate",
    unit: "¢/kWh",
    values: {},
    source: null,
    comingSoonNote:
      "County average rates will be shaded here once the rate dataset is connected.",
  },
];

export type County = {
  name: string;
  fips: string;
  d: string;
  cx: number;
  cy: number;
};

export const michiganMap = michigan as {
  width: number;
  height: number;
  counties: County[];
};

export const counties: County[] = michiganMap.counties;

export const countyNames: string[] = counties.map((c) => c.name);

export const issueOptions = [
  "Rate increase",
  "Shutoff or shutoff notice",
  "Outage or reliability",
  "Billing error",
  "Service quality",
  "Can't afford bill",
  "Other",
] as const;

export const utilityTypeOptions: { value: UtilityKey; label: string }[] = [
  { value: "electric", label: "Electric" },
  { value: "gas", label: "Natural Gas" },
  { value: "water", label: "Water" },
  { value: "broadband", label: "Broadband" },
];
