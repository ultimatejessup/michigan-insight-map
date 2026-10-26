# Michigan Essentials Watch

A public advocacy tool from the [Liberation Caucus](https://liberationcaucus.com) at
[miutilitywatch.com](https://miutilitywatch.com). It helps Michigan residents see what they pay for
essential utilities, understand who decides, and make their experiences heard.

- **Tracker**: sourced utility information by county (electric, natural gas, water, broadband).
  Figures come from stored database values with a visible source; missing data is labeled, never
  estimated.
- **Bill Check**: reads a resident's bill on their own device, hides personal details, lets them
  review the text, and only then sends that text for an optional AI explanation.
- **Survey, Pledge and Build**: ways to share experiences, see candidate pledges and get involved.

## Stack

TanStack Start (React, Vite, TypeScript), Tailwind CSS, Supabase for public-read data, hosted on
Vercel.

## Development

You need Node.js and npm (or Bun).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Useful checks:

```sh
npx tsc --noEmit -p .
npx eslint .
bun test tests/redact.test.ts
```

## Project notes

Read `AGENTS.md` and `CLAUDE.md` before making changes. They record the site's data and privacy
guardrails, including the "no invented data" rule and how Bill Check handles personal information.
