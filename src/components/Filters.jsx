export default function Filters({ facilities, years, facility, year, onFacilityChange, onYearChange }) {
  return (
    <div className="flex items-center gap-3">
      <select
        className="field-input text-sm"
        value={facility}
        onChange={(e) => onFacilityChange(e.target.value)}
      >
        <option value="">All facilities</option>
        {facilities.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select className="field-input text-sm" value={year} onChange={(e) => onYearChange(e.target.value)}>
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
