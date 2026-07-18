# Product Spec — PurePastures Emissions Calculation & Dashboard Tool

**Version:** 1.0
**Date:** 2026-07-17
**Author:** Andrea
**Status:** Confirmed

---

## Section 1 — Tool Summary

**Tool name:** PurePastures Emissions Calculation & Dashboard Tool ("Tool B")

**What it does:** Reads Activity Data and Facility Reporting Period records already persisted by Tool A, matches each activity entry against an Emission Factor (EF) database, calculates `result_tco2e` and a `confidence_score` per matched row, and displays the results as a filterable Scope 1/2/3 emissions dashboard with data-quality indicators, a run-rate forecast, and CSV/PDF export. It collects no data through forms of its own — it is a calculation and display layer on top of Tool A's data.

**Who uses it:** Same audience as Tool A — AI Lab curriculum participants, not yet deployed for PurePastures Dairy Cooperative's actual staff. Designed to match how staff would use it once live: reviewing calculated emissions, checking data quality, and flagging results that need a second look.

**Why it exists:** Completes the G-3 stack goal — Tool A's schema was deliberately restructured (D-6: scope/category/subcategory moved to the EF table) specifically so this tool could exist. Without it, Tool A's persisted activity data has no emissions output at all; the placeholder Dashboard nav tab in Tool A has pointed at a URL with nothing behind it since v4.0.

**Build status:** First build — no prior version of this tool exists. The EF table schema and calculation logic were documented in advance (`purepastures-ef-calc-schema-final.md`, `purepastures-calculation-logic.md`) but never built or run through a Tool Architect interview until this session.

---

## Section 2 — Classification

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | Yes |

**Reason:** Calculated Emissions Results, the EF table, and the Expected Matches table must persist and be readable across sessions and by anyone with the link — the whole point of the dashboard is showing accumulated results over time, not a one-time session calculation.

**D3 triggers — checked against this tool's actual workflow:**
- [x] Data must be retrievable after the session ends — calculated results must still be there next time the dashboard loads
- [x] Multiple sessions contribute to the same dataset — new Activity Data entered in Tool A across many sessions continuously feeds new Emissions Results
- [ ] An audit trail or history is needed — not requested this iteration
- [x] Data submitted by one person must be visible to another — `validation_status` set by one viewer is visible to all, since there is no login to scope it
- [ ] Results must be accessible via a URL after the session ends — not requested beyond the standard dashboard URL
- [ ] Files uploaded by users must be stored and retrievable later — not applicable, this tool has no uploads

---

### Access Model

**Decision:** A1

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | Yes |
| A2 — Authentication | Users must log in. | No |
| A3 — Authorization | Users must log in and have different roles. | No |

**Reason:** Matches Tool A's existing no-restriction design (G-3 Scope: "no auth: A1 holds"). Anyone with the link can view the dashboard, use filters, export, and toggle `validation_status`.

---

### Tier

**Tier:** 2

| Tier | D+A combination | This tool |
|------|----------------|-----------|
| 2 | D3+A1 | ✅ Matches (D3+A1) |

Plain language: this tool stores calculated data in a database and it survives after someone closes the tab, but there is still no login — anyone with the link can view and interact with it.

---

### Standalone or Stack

**This tool is:** Part of a stack. Tool B — reads Tool A's `activity_data` and `facility_reporting_period` tables, and owns three new tables (`ef_table`, `expected_matches`, `emissions_results`) in the same `purepastures` Supabase project Tool A created.

---

## Section 3 — Arms

### AI API Arm

**Active:** No

---

### Export Arm

**Active:** Yes

| Detail | Answer |
|--------|--------|
| Format | CSV and PDF |
| What is exported | **CSV** — full granular Emissions Results breakdown (every row: facility, reporting period, emission_source, scope, category, subcategory, emission_basis, activity value + unit, EF value + unit, result_tco2e, confidence_score, validation_status, export_blocked + reason), plus the run-rate forecast figure and its per-month inputs, in one download. Independent of on-screen filters — always all persisted records. **PDF** — fixed standard report (see design intent below), independent of on-screen filter/expand state. |
| PDF design intent | Fixed layout, C-MORE brand (same as Tool A). Structure: (1) per-facility breakdown — Scope 1/2/3 + Unclassified totals and emission_source detail for each facility; (2) per-year breakdown — same structure grouped by reporting year; (3) year-over-year comparison — total tCO2e per year, chart + table; (4) facility-vs-facility comparison — total tCO2e per facility, chart + table; (5) run-rate forecast — current-year projected total, with the list of months whose totals were suppressed to zero by `export_blocked` rows. All sections always render at full granularity — the PDF does not reflect whatever filter or collapse state the user had on the live dashboard. |

---

### Email Arm

**Active:** No

---

### Scheduled Automation Arm

**Active:** No

---

## Section 4 — Stack and Deployment

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind |
| Deployment target | Netlify |
| Netlify MCP | Not active — deployment is a manual step in the Netlify dashboard after Claude Code finishes each session. |

**GitHub:** New repo required for this tool, separate from Tool A's repo — per the stack rule, each tool in the stack gets its own repo, its own CLAUDE.md, its own PROGRESS.md, and its own Netlify site. Create the repo before opening Claude Code; upload this spec, plus the CLAUDE.md and PROGRESS.md the Project Governor produces from it, to the repo root.

---

### Supabase project

**Supabase project status:** Existing — this tool joins Tool A's already-created project, it does not create its own.

| Detail | Answer |
|--------|--------|
| Project name | purepastures |
| Project ID | ztkgbowwrlszbbfuhkid |
| supabase-setup.md location | `docs/supabase-setup.md` — must be pulled fresh from Tool A's GitHub repo before this tool's build session starts, not from a local or Project copy (per this project's own drift-prevention rule) |

> Claude Code will read `docs/supabase-setup.md` before making any schema changes, and will not recreate Tool A's existing `activity_data` or `facility_reporting_period` tables or policies. It adds `ef_table`, `expected_matches`, and `emissions_results` alongside them, then updates `docs/supabase-setup.md` to reflect the additions.

**Supabase plan:** Free — same accepted trade-off as Tool A (Decision Registry D-15): the project pauses after roughly a week of no traffic, and this has already been chosen deliberately once for this project. If the live tool shows connection errors after an idle period, this is expected, not a defect.

---

### Stack

**Stack name / Supabase project name:** purepastures

**This tool's role in the stack:** Tool B — calculation engine and emissions dashboard. Reads Tool A's `activity_data` and `facility_reporting_period` tables; owns `ef_table`, `expected_matches`, and `emissions_results`.

**Other tools in this stack:**

| Tool | Tier | Role in the stack |
|------|------|------------------|
| Tool A (existing, live) | Tier 2 | Activity data capture — manual entry, CSV import, Facility Reporting Period. Created the shared Supabase project and its own two tables. |
| Tool B (this spec) | Tier 2 | EF database + calculation engine + emissions dashboard. Reads Tool A's tables, writes its own three tables. |

> **Build order:** Tool A already exists and created `docs/supabase-setup.md` — that precondition is satisfied. This tool's build session must start by pulling the current version of that file from Tool A's GitHub repo, not assuming it is unchanged since this spec was written.

---

## Section 5 — Data Architecture

**What data is collected or stored in this tool:**

**ef_table**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| ef_id | Unique ID | Auto-generated | Automatic | Yes |
| scope | Scope (1/2/3) | Controlled value | Loaded from EF source data | Yes |
| category | Category | Controlled value | Loaded from EF source data | Yes |
| subcategory | Subcategory | Controlled value | Loaded from EF source data | Yes |
| emission_source | Emission source | Controlled value — must match Tool A's `emission_source` list exactly | Loaded from EF source data | Yes |
| emission_basis | Emission basis (e.g. direct_combustion, location_based, market_based, upstream_WTT) | Controlled value | Loaded from EF source data | Yes |
| country | Country, or "ALL" as fallback | Controlled value | Loaded from EF source data | Yes |
| calculation_method | activity_based / hybrid / spend_based | Controlled value | Loaded from EF source data | Yes |
| ef_value | Emission factor value | Number | Loaded from EF source data | Yes |
| ef_unit | Unit of the factor (e.g. kgCO2e/litre) | Text | Loaded from EF source data | Yes |
| reference_year | Year the underlying source data was measured | Number (YYYY) | Loaded from EF source data | Yes |
| publication_year | Year this database edition was published | Number (YYYY) | Loaded from EF source data | Yes |
| quality_level | EF's own quality tier, 1–5 | Number | Loaded from EF source data | Yes |
| notes | Notes | Text | Loaded from EF source data | No |

Seed data: `Emission_Factors_database_2025_reduced_1.xlsx`, confirmed as the real dataset for this table, loaded once at build/setup time — not entered through any form. No in-app EF editing this iteration (D-7, still deferred).

**expected_matches**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| emission_source | Emission source | Controlled value — must match ef_table / Tool A's list exactly | Loaded from EF source data | Yes |
| expected_emission_basis | Expected emission basis for this source | Controlled value | Loaded from EF source data | Yes |

Only multi-linkage emission sources (e.g. Grid Electricity, Diesel — Stationary Generator) need rows here — anything absent is expected to produce exactly one match.

**emissions_results**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| activity_data_ref | Reference to the source Activity Data row | Reference (Tool A's `activity_data` table) | Automatic (calculation engine) | Yes |
| ef_ref | Reference to the matched EF row | Reference (`ef_table`) | Automatic (calculation engine) | No — null for zero-match "Unclassified" rows |
| scope, category, subcategory | Derived scope/category/subcategory | Derived from matched EF row | Automatic | No — null for zero-match "Unclassified" rows |
| result_tco2e | Calculated emissions result | Number, computed | Automatic | No — null for stub/blocked rows |
| confidence_score | Confidence score, 1–5 | Number, computed — `round(√(data_quality_rating_score × ef_quality_level), 1)` | Automatic | No — null where either input is unavailable |
| validation_status | pending / approved / flagged | Dropdown, user-editable | User (dashboard toggle, anyone with the link) | Yes — defaults to `pending` |
| export_blocked | Whether this row is blocked from being treated as final | Boolean | Automatic | Yes |
| export_blocked_reason | Which of the two block causes applies, and why | Text — one of: unit/EF-match issue traced to Activity Data (Cause A, fix in Tool A), or no EF match exists for this source/country/year (Cause B, EF table gap, no in-app fix) | Automatic | No — null when not blocked |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| ef_table | One row per emission factor edition/basis combination | scope, emission_basis, category, subcategory, emission_source, country, publication_year (unique together) |
| expected_matches | One row per (emission_source, expected emission_basis) pair for multi-linkage sources | emission_source, expected_emission_basis |
| emissions_results | One row per matched (or stubbed) Activity Data × EF combination | activity_data_ref, ef_ref |

**File storage:** No.

**Derived or calculated data:** Yes.
- `result_tco2e` — per matched EF row, `(activity_data_value_converted × ef_value) / 1000`.
- `confidence_score` — `round(√(data_quality_rating_score × ef_quality_level), 1)`.
- Scope/category/subcategory on each Emissions Result — pulled from the matched EF row, not stored on Activity Data.
- Run-rate forecast — computed at read time from persisted `emissions_results`, not stored as its own table: `(sum of result_tco2e across all months with entries, export_blocked rows counted as 0) / (count of months with entries) × 12`, equal-weighted, with a banner listing which months had suppressed totals.

---

## Section 6 — Access and Permissions

### RLS rules — who can read and write what

| Table | User type | Can read | Can insert | Can update | Can delete |
|-------|----------|----------|------------|------------|------------|
| ef_table | Unauthenticated (anon) | All rows | No | No | No |
| expected_matches | Unauthenticated (anon) | All rows | No | No | No |
| emissions_results | Unauthenticated (anon) | All rows | Yes (calculation engine only, see Section 9) | **Yes — table-level, all columns** | No |

> **Accepted risk, documented deliberately:** `emissions_results` UPDATE is granted at the table level, not restricted to `validation_status` alone. This means anyone with the link can technically alter `result_tco2e`, `confidence_score`, or `export_blocked` directly, not just toggle validation status — there is no login to trace a change back to a person. This was raised explicitly and accepted as consistent with the tool's broader no-auth, no-login design (same class of trade-off as Decision Registry D-15's idle-pause acceptance for the Supabase plan). A column-restricted alternative (a Postgres function granting EXECUTE instead of raw UPDATE) was proposed and declined.
>
> `ef_table` and `expected_matches` have no anon write access at all — both are backend reference data, edited only via direct database or CSV edit outside either tool's UI (per D-7).

---

## Section 7 — GDPR

**GDPR outcome:** Not applicable — confirmed during this interview. This tool collects no personal data through its own forms or uploads; it has no forms.

**Caveat, documented rather than silently assumed:** the dashboard's hover panel displays Tool A's already-collected `reviewer` field (a self-reported name, consented to under Tool A's GDPR framework for "internal accountability purposes"). Tool A is A1 with no login, so this tool extends visibility of that name to anyone with the dashboard link, not just an internal reviewer. This was raised explicitly and confirmed as an accepted continuation of Tool A's existing consent scope — no additional access gate is being built on the `reviewer` field in this tool. If this changes, it requires either an amendment to Tool A's consent statement or an access restriction on this field, neither of which is in scope here.

---

## Section 8 — Screen and UI Structure

### Emissions Dashboard (single primary view)

- **Purpose:** Show calculated GHG emissions results, broken down by scope, filterable by facility and year, with data quality visible at a glance and enough detail on hover to trace any number back to its source.
- **What is visible:**
  - Filters: facility (dropdown), reporting year (dropdown).
  - Breakdown tree: Scope 1, Scope 2, Scope 3, and **"Unclassified: no EF found"** as a fourth top-level bucket alongside the three scopes (holds zero-match `export_blocked` rows, which have no scope to nest under per the EF-derived schema). Each scope expands to categories, which expand to individual `emission_source` rows. Totals are fully expanded by default; the user can collapse at the Scope level or the Category level independently.
  - Every row shows its `result_tco2e` value with units, and a 1–5 color-coded data-quality tag.
  - Partial-match `export_blocked` rows nest inside their matched scope/category with an inline flag; zero-match blocked rows appear only in the Unclassified bucket, with the reason "no EF found."
  - Each `export_blocked` row's flag distinguishes Cause A (Activity Data side — fix by re-entering the row in Tool A) from Cause B (EF table side — no in-app fix, EF table is edit-only outside the app per D-7).
  - Run-rate forecast panel: projected current-year total, plus a warning banner naming any months whose totals were suppressed to zero by blocked rows.
  - Hover on any emission_source row: shows the underlying activity data value + unit, the matched EF value + unit, both quality scores (data_quality_rating and ef quality_level), the `reviewer` name, and the evidence link if present.
  - Per-row `validation_status` control (pending / approved / flagged) — single row at a time, no bulk action. "Flagged" means a reviewer looked at the result and doesn't understand why it came out that way, and is requesting a second look — distinct from `export_blocked`, which is a system-detected data gap.
  - "Download CSV" and "Download PDF" buttons.
- **User actions:** Filter by facility/year; expand or collapse scopes and categories; hover any row for detail; set a row's `validation_status`; download CSV or PDF.
- **What happens next:** Filtering and expand/collapse are client-side, instant. Setting `validation_status` writes directly to `emissions_results` (no confirmation step). CSV/PDF downloads always reflect all persisted records at full granularity, regardless of the current filter/expand state on screen.

---

## Section 9 — Logic and Calculations

**What is calculated:** Emissions results for every Activity Data entry, matched against the EF table, plus a run-rate forecast derived from those results.

### 1. Match Step
For each Activity Data row: filter EF rows by exact `emission_source` match, then by `facility_country` (exact match, falling back to `country = "ALL"`), then by `publication_year` (most recent edition where `publication_year ≤ year(activity's reporting_period)`). Surviving rows are this entry's matched EF row(s).

### 2. Fan-out Rule
Each EF row surviving the Match Step generates its own Emissions Result row — an emission_source is never collapsed to a single result. Each result inherits `scope`, `category`, `subcategory`, and `emission_basis` from its matched EF row.

### 3. No-Match / Incomplete-Match Rule
Compared against `expected_matches` for that emission_source:
- **Zero matches** (no `expected_matches` entries for this source, or a multi-linkage source with nothing matched at all): no Emissions Result row with real values — the row is a stub with `result_tco2e = null`, `export_blocked = true`, `export_blocked_reason` = Cause B ("no EF found"), and no scope/category — it appears only in the dashboard's **Unclassified** bucket.
- **Partial matches** (some but not all expected `emission_basis` entries satisfied): generate real Emissions Result rows for what matched; for each unmatched expected basis, create a stub row (`result_tco2e = null`, `export_blocked = true`) nested under whatever scope/category *did* match, so the gap is visible in context rather than only in Unclassified.

### 4. Unit Reconciliation
`activity_data_value_converted` (from Tool A) is treated as accurate for this calculation, using real DEFRA 2024 unit-conversion factors (average biofuel blend for Diesel and Petrol; Natural Gas confirmed as litres-metered at PurePastures) rather than Tool A's current 1.0/TBD placeholder table. **This assumption depends on Tool A's live `conversion_factor` lookup table actually being updated from placeholder to these real values — that update has not been made as of this spec's writing, is a separate Tool A build-session dependency, and is tracked as a blocking Open Question below.** If `activity_data_unit_converted` still doesn't reconcile with the matched EF row's `ef_unit` at calculation time, treat it the same as a missing EF match: `export_blocked = true`, Cause A (fix by re-entering the Activity Data row).

### 5. result_tco2e Formula
```
result_tco2e = (activity_data_value_converted × ef_value) / 1000
```

### 6. confidence_score Formula
```
confidence_score = round(√(data_quality_rating_score(1–5) × ef_quality_level(1–5)), 1)
```
Geometric mean — a weak input pulls the score toward the weaker value rather than being smoothed out by averaging.

### 7. Run-Rate Forecast
```
forecast = (Σ result_tco2e across all months with ≥1 Activity Data entry, with export_blocked rows counted as 0) / (count of months with ≥1 entry) × 12
```
All months weighted equally. The dashboard displays a warning banner naming any month(s) whose total was suppressed toward zero by one or more `export_blocked` rows, so the forecast's reliability is visible alongside the number.

**Edge cases:** A facility/year with zero Activity Data entries contributes nothing to the forecast denominator (not a zero month — an absent one). A row that is `export_blocked` for Cause A can only be corrected by re-entering it in Tool A; a row blocked for Cause B has no fix available in either tool's UI this iteration.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** C-MORE brand skill (`C-MORE-brand-style-sheet.md`), same as Tool A. Upload flat to this tool's repo root; Claude Code installs it to `.claude/skills/c-more/` during First Session Setup.

**Visual feel:** Unchanged from Tool A — neutrals leading, Deep Blue (#141A32) for identification, Lime (#C0FA00) sparingly for accent, Figtree typography, Off White (#FAFAFA) backgrounds. The Unclassified bucket and blocked-row flags use the same card/tag styling as the rest of the breakdown — no new visual language introduced for them.

---

## Section 11 — API and Credentials

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase | Database (ef_table, expected_matches, emissions_results; reads Tool A's activity_data, facility_reporting_period) | Anon key (public, browser-safe) | Netlify environment variables |

No other external services. No AI API, no email service.

**Credentials readiness:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase anon key | Already exists for the `purepastures` project (created during Tool A's build) — reuse, do not recreate | Supabase dashboard → Project Settings → API |

---

## Section 12 — Out of Scope — Phase 2

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| Emission Factor Library toggle (versioned factor sets) | Explicitly deferred to a later iteration this session |
| Editable/dynamic EF frontend | Already deferred (D-7, prior iteration) |
| New emission_source creation procedure | Already deferred (D-8, prior iteration) |
| In-app fix for export_blocked rows, either cause | No update/delete path exists for Cause A (fix lives in Tool A); no editable EF frontend exists for Cause B (D-7) |
| Populating real conversion_factor values in Tool A's live table | Separate Tool A build-session dependency, not built here — see Section 15 |
| Recalculating historical Activity Data rows once real factors land in Tool A | Not decided this session — see Section 15 |
| Column-restricted (function-based) write access to emissions_results | Considered and explicitly declined in favor of accepting the broader table-level UPDATE risk |
| Role-gating or additional access restriction on the reviewer field | Explicitly confirmed not needed this iteration |
| Bulk validation_status changes | Matches Tool A's existing no-bulk-action pattern for Data Review |
| Login / user accounts (A2/A3) | Unchanged from the stack's overall A1 design |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 1 | Tool loads with no login | Reachable directly at its Netlify URL, no auth gate | [ ] |
| 2 | EF table and Expected Matches are seeded correctly | Row counts and sample values match `Emission_Factors_database_2025_reduced_1.xlsx` | [ ] |
| 3 | Match Step produces correct single-match results | A known single-linkage emission_source produces exactly one Emissions Result row | [ ] |
| 4 | Fan-out Rule produces correct multi-match results | A known multi-linkage source (e.g. Grid Electricity) produces one row per expected emission_basis | [ ] |
| 5 | Zero-match rows appear only in Unclassified | A source with no EF match at all shows `export_blocked = true`, no scope, and appears in the Unclassified bucket only | [ ] |
| 6 | Partial-match rows nest correctly | A partially-matched source shows real results under its matched scope/category, plus a stub for the unmatched basis in the same location | [ ] |
| 7 | result_tco2e formula is correct | Spot-check against the formula in Section 9 §5 for at least one row per calculation_method | [ ] |
| 8 | confidence_score formula is correct | Spot-check against Section 9 §6 for at least one row of each data_quality_rating / quality_level combination | [ ] |
| 9 | Dashboard filters work | Selecting a facility and/or year correctly narrows the breakdown tree | [ ] |
| 10 | Expand/collapse works at both levels | Scope-level and Category-level collapse controls work independently of each other | [ ] |
| 11 | Data-quality tags render correctly | Each row's 1–5 tag matches its stored confidence_score, color-coded | [ ] |
| 12 | Hover panel shows correct detail | Activity value + unit, EF value + unit, both quality scores, reviewer, evidence link (if present) all display correctly | [ ] |
| 13 | validation_status toggle works | A user can cycle a row through pending/approved/flagged; change is visible to a different browser session with no login | [ ] |
| 14 | RLS matches Section 6 | anon can read/insert/update emissions_results, read-only on ef_table and expected_matches — verified via Supabase dashboard or QA skill | [ ] |
| 15 | Run-rate forecast formula is correct | Spot-check against Section 9 §7, including a case with at least one export_blocked month | [ ] |
| 16 | Forecast warning banner is accurate | Banner names exactly the months that had suppressed totals, no more, no fewer | [ ] |
| 17 | CSV export is complete | Downloaded file contains every persisted emissions_results row plus the forecast figure, independent of on-screen filters | [ ] |
| 18 | PDF export matches design intent | All five sections from Section 3's PDF design intent are present, correctly branded, independent of on-screen state | [ ] |
| 19 | Tool deploys and is accessible | Live Netlify URL loads correctly, no login gate, on desktop and mobile | [ ] |
| 20 | Netlify build succeeds after Claude Code pushes to main | Checked manually by the builder in the Netlify dashboard | [ ] |

---

## Section 14 — Build Path

**This tool's tier:** Tier 2

### Pre-build steps

- [x] Tool Architect skill — interview complete, this spec written and confirmed
- [ ] Project Governor skill — CLAUDE.md and PROGRESS.md produced from this spec
- [ ] New GitHub repo created for Tool B (separate from Tool A's repo)
- [ ] product-spec.md, CLAUDE.md, PROGRESS.md uploaded to this repo's root
- [ ] C-MORE-brand-style-sheet.md uploaded to this repo's root
- [ ] Netlify connected to this new repo (Netlify MCP not active — manual)
- [ ] Current `docs/supabase-setup.md` pulled fresh from Tool A's GitHub repo (not from a local or Project copy) and placed in this repo before the build session
- [ ] New `DECISIONS.md` entry logged reversing D-10 (placeholder conversion factors), referencing this spec, before this build starts
- [ ] Confirm no credentials need creating — Supabase anon key already exists for the `purepastures` project (reused, not recreated)

### Tier 2 — build session

- [ ] Open Claude Code in the project folder
- [ ] Claude Code reads product-spec.md, CLAUDE.md, PROGRESS.md, and the pulled-fresh docs/supabase-setup.md
- [ ] Claude Code confirms the existing `purepastures` project connection (does not create a new project)
- [ ] Claude Code builds `ef_table`, `expected_matches`, `emissions_results` and their RLS policies via Supabase MCP, per Section 6
- [ ] Claude Code seeds `ef_table` and `expected_matches` from `Emission_Factors_database_2025_reduced_1.xlsx`
- [ ] Claude Code updates `docs/supabase-setup.md` with the new tables and policies
- [ ] Claude Code builds the calculation engine (Match → Fan-out → No-Match/Partial-Match → Unit Reconciliation → result_tco2e → confidence_score), per Section 9 — trigger mechanism to be confirmed per Open Question below before this step
- [ ] Claude Code builds the Emissions Dashboard frontend, per Section 8
- [ ] Claude Code builds CSV and PDF export, per Section 3
- [ ] Test locally before deploying, including: multi-linkage fan-out, zero-match Unclassified handling, partial-match nesting, forecast calculation with a blocked month, validation_status toggle
- [ ] Claude Code commits and pushes to `main` — Netlify's native integration deploys automatically
- [ ] Add Supabase environment variables in the Netlify dashboard (Netlify MCP not active)
- [ ] Optional post-build: run Supabase QA skill to verify schema and RLS policies

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| How does the calculation engine actually trigger — a database trigger on `activity_data` insert (Supabase Edge Function), or on-demand recalculation (e.g. every dashboard load, or a manual "recalculate" button)? Recommended default if not otherwise decided: a Supabase Edge Function triggered on `activity_data` insert, since no user-facing trigger was specced in Section 8. | Andrea / Claude Code | Yes — must resolve before the calculation engine is built |
| Real conversion_factor values (DEFRA 2024, average biofuel blend) still need to be written into Tool A's live `conversion_factor` table, replacing the 1.0/TBD placeholders — this spec's Section 9 §4 assumption depends on that update happening. | Andrea (separate Tool A build session) | No — Tool B can be built now, but its numbers are not trustworthy until this lands |
| Do Activity Data rows already persisted under the old 1.0/TBD placeholder need to be recalculated or re-entered once real factors land in Tool A, or does the fix only apply to rows entered going forward? | Andrea | No — not decided this session, flagged so it isn't forgotten |

---

## Section 16 — Tool Version History

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 2026-07-17 | Initial build — EF table, Expected Matches, and Emissions Results schema; calculation engine (match/fan-out/no-match/partial-match, unit reconciliation, result_tco2e, confidence_score); Scope 1/2/3 + Unclassified emissions dashboard with facility/year filters, data-quality tags, hover detail, per-row validation_status toggle; run-rate forecast; CSV and PDF export. Joins Tool A's existing `purepastures` Supabase project as Tier 2 (D3+A1). |

---

*This spec is written for Claude Code. It assumes zero prior context.*
