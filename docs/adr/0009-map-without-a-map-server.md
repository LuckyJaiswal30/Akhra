# 9. The district map is generated SVG, not map tiles

**Status:** Accepted · 2026

## Context

Two pages show where reports come from. The first version drew a hand-made polygon of the state
with dots on it: it was not Jharkhand's real shape, and it looked it. The alternative in the app
was a Leaflet map fetching OpenStreetMap tiles on every page view.

## Decision

Real district boundaries, converted once into SVG paths and shipped with the app.
`packages/shared/scripts/build-district-shapes.mts` takes geoBoundaries' India ADM2 set — whose
source is the Government of India's Local Government Directory — keeps Jharkhand's 24 districts,
simplifies them to about half a kilometre, and writes `district-shapes.ts` (34 KB).

## Alternatives

- **Leaflet with OSM tiles everywhere.** A government portal would depend on a donated tile service
  for its own districts; OSM's policy blocks heavy use, and every reader pays for the tiles.
- **A commercial tile key.** See [0007](0007-no-paid-dependencies.md).

## Consequences

- No tile server, no map library, no API key, and the map arrives with the rest of the page.
- The boundary data is ODbL 1.0, so every page drawing it carries the credit, in both languages.
- Districts are matched to Akhra's codes by an explicit table in the script, never by fuzzy name
  matching: a spelling change must fail loudly rather than put one district's outline under
  another's name.
- Leaflet remains for the one place that needs a real basemap: dropping a pin when reporting.
