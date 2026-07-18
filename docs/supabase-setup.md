# Supabase Setup — purepastures

**Project:** `purepastures`
**Project ID / ref:** `ztkgbowwrlszbbfuhkid`
**Project URL:** https://ztkgbowwrlszbbfuhkid.supabase.co
**Plan:** Free (pauses after ~1 week idle — accepted trade-off, see CLAUDE.md)

> This file was reconstructed by Tool B's session 1 build via direct live-schema
> inspection (Supabase MCP `list_tables` + `pg_policies` query against the project),
> since a copy of Tool A's `docs/supabase-setup.md` was not available in this repo
> at session start. It reflects the schema exactly as it exists in the database.

---

## Tables owned by Tool A (read-only for Tool B — never modify schema or policies)

### `activity_data`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | `default gen_random_uuid()` |
| reporting_period | text | e.g. `"2026-07"` (YYYY-MM) |
| facility | text | hardcoded facility slug, e.g. `fac_north_farm` |
| emission_source | text | sole join key to `ef_table` — must match exactly |
| activity_data_value_raw | numeric | as entered |
| activity_data_unit_raw | text | as entered |
| activity_data_value_converted | numeric | backend-only; currently computed from Tool A's placeholder `conversion_factor` (flat 1.0, status 'TBD') — unreliable until Tool A replaces it with real values (separate Tool A session) |
| activity_data_unit_converted | text | backend-only, base unit |
| data_quality_rating | text | observed values in live data: `measured`, `calculated`, `estimated` (schema docs also allow `proxy`, not yet seen) |
| notes | text, nullable | |
| evidence_link | text, nullable | |
| reviewer | text, nullable | self-reported, no login to verify |
| facility_reporting_period_ref | uuid, FK → `facility_reporting_period.id` | |
| created_at | timestamptz | `default now()` |

RLS: anon `SELECT` (all rows), anon `INSERT` (`with_check: true`). No anon UPDATE/DELETE.

### `facility_reporting_period`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | `default gen_random_uuid()` |
| facility | text | |
| reporting_year | integer | |
| facility_country | text | e.g. `Ireland`, `Germany` |
| production_volume | numeric | |
| annual_revenue | numeric | |
| created_at | timestamptz | `default now()` |

RLS: anon `SELECT` (all rows), anon `INSERT` (`with_check: true`). No anon UPDATE/DELETE.

Foreign key: `activity_data.facility_reporting_period_ref → facility_reporting_period.id`.

**Tool B never creates, alters, or drops either table or their policies.**

---

## Tables owned by Tool B

### `ef_table`

Backend calculation reference data. No anon write access — edited only via direct
database or CSV edit outside the app (D-7).

| Column | Type | Notes |
|---|---|---|
| ef_id | uuid, PK | `default gen_random_uuid()` |
| scope | text | e.g. `Scope 1`, `Scope 2`, `Scope 3` |
| category | text | e.g. `Stationary Combustion`, `Mobile Combustion` |
| subcategory | text | e.g. `Liquid Fuels`, `Gaseous Fuels` |
| emission_source | text | must match Tool A's `emission_source` values exactly |
| emission_basis | text | e.g. `direct_combustion`, `upstream_WTT`, `location_based`, `market_based` |
| country | text | ISO-ish country name, or `"ALL"` fallback |
| calculation_method | text | `activity_based` / `hybrid` / `spend_based` |
| ef_value | numeric | blended CO2e factor |
| ef_unit | text | e.g. `litres`, `kg` — reconciled against `activity_data_unit_converted` |
| reference_year | integer | year underlying source data was measured |
| publication_year | integer | year this factor edition was published |
| quality_level | numeric | 1–5, EF's own quality tier |
| notes | text, nullable | source traceability |

RLS: anon `SELECT` only. No insert/update/delete policies exist.

### `expected_matches`

Declares which `emission_source` values are multi-linkage (expected to fan out into
more than one `emissions_results` row). Absence of rows for a source = expected
single match.

| Column | Type | Notes |
|---|---|---|
| emission_source | text | must match `ef_table` / Tool A's list exactly |
| expected_emission_basis | text | e.g. `direct_combustion`, `upstream_WTT` |

RLS: anon `SELECT` only. No insert/update/delete policies exist.

### `emissions_results`

Calculated by the client-side calculation engine (manual "Recalculate" button only).

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | `default gen_random_uuid()` |
| activity_data_ref | uuid, FK → `activity_data.id` | not unique — one activity row can produce many result rows |
| ef_ref | uuid, FK → `ef_table.ef_id`, nullable | null for zero-match stub rows |
| scope | text, nullable | null for Unclassified stubs |
| category | text, nullable | |
| subcategory | text, nullable | |
| result_tco2e | numeric, nullable | null for stub/blocked rows |
| confidence_score | numeric, nullable | `round(√(data_quality_rating_score × ef_quality_level), 1)` |
| validation_status | text | `pending` / `approved` / `flagged`, default `'pending'` |
| export_blocked | boolean, not null | |
| export_blocked_reason | text, nullable | Cause A (Activity Data / unit mismatch, fix in Tool A) or Cause B (no EF match, EF table gap) |
| created_at | timestamptz | `default now()` |

RLS: anon `SELECT` (all rows), anon `INSERT` (calculation engine writes),
anon `UPDATE` — **table-level, all columns**, accepted risk (not restricted to
`validation_status` alone — see CLAUDE.md Hard Rules). No `DELETE`.

---

## data_quality_rating → score mapping

Used by `confidence_score`'s formula. Per `docs/purepastures-ef-calc-schema-final.md`
§4 (higher = better, consistent with `confidence_score` reading as "more confidence =
higher number" and with `ef_table.quality_level`'s own 5=best/1=worst convention):

| data_quality_rating | Score |
|---|---|
| measured | 5 |
| calculated | 4 |
| estimated | 2 |
| proxy | 1 |

---

**Last updated:** 2026-07-18 — Tool B session 1 (initial reconstruction from live
schema; new tables not yet created — see PROGRESS.md for build status).
