import { useState } from 'react'
import QualityTag from './QualityTag.jsx'
import { supabase } from '../lib/supabaseClient.js'

const STATUS_CYCLE = ['pending', 'approved', 'flagged']
const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  flagged: 'Flagged',
}

export default function ResultRow({ result, onStatusChange }) {
  const [hover, setHover] = useState(false)
  const [updating, setUpdating] = useState(false)
  const activity = result.activity

  async function cycleStatus() {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(result.validation_status) + 1) % STATUS_CYCLE.length]
    setUpdating(true)
    const { error } = await supabase.from('emissions_results').update({ validation_status: next }).eq('id', result.id)
    setUpdating(false)
    if (error) {
      console.error(error)
      return
    }
    onStatusChange(result.id, next)
  }

  return (
    <div
      className="relative flex items-center justify-between gap-4 py-2 px-3 border-t border-line first:border-t-0"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="min-w-0">
        <p className="text-ink text-sm font-medium truncate">{activity?.emission_source ?? '—'}</p>
        {result.export_blocked && (
          <p className="text-xs text-serious mt-0.5">{result.export_blocked_reason}</p>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm text-ink tabular-nums">
          {result.result_tco2e != null ? `${result.result_tco2e.toFixed(3)} tCO2e` : '—'}
        </span>
        <QualityTag score={result.confidence_score} />
        <button
          type="button"
          onClick={cycleStatus}
          disabled={updating}
          className="text-xs font-semibold px-2 py-1 rounded-full border border-line hover:bg-off-white disabled:opacity-50"
        >
          {STATUS_LABEL[result.validation_status]}
        </button>
      </div>

      {hover && activity && (
        <div className="absolute right-0 top-full mt-1 z-10 w-80 card p-3 text-sm space-y-1">
          <p>
            <span className="text-slate">Activity value: </span>
            {activity.activity_data_value_raw} {activity.activity_data_unit_raw}
            {activity.activity_data_unit_raw !== activity.activity_data_unit_converted && (
              <span className="text-slate">
                {' '}
                (converted: {activity.activity_data_value_converted} {activity.activity_data_unit_converted})
              </span>
            )}
          </p>
          {result.ef && (
            <p>
              <span className="text-slate">EF value: </span>
              {result.ef.ef_value} kgCO2e/{result.ef.ef_unit}
            </p>
          )}
          <p>
            <span className="text-slate">Data quality rating: </span>
            {activity.data_quality_rating}
          </p>
          {result.ef && (
            <p>
              <span className="text-slate">EF quality level: </span>
              {result.ef.quality_level}
            </p>
          )}
          <p>
            <span className="text-slate">Reviewer: </span>
            {activity.reviewer || '—'}
          </p>
          <p>
            <span className="text-slate">Evidence link: </span>
            {activity.evidence_link ? (
              <a href={activity.evidence_link} target="_blank" rel="noreferrer" className="text-deep-blue underline">
                {activity.evidence_link}
              </a>
            ) : (
              '—'
            )}
          </p>
        </div>
      )}
    </div>
  )
}
