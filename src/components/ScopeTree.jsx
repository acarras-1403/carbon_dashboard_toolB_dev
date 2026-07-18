import ResultRow from './ResultRow.jsx'

const SCOPE_ORDER = ['Scope 1', 'Scope 2', 'Scope 3', 'Unclassified']

function sumTco2e(rows) {
  return rows.reduce((sum, r) => sum + (r.result_tco2e ?? 0), 0)
}

export default function ScopeTree({ results, expandedScopes, expandedCategories, onToggleScope, onToggleCategory, onStatusChange }) {
  const byScope = new Map(SCOPE_ORDER.map((s) => [s, []]))
  for (const r of results) {
    const scopeKey = r.scope ?? 'Unclassified'
    if (!byScope.has(scopeKey)) byScope.set(scopeKey, [])
    byScope.get(scopeKey).push(r)
  }

  return (
    <div className="space-y-3">
      {SCOPE_ORDER.map((scope) => {
        const rows = byScope.get(scope) || []
        const isOpen = expandedScopes.has(scope)
        const isUnclassified = scope === 'Unclassified'

        const byCategory = new Map()
        for (const r of rows) {
          const catKey = r.category ?? 'no EF found'
          if (!byCategory.has(catKey)) byCategory.set(catKey, [])
          byCategory.get(catKey).push(r)
        }

        return (
          <div key={scope} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleScope(scope)}
              className="w-full flex items-center justify-between px-4 py-3 bg-deep-blue text-white"
            >
              <span className="font-semibold">
                {isUnclassified ? 'Unclassified — no EF found' : scope}
              </span>
              <span className="text-sm tabular-nums flex items-center gap-3">
                {rows.length > 0 ? `${sumTco2e(rows).toFixed(3)} tCO2e` : 'No results'}
                <span>{isOpen ? '▾' : '▸'}</span>
              </span>
            </button>

            {isOpen && rows.length > 0 && (
              <div>
                {[...byCategory.entries()].map(([category, catRows]) => {
                  const categoryKey = `${scope}::${category}`
                  const catOpen = expandedCategories.has(categoryKey)
                  return (
                    <div key={categoryKey} className="border-t border-line">
                      <button
                        type="button"
                        onClick={() => onToggleCategory(categoryKey)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-off-white text-ink"
                      >
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-xs text-slate flex items-center gap-2">
                          {sumTco2e(catRows).toFixed(3)} tCO2e
                          <span>{catOpen ? '▾' : '▸'}</span>
                        </span>
                      </button>
                      {catOpen &&
                        catRows.map((r) => <ResultRow key={r.id} result={r} onStatusChange={onStatusChange} />)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
