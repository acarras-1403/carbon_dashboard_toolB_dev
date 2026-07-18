// Pure calculation logic (no I/O) — Match / Fan-out / No-match / Partial-match /
// Unit reconciliation / result_tco2e / confidence_score, per
// docs/purepastures-calculation-logic.md. Kept dependency-free so it can be
// unit-tested directly.

// data_quality_rating -> score mapping, per docs/purepastures-ef-calc-schema-final.md §4
// and docs/supabase-setup.md (higher = better, consistent with confidence_score and
// ef_table.quality_level both reading as "higher = more confidence/quality").
const DATA_QUALITY_SCORE = {
  measured: 5,
  calculated: 4,
  estimated: 2,
  proxy: 1,
}

function reportingYear(reportingPeriod) {
  // reportingPeriod is "YYYY-MM"
  return parseInt(reportingPeriod.slice(0, 4), 10)
}

export function confidenceScore(dataQualityRating, efQualityLevel) {
  const dq = DATA_QUALITY_SCORE[dataQualityRating]
  if (dq == null || efQualityLevel == null) return null
  return Math.round(Math.sqrt(dq * efQualityLevel) * 10) / 10
}

/**
 * Match step: for a given activity row, return the EF rows that survive
 * emission_source -> country (exact, else "ALL") -> most-recent-publication_year-<=-year
 * filtering, one row per distinct (scope, category, subcategory, emission_basis).
 */
export function matchEfRows(activity, facilityCountry, efTable) {
  const year = reportingYear(activity.reporting_period)
  const bySource = efTable.filter((ef) => ef.emission_source === activity.emission_source)

  let byCountry = bySource.filter((ef) => ef.country === facilityCountry)
  if (byCountry.length === 0) {
    byCountry = bySource.filter((ef) => ef.country === 'ALL')
  }

  const eligible = byCountry.filter((ef) => ef.publication_year <= year)

  // Group by basis line (scope/category/subcategory/emission_basis), keep most
  // recent publication_year within each group.
  const groups = new Map()
  for (const ef of eligible) {
    const key = [ef.scope, ef.category, ef.subcategory, ef.emission_basis].join('|')
    const current = groups.get(key)
    if (!current || ef.publication_year > current.publication_year) {
      groups.set(key, ef)
    }
  }

  return [...groups.values()]
}

/**
 * Computes the fresh set of emissions_results "shapes" for one activity_data row.
 * Each shape omits id/created_at/validation_status — those are reconciled against
 * existing rows by the caller.
 */
export function computeResultsForActivity(activity, facilityCountry, efTable, expectedMatchesBySource) {
  const found = matchEfRows(activity, facilityCountry, efTable)
  const expectedBases = expectedMatchesBySource.get(activity.emission_source) || []

  if (found.length === 0) {
    return [
      {
        ef_ref: null,
        scope: null,
        category: null,
        subcategory: null,
        result_tco2e: null,
        confidence_score: null,
        export_blocked: true,
        export_blocked_reason: 'Cause B: no EF found for this emission_source/country/year',
      },
    ]
  }

  const rows = []
  const foundBasisSet = new Set(found.map((ef) => ef.emission_basis))

  for (const ef of found) {
    const unitsReconcile = activity.activity_data_unit_converted === ef.ef_unit
    if (!unitsReconcile) {
      rows.push({
        ef_ref: ef.ef_id,
        scope: ef.scope,
        category: ef.category,
        subcategory: ef.subcategory,
        result_tco2e: null,
        confidence_score: null,
        export_blocked: true,
        export_blocked_reason: `Cause A: activity_data_unit_converted (${activity.activity_data_unit_converted}) does not reconcile with matched EF unit (${ef.ef_unit})`,
      })
      continue
    }

    rows.push({
      ef_ref: ef.ef_id,
      scope: ef.scope,
      category: ef.category,
      subcategory: ef.subcategory,
      result_tco2e: (activity.activity_data_value_converted * ef.ef_value) / 1000,
      confidence_score: confidenceScore(activity.data_quality_rating, ef.quality_level),
      export_blocked: false,
      export_blocked_reason: null,
    })
  }

  // Partial-match: any expected basis not among what was found gets a stub,
  // nested under a matched sibling's scope/category.
  const sibling = found[0]
  for (const basis of expectedBases) {
    if (!foundBasisSet.has(basis)) {
      rows.push({
        ef_ref: null,
        scope: sibling.scope,
        category: sibling.category,
        subcategory: sibling.subcategory,
        result_tco2e: null,
        confidence_score: null,
        export_blocked: true,
        export_blocked_reason: `Cause B: no EF found for expected emission_basis "${basis}"`,
      })
    }
  }

  return rows
}
