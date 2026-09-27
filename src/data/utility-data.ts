/**
 * Placeholder Michigan utility data.
 * Replace with live database reads once a database is connected.
 */

export type UtilityKey = "electric" | "gas" | "water" | "broadband";

export type RatePoint = {
  year: number;
  michigan: number;
  national: number;
};

export type UtilityService = {
  key: UtilityKey;
  label: string;
  unit: string;
  unitShort: string;
  blurb: string;
  series: RatePoint[];
};

export const utilityServices: UtilityService[] = [
  {
    key: "electric",
    label: "Electric",
    unit: "cents per kilowatt-hour",
    unitShort: "¢/kWh",
    blurb:
      "Average residential electricity price in Michigan compared with the U.S. average.",
    series: [
      { year: 2016, michigan: 15.2, national: 12.6 },
      { year: 2017, michigan: 15.4, national: 12.9 },
      { year: 2018, michigan: 15.9, national: 12.9 },
      { year: 2019, michigan: 16.3, national: 13.0 },
      { year: 2020, michigan: 16.6, national: 13.2 },
      { year: 2021, michigan: 17.1, national: 13.7 },
      { year: 2022, michigan: 17.9, national: 15.1 },
      { year: 2023, michigan: 18.8, national: 15.9 },
      { year: 2024, michigan: 19.6, national: 16.4 },
      { year: 2025, michigan: 20.4, national: 16.8 },
    ],
  },
  {
    key: "gas",
    label: "Natural gas",
    unit: "dollars per thousand cubic feet",
    unitShort: "$/Mcf",
    blurb:
      "Average residential natural gas price in Michigan compared with the U.S. average.",
    series: [
      { year: 2016, michigan: 8.4, national: 10.1 },
      { year: 2017, michigan: 8.7, national: 10.5 },
      { year: 2018, michigan: 8.9, national: 10.5 },
      { year: 2019, michigan: 9.1, national: 10.6 },
      { year: 2020, michigan: 9.3, national: 10.8 },
      { year: 2021, michigan: 10.2, national: 12.2 },
      { year: 2022, michigan: 11.8, national: 14.3 },
      { year: 2023, michigan: 12.1, national: 15.0 },
      { year: 2024, michigan: 12.6, national: 15.2 },
      { year: 2025, michigan: 13.2, national: 15.5 },
    ],
  },
  {
    key: "water",
    label: "Water & sewer",
    unit: "dollars per month, typical household",
    unitShort: "$/month",
    blurb:
      "Typical combined water and sewer bill in Michigan compared with the U.S. average.",
    series: [
      { year: 2016, michigan: 68, national: 64 },
      { year: 2017, michigan: 71, national: 66 },
      { year: 2018, michigan: 75, national: 69 },
      { year: 2019, michigan: 79, national: 72 },
      { year: 2020, michigan: 83, national: 75 },
      { year: 2021, michigan: 87, national: 78 },
      { year: 2022, michigan: 92, national: 82 },
      { year: 2023, michigan: 98, national: 86 },
      { year: 2024, michigan: 104, national: 90 },
      { year: 2025, michigan: 110, national: 94 },
    ],
  },
  {
    key: "broadband",
    label: "Broadband",
    unit: "dollars per month, 100 Mbps plan",
    unitShort: "$/month",
    blurb:
      "Advertised price for a typical 100 Mbps home internet plan in Michigan compared with the U.S. average.",
    series: [
      { year: 2016, michigan: 58, national: 60 },
      { year: 2017, michigan: 60, national: 61 },
      { year: 2018, michigan: 62, national: 63 },
      { year: 2019, michigan: 64, national: 64 },
      { year: 2020, michigan: 66, national: 65 },
      { year: 2021, michigan: 68, national: 66 },
      { year: 2022, michigan: 71, national: 68 },
      { year: 2023, michigan: 74, national: 70 },
      { year: 2024, michigan: 77, national: 71 },
      { year: 2025, michigan: 80, national: 73 },
    ],
  },
];

export type CountyBurden = {
  county: string;
  utility: string;
  burden: number; // percent of household income spent on energy
  medianIncome: number;
  annualEnergyCost: number;
  shutoffsPer1k: number;
};

export const countyBurdens: CountyBurden[] = [
  {
    county: "Wayne",
    utility: "DTE Energy",
    burden: 11.4,
    medianIncome: 54800,
    annualEnergyCost: 3210,
    shutoffsPer1k: 84,
  },
  {
    county: "Genesee",
    utility: "Consumers Energy",
    burden: 10.2,
    medianIncome: 57900,
    annualEnergyCost: 3020,
    shutoffsPer1k: 71,
  },
  {
    county: "Saginaw",
    utility: "Consumers Energy",
    burden: 9.6,
    medianIncome: 56200,
    annualEnergyCost: 2880,
    shutoffsPer1k: 63,
  },
  {
    county: "Calhoun",
    utility: "Consumers Energy",
    burden: 8.9,
    medianIncome: 58400,
    annualEnergyCost: 2760,
    shutoffsPer1k: 52,
  },
  {
    county: "Ingham",
    utility: "Lansing BWL",
    burden: 7.8,
    medianIncome: 62100,
    annualEnergyCost: 2590,
    shutoffsPer1k: 41,
  },
  {
    county: "Macomb",
    utility: "DTE Energy",
    burden: 7.1,
    medianIncome: 72500,
    annualEnergyCost: 2740,
    shutoffsPer1k: 38,
  },
  {
    county: "Kent",
    utility: "Consumers Energy",
    burden: 6.4,
    medianIncome: 78300,
    annualEnergyCost: 2610,
    shutoffsPer1k: 29,
  },
  {
    county: "Oakland",
    utility: "DTE Energy",
    burden: 5.2,
    medianIncome: 91400,
    annualEnergyCost: 2880,
    shutoffsPer1k: 22,
  },
];

export const affordableBurdenThreshold = 6;

export const headlineStats = [
  {
    label: "Electric rate increase since 2016",
    value: "34%",
    detail: "Michigan residential average, ahead of the national pace.",
  },
  {
    label: "Households above a 6% energy burden",
    value: "1 in 3",
    detail: "Spending more than six cents of every income dollar on energy.",
  },
  {
    label: "Shutoff notices each year",
    value: "200k+",
    detail: "Disconnection notices sent to Michigan households.",
  },
];
