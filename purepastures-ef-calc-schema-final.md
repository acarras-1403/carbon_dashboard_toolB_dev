# PurePastures — EF & Calculation Data Schema

**Covers:** Activity Data (Tool A), Facility Reporting Period, EF table (Tool B — calculation reference data), Emissions Results (Tool B)

---

## 1. Activity Data (Tool A — Data Entry Tool)

One row per logged activity entry. Scope/category/subcategory are not stored here — they're derived later from the matched EF row(s), since a single emission source (fuel, electricity) can map to more than one scope/basis combination. Scope→category→subcategory→emission_source still exists as a **cascading dropdown in the UI** to guide the user to the right `emission_source` value; only `emission_source` itself is written to this table.

| Field | Type | Required | Displayed in frontend | Notes |
|---|---|---|---|---|
| reporting_period | Date (YYYY-MM) | Yes | Yes | |
| facility | Dropdown, hardcoded | Yes | Yes | |
| emission_source | Dropdown, hardcoded | Yes | Yes | Sole join key to EF table |
| activity_data_value_raw | Number | Yes | Yes | Exactly as entered |
| activity_data_unit_raw | Text | Yes | Yes | As entered (or original currency for spend-based) |
| activity_data_value_converted | Number | Yes | No | Base unit (or USD) — backend only, used for calculation |
| activity_data_unit_converted | Text | Yes | No | Base unit, or "USD" — backend only |
| data_quality_rating | Dropdown | Yes | Yes | measured / calculated / estimated / proxy — 1–5 mapping in §4 |
| notes | Text | No | Yes | |
| evidence_link | URL/text | No | Yes | Supports the raw value — invoice, meter reading, etc. |
| reviewer | Free text | No | Yes | Self-reported only, no login to verify identity |

**Multi-linkage emission sources (fuel, electricity):** a single `emission_source` value like "Diesel — Stationary Generator" or "Grid Electricity" matches multiple EF rows at calculation time (e.g. Scope 1 direct + Scope 3 Cat 3 WTT; location-based + market-based). The user doesn't choose between them at entry — the calculation engine generates all matching results automatically.

---

## 2. Facility Reporting Period

One row per facility per reporting_year (annual, not monthly).

| Field | Type | Required | Displayed in frontend |
|---|---|---|---|
| facility | Dropdown, hardcoded | Yes | Yes |
| reporting_year | Year (YYYY) | Yes | Yes |
| facility_country | Dropdown/lookup | Yes | Yes |
| production_volume | Number + unit | Yes | Yes |
| annual_revenue | Number (currency) | Yes | Yes |

**Join rule:** intensity calculations join Activity Data to this table by extracting the year from Activity Data's monthly `reporting_period`.

---

## 3. EF Table (Tool B — calculation reference data)

This is a backend data table feeding calculation logic, not a data-entry form — no dropdown UI needed for MVP. A future iteration may expose it as an editable, dynamic frontend view (letting users adjust EFs and trigger recalculation), but that's explicitly out of scope for now — this version is calculation input only. Even without a UI, `scope`, `category`, `emission_basis`, and `country` still need to be constrained to fixed vocabularies at the data layer so they reliably match Activity Data's `emission_source` and don't silently break the join on a typo.

| Field | Type | Notes |
|---|---|---|
| ef_id | Unique ID | |
| scope | Controlled value | e.g. Scope 1, Scope 2, Scope 3 |
| category | Controlled value | |
| subcategory | Controlled value | |
| emission_source | Controlled value | Must match Tool A's emission_source list exactly |
| emission_basis | Controlled value | e.g. direct_combustion / location_based / market_based / upstream_WTT / T&D_losses — lets one emission_source map to multiple scope/basis combinations |
| country | Controlled value | Fallback value `"ALL"` (matches the EF database file's convention) |
| calculation_method | Controlled value | activity_based / hybrid / spend_based — classified per EF row |
| ef_value | Number | Blended CO2e factor — per-gas breakdown deferred |
| ef_unit | Text | e.g. kgCO2e/litre; reconciled with activity_data_unit_converted via conversion tables |
| reference_year | Number (YYYY) | Year the underlying source data was measured — varies per row (e.g. 2007–2025 in current source) |
| publication_year | Number (YYYY) | Year this database edition was published — uniform per edition |
| quality_level | Number, 1–5 | EF's own quality tier — feeds confidence_score |
| notes | Text | |

**Uniqueness key:** scope + emission_basis + category + subcategory + emission_source + country + publication_year — not emission_source alone, since multiple valid rows exist per emission_source for multi-linkage cases, and multiple editions of the same factor must coexist over time (see calculation logic doc's publication-year fallback rule).

---

## 3a. Expected Matches (new — declares which emission sources should produce multiple results)

One row per (emission_source, expected emission_basis) pair. Only multi-linkage emission sources need entries — an emission_source with no rows here is expected to produce exactly one match; anything less after Part 1's match step is a normal no-match, not a partial one.

| Field | Type | Notes |
|---|---|---|
| emission_source | Controlled value | Must match Tool A / EF table's emission_source list exactly |
| expected_emission_basis | Controlled value | e.g. `location_based`, `market_based`, `direct_combustion`, `upstream_WTT` |

**Example:**

| emission_source | expected_emission_basis |
|---|---|
| Grid Electricity | location_based |
| Grid Electricity | market_based |
| Diesel — Stationary Generator | direct_combustion |
| Diesel — Stationary Generator | upstream_WTT |

At calculation time, the fan-out result for a given activity entry is compared against this table's entries for that `emission_source`: any expected `emission_basis` with no corresponding Emissions Result row gets a stub result with `export_blocked = true`, so the gap is visible rather than silent. This table needs to be kept in sync manually when a new multi-linkage emission source is added — worth a note in CLAUDE.md's Hard Rules once built, since nothing else enforces that it stays current.

---

## 4. Emissions Results (Tool B, calculated)

One `activity_data_ref` can produce multiple result rows — one per matching EF row.

| Field | Type | Displayed in frontend | Notes |
|---|---|---|---|
| activity_data_ref | Reference | No | Internal link to the source Activity Data row — not unique per result row |
| ef_ref | Reference | No | Internal link to the matched EF row |
| scope, category, subcategory | Derived | Yes | Pulled from the matched EF row — core dashboard breakdown |
| result_tco2e | Number | Yes | Calculated output |
| validation_status | Dropdown | Yes | pending / approved / flagged |
| confidence_score | Number, 1–5 | Yes | `round(√(data_quality_rating_score × ef_quality_level), 1)` — see calculation logic doc §6 |
| export_blocked | Boolean | Yes | Surfaced as an alert — `true` if no EF match found (exact country or `"ALL"` fallback) |

**Confidence score mapping:**

| data_quality_rating | Score | EF quality_level | Score |
|---|---|---|---|
| measured | 5 | Primary/verified source | 5 |
| calculated | 4 | Well-documented secondary | 4 |
| estimated | 2 | Industry average | 2 |
| proxy | 1 | Generic/proxy factor | 1 |

---

## 5. Raw value storage rationale

Activity Data stores both raw and converted values, not converted only — a reviewer checking `evidence_link` against a source invoice needs to verify against what was actually entered, not a post-conversion number they'd have to reverse-calculate.
