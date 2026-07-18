// Fixed status palette (never themed), per the dataviz skill's references/palette.md.
const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
}

function bucket(score) {
  if (score == null) return { color: '#9aa0ae', label: 'No score' }
  if (score >= 4) return { color: STATUS.good, label: 'High' }
  if (score >= 3) return { color: STATUS.warning, label: 'Medium' }
  if (score >= 2) return { color: STATUS.serious, label: 'Low' }
  return { color: STATUS.critical, label: 'Very low' }
}

export default function QualityTag({ score }) {
  const { color, label } = bucket(score)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {score != null ? `${score.toFixed(1)} · ${label}` : label}
    </span>
  )
}
