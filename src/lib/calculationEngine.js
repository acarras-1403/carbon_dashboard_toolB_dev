import { supabase } from './supabaseClient.js'
import { computeResultsForActivity } from './matching.js'

function resultKey(row) {
  return [row.activity_data_ref, row.ef_ref ?? '', row.scope ?? '', row.category ?? '', row.subcategory ?? ''].join(
    '::'
  )
}

/**
 * Runs the full calculation engine: match -> fan-out -> no-match/partial-match ->
 * unit reconciliation -> result_tco2e -> confidence_score, then reconciles the
 * freshly computed rows against whatever is already persisted in emissions_results.
 *
 * emissions_results has no anon DELETE policy (Hard Rule — accepted trade-off), so
 * this reconciles via upsert (update existing rows in place, insert new ones) rather
 * than delete+reinsert. A row's validation_status is preserved across recalculations
 * by matching on (activity_data_ref, ef_ref, scope, category, subcategory). Rows
 * whose underlying match no longer applies are not removed (no delete path exists);
 * this is a known, documented limitation, not a bug.
 */
export async function recalculate() {
  const [{ data: activityRows, error: activityErr }, { data: periods, error: periodsErr }, { data: efTable, error: efErr }, { data: expectedMatches, error: expectedErr }, { data: existingResults, error: existingErr }] =
    await Promise.all([
      supabase.from('activity_data').select('*'),
      supabase.from('facility_reporting_period').select('*'),
      supabase.from('ef_table').select('*'),
      supabase.from('expected_matches').select('*'),
      supabase.from('emissions_results').select('*'),
    ])

  const firstError = activityErr || periodsErr || efErr || expectedErr || existingErr
  if (firstError) throw firstError

  const periodsById = new Map(periods.map((p) => [p.id, p]))
  const expectedMatchesBySource = new Map()
  for (const m of expectedMatches) {
    const list = expectedMatchesBySource.get(m.emission_source) || []
    list.push(m.expected_emission_basis)
    expectedMatchesBySource.set(m.emission_source, list)
  }

  const existingByKey = new Map(existingResults.map((r) => [resultKey(r), r]))

  const toInsert = []
  const toUpdate = []

  for (const activity of activityRows) {
    const period = periodsById.get(activity.facility_reporting_period_ref)
    const facilityCountry = period ? period.facility_country : null

    const shapes = computeResultsForActivity(activity, facilityCountry, efTable, expectedMatchesBySource).map(
      (shape) => ({ ...shape, activity_data_ref: activity.id })
    )

    for (const shape of shapes) {
      const key = resultKey(shape)
      const existing = existingByKey.get(key)
      if (existing) {
        toUpdate.push({ id: existing.id, ...shape })
      } else {
        toInsert.push(shape)
      }
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('emissions_results').insert(toInsert)
    if (error) throw error
  }

  for (const row of toUpdate) {
    const { id, ...fields } = row
    const { error } = await supabase.from('emissions_results').update(fields).eq('id', id)
    if (error) throw error
  }

  return { inserted: toInsert.length, updated: toUpdate.length }
}
