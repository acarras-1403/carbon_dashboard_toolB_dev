export default function ForecastPanel({ forecast }) {
  if (!forecast || forecast.monthCount === 0) {
    return (
      <div className="card p-4">
        <h2 className="font-semibold text-ink">Run-rate forecast — {forecast?.year}</h2>
        <p className="text-sm text-slate mt-1">No Activity Data entries for {forecast?.year} yet.</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-ink">Run-rate forecast — {forecast.year}</h2>
        <p className="text-xl font-semibold text-deep-blue tabular-nums">
          {forecast.forecastTco2e.toFixed(2)} tCO2e
        </p>
      </div>
      <p className="text-xs text-slate mt-1">
        Equal-weighted average of {forecast.monthCount} month(s) with entries × 12. Months with no Activity Data are
        excluded from the average, not counted as zero.
      </p>

      {forecast.suppressedMonths.length > 0 && (
        <div className="mt-3 rounded-lg border border-serious/30 bg-serious/10 px-3 py-2 text-sm text-ink">
          <span className="font-semibold">Note:</span> the total for{' '}
          {forecast.suppressedMonths.length === 1 ? 'month' : 'months'}{' '}
          <span className="font-medium">{forecast.suppressedMonths.join(', ')}</span> was suppressed toward zero by
          one or more blocked (export_blocked) rows.
        </div>
      )}
    </div>
  )
}
