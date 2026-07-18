# PROGRESS — PurePastures Emissions Calculation & Dashboard Tool

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1 — build in progress
**Last updated:** 2026-07-18 — mid-session 1
**Live URL:** none yet

## Current state
Database and reference data are live: `ef_table`, `expected_matches`,
`emissions_results` created in the shared `purepastures` Supabase project
(`ztkgbowwrlszbbfuhkid`) with RLS exactly per CLAUDE.md, and seeded with real DEFRA
2025 factors for the 3 emission sources that actually appear in Tool A's activity
data today (`src_diesel_stationary` — multi-linkage, direct combustion + Scope 3
WTT; `src_diesel_mobile`; `src_lpg_stationary`). `docs/` created; `product-spec.md`
and the two companion design docs moved in; `docs/supabase-setup.md` reconstructed
from live-schema inspection (a copy of Tool A's version wasn't in this repo at
session start) and now documents all 5 tables + the seed contents. `.claude/skills/c-more/`
installed from the uploaded `C-MORE-brand-style-sheet.md`. Frontend (Vite/React app,
calculation engine, dashboard, exports) not yet built.

## Last session
Session 1, in progress — see Current state above.

## Remaining work
- [ ] Scaffold the Vite + React + Tailwind app (`/src/lib`, `/src/components`), Supabase client via Netlify env vars
- [ ] Build the manual "Recalculate" button and calculation engine (match / fan-out / no-match / partial-match / unit reconciliation / result_tco2e / confidence_score) — never auto-fires
- [ ] Build the Emissions Dashboard view — filters, Scope 1/2/3 + Unclassified breakdown tree, hover detail, per-row validation_status toggle, run-rate forecast panel with warning banner
- [ ] Wire CSV export — full granular breakdown plus forecast figures, always all persisted records, independent of on-screen filters
- [ ] Wire PDF export — five-section C-MORE branded report, independent of on-screen filter/expand state
- [ ] Local test pass — full walkthrough including multi-linkage fan-out, zero-match Unclassified (needs a manual throwaway activity_data row — no real data produces this today), partial-match nesting, forecast with the real 10 rows, validation_status toggle persisting across reload
- [ ] Acceptance criteria pass — verify all 20 criteria in product-spec.md Section 13 before deploy
- [ ] Deploy to Netlify — builder enters VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in this tool's own Netlify site dashboard

## Build decisions
- **data_quality_rating → score mapping**: measured=5, calculated=4, estimated=2, proxy=1 (higher = better), per `docs/purepastures-ef-calc-schema-final.md` §4. Note: an earlier chat message from the builder proposed the inverted scale (measured=1/best, estimated=4-5/worst) — the uploaded schema doc's explicit table was treated as authoritative since it's the confirmed design artifact, not the offhand chat scale. Flagging here in case this should be revisited.
- **EF seed data sourcing**: the uploaded xlsx is a large multi-tab reference database, not a pre-shaped seed file. Seeded rows are traced to specific rows in its `DEFRA_factorsbyCategory_2025` tab (litres/tonnes-based DEFRA 2025 factors), not the curated "Emission Factors 2025" summary sheet (which lacks the litres/kg stationary-combustion factors needed here). LPG's factor was derived by dividing DEFRA's native tonnes-basis value by 1000 to match Tool A's kg-based storage for that source — arithmetic unit conversion, not an invented factor.
- **Grid Electricity not seeded**: no current activity_data uses it, and correctly sourcing country-specific grid + residual-mix (location-based/market-based) factors from the xlsx is a larger data-modeling task than this session's real dataset requires. Can be added later by inserting more ef_table/expected_matches rows — no schema change needed.
- **docs/supabase-setup.md reconstruction**: Tool A's copy wasn't present in this repo at session start and Tool A's GitHub repo is outside this session's scope; rebuilt instead from a live Supabase MCP schema inspection (list_tables + pg_policies + sample data), which is ground-truth accurate.
- **emissions_results re-run strategy** (not fully specified by the docs): Recalculate deletes+reinserts rows scoped to the activity rows in play, but preserves validation_status by re-matching (activity_data_ref, ef_ref) pairs from before the run — a re-click doesn't silently reset a reviewer's approved/flagged status. Stub (no-match/partial) rows always reset to pending since they represent a fresh-each-run gap.

## Known issues
- activity_data_value_converted in Tool A still uses a placeholder conversion_factor (flat 1.0, status 'TBD') — every result_tco2e this tool calculates is unreliable until Tool A replaces it with real DEFRA 2024 values in a separate build session. Do not present calculated figures as final until this is resolved.
- Not decided: whether Activity Data rows already persisted under the placeholder factor get recalculated once real factors land in Tool A, or only rows entered going forward (product-spec.md Section 15).
- Grid Electricity (Scope 2 location/market-based multi-linkage example) has no ef_table rows yet — deferred, see Build decisions above.

## Notes for next session
None — this session is still in progress; continuing straight through to the frontend build.
