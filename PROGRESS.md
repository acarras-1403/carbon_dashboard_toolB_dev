# PROGRESS — PurePastures Emissions Calculation & Dashboard Tool

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1 — build complete and deployed
**Last updated:** 2026-07-18 — end of session 1
**Live URL:** https://ghgdashboarddev.netlify.app — deployed from `main` @ `77d6c72`, build succeeded, secret scan clean, VITE_SUPABASE_URL typo fixed (see Known issues)

## Current state
Full build complete and locally verified. Database: `ef_table`, `expected_matches`,
`emissions_results` live in the shared `purepastures` Supabase project
(`ztkgbowwrlszbbfuhkid`) with RLS exactly per CLAUDE.md, seeded with real DEFRA 2025
factors for the 3 emission sources that appear in Tool A's activity data today
(`src_diesel_stationary` — multi-linkage, direct combustion + Scope 3 WTT;
`src_diesel_mobile`; `src_lpg_stationary`). Frontend: Vite + React + Tailwind v4 app
in place (`/src/lib`, `/src/components`), Supabase client via `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY`. Calculation engine (`src/lib/matching.js` — pure logic;
`src/lib/calculationEngine.js` — Supabase I/O) implements match → fan-out →
no-match/partial-match → unit reconciliation → result_tco2e → confidence_score,
firing only on the dashboard's manual "Recalculate" button. Dashboard
(`src/components/Dashboard.jsx` + `Filters`/`ScopeTree`/`ResultRow`/`ForecastPanel`/
`QualityTag`) implements facility/year filters, the Scope 1/2/3 + Unclassified
breakdown tree with independent Scope/Category collapse, 1–5 color-coded confidence
tags (dataviz skill's fixed status palette), hover detail, per-row validation_status
cycling, and the run-rate forecast panel with a suppressed-months warning banner.
CSV (`src/lib/csvExport.js`) and PDF (`src/lib/pdfExport.js`, five fixed sections)
exports both fetch a fresh unfiltered dataset, independent of on-screen state.
`docs/supabase-setup.md` documents all 5 tables, RLS, and the seed contents.
`.claude/skills/c-more/` installed.

**Deployed:** the builder connected this repo to the Netlify site `ghgdashboarddev`
and entered `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Netlify's production
branch is `main`; `claude/tool-build-41aj2c` (this session's dev branch, containing
the full build) was fast-forward merged into `main` and pushed so Netlify had
something to build (main previously had only the pre-build markdown/spec files —
that's why the site's first deploy attempts produced no ready build). Confirmed via
Netlify MCP: deploy `6a5b4ea63063800007d02632`, commit `159d67e`, branch `main`,
context `production`, state `ready`, secret scan clean (0 matches across 34 files).
Live at https://ghgdashboarddev.netlify.app.

## Last session
Session 1 (this one) — full build, start to finish, plus deploy. First Session
Setup, schema + RLS + seed data, Vite/React/Tailwind scaffold, calculation engine,
dashboard UI, CSV/PDF export, an extensive local test pass, merging the dev branch
to `main`, and confirming the Netlify deploy went out clean.

## Remaining work
- [ ] A real click-through against the **live, deployed** site with the real Supabase project: load the dashboard, click Recalculate, confirm the 10 real activity rows produce the expected 11 emissions_results rows (9 real + the src_diesel_stationary fan-out), and exercise CSV/PDF downloads — this session verified the same logic and UI thoroughly via unit tests and mocked-network UI tests (see Known issues for why), but never against the live database end-to-end. Now that the site is deployed, this is straightforward to do from a real browser outside this sandbox.
- [ ] Acceptance criteria #1, #19, #20 (reachable at a live Netlify URL with no login gate, loads on desktop/mobile, Netlify build succeeds) — now satisfied: site is live, build succeeded, no auth gate exists in the code. Worth a quick manual confirmation on an actual phone/desktop browser.

## Build decisions
- **data_quality_rating → score mapping**: measured=5, calculated=4, estimated=2, proxy=1 (higher = better), per `docs/purepastures-ef-calc-schema-final.md` §4. Note: an earlier chat message from the builder proposed the inverted scale (measured=1/best, estimated=4-5/worst) — the uploaded schema doc's explicit table was treated as authoritative since it's the confirmed design artifact, not the offhand chat scale. Flagging here in case this should be revisited.
- **EF seed data sourcing**: the uploaded xlsx is a large multi-tab reference database, not a pre-shaped seed file. Seeded rows are traced to specific rows in its `DEFRA_factorsbyCategory_2025` tab (litres/tonnes-based DEFRA 2025 factors), not the curated "Emission Factors 2025" summary sheet (which lacks the litres/kg stationary-combustion factors needed here). LPG's factor was derived by dividing DEFRA's native tonnes-basis value by 1000 to match Tool A's kg-based storage for that source — arithmetic unit conversion, not an invented factor.
- **Grid Electricity not seeded**: no current activity_data uses it, and correctly sourcing country-specific grid + residual-mix (location-based/market-based) factors from the xlsx is a larger data-modeling task than this session's real dataset requires. Can be added later by inserting more ef_table/expected_matches rows — no schema change needed.
- **docs/supabase-setup.md reconstruction**: Tool A's copy wasn't present in this repo at session start and Tool A's GitHub repo is outside this session's scope; rebuilt instead from a live Supabase MCP schema inspection (list_tables + pg_policies + sample data), which is ground-truth accurate.
- **emissions_results re-run strategy, corrected mid-build**: the RLS design deliberately grants no anon DELETE on `emissions_results` (Hard Rule). Recalculate therefore reconciles via upsert — matching freshly computed rows against existing ones by `(activity_data_ref, ef_ref, scope, category, subcategory)`, updating in place when found and inserting when not — rather than delete+reinsert, which would have been blocked by RLS. A row's `validation_status` is preserved across recalculations since matched rows are updated, not replaced. Consequence: a result row whose underlying match stops applying (e.g. if `ef_table`/`expected_matches` changed) is never removed, since no delete path exists — documented limitation, not a bug, and not expected to occur mid-session since both reference tables are edit-only outside the app (D-7).
- **Quality tag colors**: used the dataviz skill's fixed status palette (good/warning/serious/critical — never themed) bucketed across the 1–5 confidence_score range, with a colored dot + text label (not colored text) so it stays legible regardless of contrast on any given background.
- **Acceptance criteria (product-spec.md Section 13) — status**: #2–#18 verified this session (seeding, match/fan-out/no-match/partial-match, result_tco2e and confidence_score arithmetic, filters, independent expand/collapse, quality tags, hover detail, validation_status cycling, RLS, forecast + suppressed-months banner, CSV completeness, PDF's five sections). #1/#19/#20 (live URL reachability, cross-device load, Netlify build) are open until the builder connects Netlify — see Remaining work.

## Known issues
- activity_data_value_converted in Tool A still uses a placeholder conversion_factor (flat 1.0, status 'TBD') — every result_tco2e this tool calculates is unreliable until Tool A replaces it with real DEFRA 2024 values in a separate build session. Do not present calculated figures as final until this is resolved.
- Not decided: whether Activity Data rows already persisted under the placeholder factor get recalculated once real factors land in Tool A, or only rows entered going forward (product-spec.md Section 15).
- Grid Electricity (Scope 2 location/market-based multi-linkage example) has no ef_table rows yet — deferred, see Build decisions above.
- **This sandbox's outbound network policy blocks direct browser/Node HTTPS access to the `purepastures` Supabase project host** (confirmed via the agent-proxy's own diagnostic endpoint: a 403 policy denial on `ztkgbowwrlszbbfuhkid.supabase.co`), even though the Supabase MCP tool itself (a separate, allowed channel) worked fine throughout for schema/data work. Consequence: the calculation engine, dashboard, and exports were verified thoroughly but not end-to-end against the live database — instead: (1) the pure match/fan-out/no-match/partial-match/unit-reconciliation/result_tco2e/confidence_score/forecast logic was unit-tested directly against the real seeded `ef_table` rows and the real 10 `activity_data` rows (30/30 checks passing, including hand-verified arithmetic); (2) the full UI (filters, expand/collapse, quality tags, hover detail, validation_status cycling, forecast banner) and both exports were verified by mocking the Supabase REST responses at the network layer with the same real data shapes, and screenshotting/inspecting the actual rendered output (this caught and fixed three real bugs: a CSV column-dropping bug in the forecast section, and two PDF bugs — invisible white-on-dark table headers and a clipped chart label). A live click-through against the actual database is still recommended once deployed or once that network path is available — see Remaining work.
- `npm run build` succeeds with a "chunk larger than 500kB" warning (mostly jsPDF) — not addressed, since this is an internal dashboard tool where a code-split wouldn't meaningfully change the experience.
- **Post-deploy bug, fixed**: the live site initially showed "Error loading data: TypeError: Failed to fetch" — `VITE_SUPABASE_URL` was set in Netlify as `https://ztkgbowwrlszbbfuhkid.supabase.com` (`.com`) instead of `.co`. Found by reading the site's env vars directly via Netlify MCP, corrected via the same tool, then triggered a rebuild (an empty commit, since Vite bakes `VITE_*` vars in at build time — changing the env var alone doesn't affect an already-built deploy). Confirmed the new deploy (commit `77d6c72`) built after the fix, ready, clean secret scan.

## Notes for next session
None — this session's build is complete. Next session (whenever it happens) should
start with the live click-through described in Remaining work, then proceed to
deploy.
