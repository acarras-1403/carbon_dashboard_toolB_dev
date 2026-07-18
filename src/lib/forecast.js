/**
 * Run-rate forecast per product-spec.md Section 9 §7:
 * (Σ result_tco2e across months with ≥1 Activity Data entry, export_blocked rows
 * counted as 0) / (count of months with ≥1 entry) × 12. Months with zero Activity
 * Data entries are excluded from the denominator entirely (not counted as a zero
 * month). Scoped to the given target year — the PDF design intent calls this a
 * "current-year projected total".
 */
export function computeForecast(activityRows, resultRows, targetYear) {
  const activityById = new Map(activityRows.map((a) => [a.id, a]))

  const monthsInYear = new Set(
    activityRows.filter((a) => a.reporting_period.slice(0, 4) === String(targetYear)).map((a) => a.reporting_period)
  )

  const totalsByMonth = new Map([...monthsInYear].map((m) => [m, 0]))
  const suppressedMonths = new Set()

  for (const result of resultRows) {
    const activity = activityById.get(result.activity_data_ref)
    if (!activity) continue
    const month = activity.reporting_period
    if (!monthsInYear.has(month)) continue

    if (result.export_blocked) {
      suppressedMonths.add(month)
      continue
    }
    if (result.result_tco2e != null) {
      totalsByMonth.set(month, totalsByMonth.get(month) + result.result_tco2e)
    }
  }

  const monthCount = monthsInYear.size
  const total = [...totalsByMonth.values()].reduce((sum, v) => sum + v, 0)
  const forecastTco2e = monthCount > 0 ? (total / monthCount) * 12 : null

  return {
    year: targetYear,
    monthlyTotals: [...totalsByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, tco2e]) => ({ month, tco2e, suppressed: suppressedMonths.has(month) })),
    monthCount,
    forecastTco2e,
    suppressedMonths: [...suppressedMonths].sort(),
  }
}
