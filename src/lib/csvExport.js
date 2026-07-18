import Papa from 'papaparse'

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * CSV export per product-spec.md Section 3: full granular Emissions Results
 * breakdown (every field), plus the run-rate forecast and its per-month inputs,
 * always ALL persisted records — independent of on-screen filters. Callers must
 * pass a fresh, unfiltered `results` array (see Dashboard.jsx's handleCsv).
 */
export function downloadCsv(results, forecast) {
  const rows = results.map((r) => ({
    facility: r.activity?.facility ?? '',
    reporting_period: r.activity?.reporting_period ?? '',
    emission_source: r.activity?.emission_source ?? '',
    scope: r.scope ?? '',
    category: r.category ?? '',
    subcategory: r.subcategory ?? '',
    emission_basis: r.ef?.emission_basis ?? '',
    activity_value_raw: r.activity?.activity_data_value_raw ?? '',
    activity_unit_raw: r.activity?.activity_data_unit_raw ?? '',
    activity_value_converted: r.activity?.activity_data_value_converted ?? '',
    activity_unit_converted: r.activity?.activity_data_unit_converted ?? '',
    ef_value: r.ef?.ef_value ?? '',
    ef_unit: r.ef?.ef_unit ?? '',
    result_tco2e: r.result_tco2e ?? '',
    confidence_score: r.confidence_score ?? '',
    validation_status: r.validation_status,
    export_blocked: r.export_blocked,
    export_blocked_reason: r.export_blocked_reason ?? '',
  }))

  const resultsCsv = Papa.unparse(rows)

  const forecastSummaryCsv = Papa.unparse([
    { year: forecast.year, forecast_tco2e: forecast.forecastTco2e ?? '', months_with_entries: forecast.monthCount },
  ])

  const monthlyInputsCsv = Papa.unparse(
    forecast.monthlyTotals.map((m) => ({
      month: m.month,
      tco2e: m.tco2e,
      suppressed_by_blocked_row: m.suppressed,
    }))
  )

  const combined = `${resultsCsv}\n\nRun-rate forecast\n${forecastSummaryCsv}\n\nRun-rate forecast — monthly inputs\n${monthlyInputsCsv}\n`
  triggerDownload(combined, `purepastures-emissions-results-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
}
