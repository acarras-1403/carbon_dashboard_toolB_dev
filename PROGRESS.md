# PROGRESS — PurePastures Emissions Calculation & Dashboard Tool

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 0 — build not started
**Last updated:** 2026-07-17 — by Project Governor, pre-build
**Live URL:** none yet

## Current state
Nothing built. Repo contains CLAUDE.md, PROGRESS.md, product-spec.md, supabase-setup.md, C-MORE-brand-style-sheet.md (brand skill — installed in session 1). GitHub repo created and connected to a new, separate Netlify site; env vars not yet entered there.

## Last session
None — the first build session has not happened yet.

## Remaining work
- [ ] First Session Setup: create docs/, move product-spec.md and supabase-setup.md into it, install the c-more brand skill, commit (see CLAUDE.md Session Protocol)
- [ ] Connect to Supabase project "purepastures" and read docs/supabase-setup.md before any database work
- [ ] Create ef_table, expected_matches, emissions_results and their RLS policies, then update docs/supabase-setup.md
- [ ] Seed ef_table and expected_matches from Emission_Factors_database_2025_reduced_1.xlsx
- [ ] Build the Emissions Dashboard view — filters, Scope 1/2/3 + Unclassified breakdown tree, hover detail, per-row validation_status toggle, run-rate forecast panel with warning banner
- [ ] Build the manual "Recalculate" button and calculation engine (match / fan-out / no-match / partial-match / unit reconciliation / result_tco2e / confidence_score)
- [ ] Wire CSV export — full granular breakdown plus forecast figures, always all persisted records, independent of on-screen filters
- [ ] Wire PDF export — five-section C-MORE branded report, independent of on-screen filter/expand state
- [ ] Local test pass — full walkthrough including multi-linkage fan-out, zero-match Unclassified, partial-match nesting, forecast with a blocked month, validation_status toggle
- [ ] Acceptance criteria pass — verify all 20 criteria in product-spec.md Section 13 before deploy
- [ ] Deploy to Netlify — builder enters VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in this tool's own Netlify site dashboard

## Build decisions
None yet.

## Known issues
- activity_data_value_converted in Tool A still uses a placeholder conversion_factor (flat 1.0, status 'TBD') — every result_tco2e this tool calculates is unreliable until Tool A replaces it with real DEFRA 2024 values in a separate build session. Do not present calculated figures as final until this is resolved.
- Not decided: whether Activity Data rows already persisted under the placeholder factor get recalculated once real factors land in Tool A, or only rows entered going forward (product-spec.md Section 15).

## Notes for next session
None.
