import { supabase } from './supabaseClient.js'

/**
 * Fetches everything the dashboard needs and joins emissions_results with its
 * source activity_data and matched ef_table row (client-side join — small dataset,
 * no need for a Postgres view).
 */
export async function fetchDashboardData() {
  const [{ data: activityRows, error: activityErr }, { data: efTable, error: efErr }, { data: results, error: resultsErr }] =
    await Promise.all([
      supabase.from('activity_data').select('*'),
      supabase.from('ef_table').select('*'),
      supabase.from('emissions_results').select('*'),
    ])

  const firstError = activityErr || efErr || resultsErr
  if (firstError) throw firstError

  const activityById = new Map(activityRows.map((a) => [a.id, a]))
  const efById = new Map(efTable.map((e) => [e.ef_id, e]))

  const enrichedResults = results.map((r) => ({
    ...r,
    activity: activityById.get(r.activity_data_ref) || null,
    ef: r.ef_ref ? efById.get(r.ef_ref) || null : null,
  }))

  return { activityRows, efTable, results: enrichedResults }
}
