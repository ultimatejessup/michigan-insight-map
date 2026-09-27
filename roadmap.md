# Michigan Utility Rate Tracker — roadmap

- [x] Design system (blue/orange/white, WCAG AA), fonts
- [x] Sticky header + footer with Liberation Caucus language
- [ ] Home `/`: slim hero (<220px desktop)
- [ ] Home: two-column tracker — Michigan county choropleth left (~45%, sticky), tabbed details right (~55%, sticky); stacked with 300px map on mobile
- [ ] Map: blue shades by metric (energy burden default / average rate toggle), orange selected county, hover tooltip, county select dropdown, legend
- [ ] Details tabs: Electric, Natural Gas (monthly line chart May 2018–Aug 2026, utility filter, 3 stat cards, energy burden card), Water & Broadband "Data coming soon"
- [ ] Source line with link on every chart/stat card
- [ ] Section C: Share Your Story form (`#share-your-story`)
- [ ] `/pledge`: Candidate Pledge page + form (Section D)
- [ ] Head metadata per route

Blocked / later:
- Real data + stories/pledges persistence — user chose "pages first, data later"; no database connected yet.

## Content guardrails (must hold everywhere)
- No HB 4918 / broadband bill citations; broadband = data tab + story-form policy statement only.
- No conflation of HB 5676-5677 with the Caucus's own proposal; Caucus proposal off-site for now.
- Never invent data -> "coming soon" state; every data point shows a source link.
- Party never shown publicly.
