# PurePastures Emissions Calculation & Dashboard Tool

## Identity
Reads Tool A's persisted activity data, matches it against an emission factor database, calculates emissions results and a confidence score, and displays a filterable Scope 1/2/3 dashboard with CSV/PDF export — collects no data through forms of its own.
Tier: 2 — calculated results persist to Supabase and survive after the tab closes, but there's no login; anyone with the link can view, filter, toggle validation status, and export. (D3+A1)
Spec version governed: v1.0
Position: Tool 2 of 2 in the purepastures stack — shares the existing Supabase project with Tool A; this tool builds on Tool A's existing schema, adding its own three tables.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line above, STOP. Tell the builder to re-run the Project Governor on the revised spec before building.
3. Read PROGRESS.md in the project root — it is the current state of this build. If it is missing, recreate it with the structure noted below, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat it back to the builder, treat it as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table or policy change), update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one.

First Session Setup (session 1 only):
1. Create docs/ and move product-spec.md and supabase-setup.md into it.
2. Install the brand skill: create .claude/skills/c-more/ and place C-MORE-brand-style-sheet.md there as SKILL.md (add minimal name/description frontmatter — it has none).
3. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL), Current state, Last session, Remaining work, Build decisions, Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Netlify · Supabase
Deployment: GitHub → Netlify, auto-deploys from main. Netlify MCP is not active — the builder connects the repo and enters environment variables in the Netlify dashboard; remind them before the first deploy.

## Arms
Export — browser only, no server function — CSV: full granular Emissions Results breakdown (every field per product-spec.md Section 3) plus the run-rate forecast and its per-month inputs, always all persisted records, independent of on-screen filters. PDF: fixed five-section C-MORE branded report (per-facility breakdown, per-year breakdown, year-over-year comparison, facility-vs-facility comparison, run-rate forecast), independent of on-screen filter/expand state.

## Calculation Engine
Not a listed arm — core business logic. Triggers only on a manual "Recalculate" button, client-side, no server function. Reads activity_data, facility_reporting_period, ef_table, and expected_matches via the Supabase anon client; computes match → fan-out → no-match/partial-match → unit reconciliation → result_tco2e → confidence_score per docs/product-spec.md Section 9; writes to emissions_results. Never fires automatically on activity_data insert or on dashboard load.

## Environment Variables
VITE_SUPABASE_URL — Supabase: Project Settings → API → Project URL — Netlify env var — reused from Tool A's project, not new
VITE_SUPABASE_ANON_KEY — Supabase: Project Settings → API → anon/public key — Netlify env var — reused from Tool A's project, not new
This tool has no server-side functions — both variables are Netlify env vars only, read directly by the frontend. No value ever appears in code or in any file committed to GitHub.

## Supabase
Project: "purepastures" — already exists. Project URL: https://ztkgbowwrlszbbfuhkid.supabase.co
docs/supabase-setup.md is the schema source of truth. Read it before any database work. Never recreate activity_data or facility_reporting_period or their policies. Update docs/supabase-setup.md at every save point that touches the database.
Plan: Free — pauses after ~1 week without traffic (same accepted trade-off as Tool A).

Tables this tool reads only (do not modify): activity_data, facility_reporting_period.

New tables to create for this tool (then document in docs/supabase-setup.md):
ef_table: ef_id, scope, category, subcategory, emission_source, emission_basis, country, calculation_method, ef_value, ef_unit, reference_year, publication_year, quality_level, notes
expected_matches: emission_source, expected_emission_basis
emissions_results: activity_data_ref (FK → activity_data), ef_ref (FK → ef_table, nullable), scope, category, subcategory, result_tco2e, confidence_score, validation_status, export_blocked, export_blocked_reason, created_at

RLS — build these policies, never skip:
ef_table: anon read-only. No insert/update/delete — backend reference data, edited outside the app.
expected_matches: anon read-only. No insert/update/delete — same as ef_table.
emissions_results: anon read-all; insert allowed (calculation engine writes via the anon client); update allowed at the table level, all columns (accepted risk, not restricted to validation_status alone); no delete.

After setup, update docs/supabase-setup.md with the three new tables, their RLS, and a last-updated line.

## Hard Rules
- API keys never in any frontend file or GitHub commit. This tool has no server-side functions — both Supabase variables are Netlify env vars only.
- Netlify Identity: never. Supabase Auth is the only authentication system in this stack (not used by this tool — A1, no login).
- RLS: never disabled on any table. If a query fails, fix the policy or the query — never disable RLS to work around it.
- This tool shares a Supabase project with Tool A. Protected tables — activity_data, facility_reporting_period — must not be modified: no schema changes, no RLS changes. Read-only, as documented in docs/supabase-setup.md.
- emissions_results UPDATE is granted at the table level, not restricted to validation_status — anyone with the link can technically alter result_tco2e, confidence_score, or export_blocked directly. This is an accepted trade-off (product-spec.md Section 6), not a bug to fix.
- Do not build any in-app editing UI for ef_table or expected_matches — both are edit-only outside the app.
- Calculation engine fires only on the manual "Recalculate" button — never automatically on activity_data insert, never automatically on dashboard load.
- activity_data_value_converted is currently computed from a placeholder conversion_factor (flat 1.0, status 'TBD') in Tool A — every result_tco2e this tool calculates is unreliable until that placeholder is replaced with real values in a separate Tool A session. Do not present calculated figures as final; this is a known limitation, not a bug to chase.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src
  /components
  /lib                ← Supabase client, utilities
/docs                 ← product-spec.md, supabase-setup.md
/.claude/skills/c-more/   ← brand skill
/public/assets
```

## Brand
Brand is governed by the c-more skill at .claude/skills/c-more/SKILL.md (installed in First Session Setup). Invoke it for any UI or visual work.
Hard rules that hold even if the skill is not loaded:
- Background: #FAFAFA (Off White) — never white or Tailwind gray defaults
- Identification/primary: #141A32 (Deep Blue) — headers, primary buttons, brand mark
- Accent: #C0FA00 (Lime) — sparingly only, never large fill areas
- Font: Figtree for all text
- Cards: white, 1px #E6E7EC border, soft shadow, ~14px radius

## Business Rules
- Match Step: filter EF rows by exact emission_source, then facility_country (fallback "ALL"), then most recent publication_year ≤ the activity's reporting year.
- Fan-out Rule: every EF row surviving the Match Step produces its own Emissions Result row — never collapsed to one result per emission_source.
- No-Match: zero matches → stub row, result_tco2e = null, export_blocked = true, no scope, appears only in the Unclassified bucket, reason = Cause B.
- Partial-Match: some but not all expected emission_basis entries satisfied → real rows for what matched, stub rows (export_blocked = true) nested under the matched scope/category for what didn't.
- Unit Reconciliation: if activity_data_unit_converted doesn't reconcile with the matched EF row's ef_unit, treat as no match — export_blocked = true, Cause A.
- result_tco2e = (activity_data_value_converted × ef_value) / 1000.
- confidence_score = round(√(data_quality_rating_score × ef_quality_level), 1) — geometric mean, 1–5 scale.
- Run-rate forecast = (Σ result_tco2e across months with ≥1 entry, export_blocked rows counted as 0) / (count of months with ≥1 entry) × 12 — equal-weighted; months with no entries are excluded from the denominator, not counted as zero.
- validation_status defaults to 'pending' on insert; any anon user can set pending/approved/flagged, single row at a time, no bulk action.
- export_blocked_reason distinguishes Cause A (Activity Data side, fix in Tool A) from Cause B (EF table gap, no in-app fix).

Out of scope — do not build:
- Emission Factor Library toggle (versioned factor sets)
- Editable/dynamic EF frontend
- New emission_source creation procedure
- Any update/delete path for export_blocked rows
- Automatic recalculation of historical rows once real conversion factors land in Tool A
- Column-restricted (function-based) write access to emissions_results
- Role-gating on the reviewer field
- Bulk validation_status changes
- Login / user accounts

## Reference Docs
Read before building the related part:
- docs/product-spec.md — full module specs, UI sections, logic, arm detail
- docs/supabase-setup.md — schema source of truth (exists — read first)
- .claude/skills/c-more/SKILL.md — full brand system
PROGRESS.md in the root is read at every session start per the Session Protocol.
