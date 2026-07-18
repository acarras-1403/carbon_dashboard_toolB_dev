import { useEffect, useMemo, useState } from 'react'
import Filters from './Filters.jsx'
import ScopeTree from './ScopeTree.jsx'
import ForecastPanel from './ForecastPanel.jsx'
import { fetchDashboardData } from '../lib/dataFetch.js'
import { recalculate } from '../lib/calculationEngine.js'
import { computeForecast } from '../lib/forecast.js'
import { downloadCsv } from '../lib/csvExport.js'
import { downloadPdf } from '../lib/pdfExport.js'

const SCOPE_ORDER = ['Scope 1', 'Scope 2', 'Scope 3', 'Unclassified']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recalcState, setRecalcState] = useState('idle') // idle | running | done | error
  const [recalcMessage, setRecalcMessage] = useState('')

  const [facility, setFacility] = useState('')
  const [year, setYear] = useState('')

  const [expandedScopes, setExpandedScopes] = useState(new Set(SCOPE_ORDER))
  const [expandedCategories, setExpandedCategories] = useState(new Set())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const fresh = await fetchDashboardData()
      setData(fresh)
      // Expand all categories by default once data is known.
      const allCategoryKeys = new Set()
      for (const r of fresh.results) {
        const scopeKey = r.scope ?? 'Unclassified'
        const catKey = r.category ?? 'no EF found'
        allCategoryKeys.add(`${scopeKey}::${catKey}`)
      }
      setExpandedCategories(allCategoryKeys)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const facilities = useMemo(() => {
    if (!data) return []
    return [...new Set(data.activityRows.map((a) => a.facility))].sort()
  }, [data])

  const years = useMemo(() => {
    if (!data) return []
    return [...new Set(data.activityRows.map((a) => a.reporting_period.slice(0, 4)))].sort()
  }, [data])

  const filteredResults = useMemo(() => {
    if (!data) return []
    return data.results.filter((r) => {
      if (!r.activity) return false
      if (facility && r.activity.facility !== facility) return false
      if (year && r.activity.reporting_period.slice(0, 4) !== year) return false
      return true
    })
  }, [data, facility, year])

  const forecast = useMemo(() => {
    if (!data) return null
    return computeForecast(data.activityRows, data.results, new Date().getFullYear())
  }, [data])

  function toggleScope(scope) {
    setExpandedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  function toggleCategory(key) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function onStatusChange(resultId, newStatus) {
    setData((prev) => ({
      ...prev,
      results: prev.results.map((r) => (r.id === resultId ? { ...r, validation_status: newStatus } : r)),
    }))
  }

  async function handleRecalculate() {
    setRecalcState('running')
    setRecalcMessage('')
    try {
      const { inserted, updated } = await recalculate()
      await load()
      setRecalcState('done')
      setRecalcMessage(`Recalculated: ${inserted} new row(s), ${updated} updated.`)
    } catch (e) {
      setRecalcState('error')
      setRecalcMessage(e.message || String(e))
    }
  }

  async function handleCsv() {
    const fresh = await fetchDashboardData()
    const forecastForCsv = computeForecast(fresh.activityRows, fresh.results, new Date().getFullYear())
    downloadCsv(fresh.results, forecastForCsv)
  }

  async function handlePdf() {
    const fresh = await fetchDashboardData()
    await downloadPdf(fresh)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-critical">Error loading data: {error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-deep-blue text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold">PurePastures Emissions Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handleRecalculate} disabled={recalcState === 'running'} className="btn-primary border border-lime">
            {recalcState === 'running' ? 'Recalculating…' : 'Recalculate'}
          </button>
          <button type="button" onClick={handleCsv} className="btn-secondary">
            Download CSV
          </button>
          <button type="button" onClick={handlePdf} className="btn-secondary">
            Download PDF
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {recalcMessage && (
          <p className={recalcState === 'error' ? 'text-critical text-sm' : 'text-slate text-sm'}>{recalcMessage}</p>
        )}

        <div className="card p-4 text-xs text-slate">
          Calculated figures rely on Tool A's activity_data_value_converted, which
          currently uses a placeholder conversion_factor (flat 1.0, status 'TBD').
          These results are not final until Tool A supplies real conversion values.
        </div>

        <Filters
          facilities={facilities}
          years={years}
          facility={facility}
          year={year}
          onFacilityChange={setFacility}
          onYearChange={setYear}
        />

        <ForecastPanel forecast={forecast} />

        <ScopeTree
          results={filteredResults}
          expandedScopes={expandedScopes}
          expandedCategories={expandedCategories}
          onToggleScope={toggleScope}
          onToggleCategory={toggleCategory}
          onStatusChange={onStatusChange}
        />
      </main>
    </div>
  )
}
