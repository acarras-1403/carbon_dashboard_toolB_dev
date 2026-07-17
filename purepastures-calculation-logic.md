# PurePastures — Emissions Calculation Logic

Companion document to `purepastures-ef-calc-schema-final.md`. This doc covers the *process* applied to that data — what happens, in what order — not the field definitions themselves.

---

## 1. Match Step

For each Activity Data row:

1. Filter EF table rows by exact `emission_source` match.
2. Filter by country: exact `facility_country` match; if none exists, fall back to `country = "ALL"`.
3. Filter by `publication_year`: select the most recent edition where `publication_year ≤ year(activity's reporting_period)`.
4. Rows surviving all three filters are this entry's matched EF row(s) — one row for a normal emission_source, potentially several for a multi-linkage emission_source (§2).
5. If zero rows survive after all fallbacks, see §3.

## 2. Fan-out Rule

Each EF row surviving the Match Step (§1) generates its own Emissions Result row — an emission_source is never artificially collapsed to a single result. "Grid Electricity" produces both a location-based and a market-based result; "Diesel — Stationary Generator" produces both a Scope 1 direct-combustion result and a Scope 3 Cat 3 upstream-WTT result. Each Emissions Result row inherits `scope`, `category`, `subcategory`, and `emission_basis` from its matched EF row — these are not stored on the activity entry itself.

## 3. No-Match / Incomplete-Match Rule

Compare the emission_basis values actually matched in §1–§2 against the **Expected Matches** table (schema doc §3a) for that emission_source:

- **Zero matches, emission_source has no Expected Matches entries** (a normal single-match emission_source): no Emissions Result row is generated; the activity entry is flagged `export_blocked = true`.
- **Zero matches, emission_source does have Expected Matches entries** (multi-linkage emission_source, nothing matched at all): same as above — full block.
- **Partial matches** — some but not all of the emission_source's Expected Matches entries were satisfied: generate Emissions Result rows for whatever matched normally. For each expected `emission_basis` with no corresponding match, create a stub Emissions Result row with `result_tco2e = null` and `export_blocked = true`, so the specific gap is visible rather than silently absent.

## 4. Unit / Currency Reconciliation

`activity_data_value_converted` (already converted to base unit or USD at entry time — Activity Data table) must reconcile with the matched EF row's `ef_unit`.

- **Intended safeguard (deferred):** conversion factors should be required at the time a new emission_source is created, closing this gap structurally. The procedure for enforcing that is not yet designed — see Open Items below.
- **Runtime rule, in effect now regardless of that procedure:** if `activity_data_unit_converted` still doesn't reconcile with `ef_unit` at calculation time, treat it the same as a missing EF match — `export_blocked = true` for that row.

## 5. result_tco2e Formula

For each matched EF row that passes §1–§4:

```
result_tco2e = (activity_data_value_converted × ef_value) / 1000
```

`ef_value` is expressed in kgCO2e per unit of `activity_data_unit_converted`; dividing by 1,000 converts the raw kgCO2e output into the tCO2e stored in `result_tco2e`.

## 6. confidence_score Formula

```
confidence_score = √(data_quality_rating_score (1–5) × ef_quality_level (1–5))
```

Range: 1–5. Uses the mapping already defined in the schema doc (§4) to convert `data_quality_rating`'s categorical value into a 1–5 score.

Geometric mean, not arithmetic — a weak input (e.g. a "proxy" data quality paired with a "generic/proxy" EF) should pull the confidence score down toward the weaker value, not get smoothed out by averaging with a stronger one. Since this produces non-integer results (e.g. √(5×1) ≈ 2.24), round to 1 decimal place for display: `confidence_score = round(√(a × b), 1)`.

---

## Open Items

- **New emission_source creation procedure** (including making `conversion_factor` mandatory at creation time) — deferred, to be worked out as its own procedure in a later session. Until it exists, §4's runtime fallback (`export_blocked = true`) is the only safeguard against unit mismatches introduced by newly added emission sources. Worth a `DECISIONS.md` entry (deferred status) so this gap doesn't get forgotten before a new emission_source is ever added.
