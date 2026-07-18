import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { computeForecast } from './forecast.js'

const DEEP_BLUE = [20, 26, 50]
const INK = [31, 35, 51]
const OFF_WHITE = [250, 250, 250]
const LINE = [230, 231, 236]

function sumTco2e(rows) {
  return rows.reduce((sum, r) => sum + (r.result_tco2e ?? 0), 0)
}

function groupBy(rows, keyFn) {
  const map = new Map()
  for (const r of rows) {
    const key = keyFn(r)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return map
}

/** Draws a simple single-hue bar chart to an offscreen canvas, returns a PNG data URL. */
function barChartImage(labels, values, { width = 500, height = 220 } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = `rgb(${OFF_WHITE.join(',')})`
  ctx.fillRect(0, 0, width, height)

  const padding = { top: 24, right: 10, bottom: 30, left: 10 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom
  const maxVal = Math.max(...values, 0.0001)
  const barGap = 12
  const barW = (plotW - barGap * (values.length - 1)) / values.length

  ctx.strokeStyle = `rgb(${LINE.join(',')})`
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top + plotH)
  ctx.lineTo(padding.left + plotW, padding.top + plotH)
  ctx.stroke()

  values.forEach((v, i) => {
    const barH = (v / maxVal) * plotH
    const x = padding.left + i * (barW + barGap)
    const y = padding.top + plotH - barH
    ctx.fillStyle = `rgb(${DEEP_BLUE.join(',')})`
    ctx.fillRect(x, y, barW, barH)

    ctx.fillStyle = `rgb(${INK.join(',')})`
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(labels[i]), x + barW / 2, padding.top + plotH + 16)
    ctx.fillText(v.toFixed(1), x + barW / 2, y - 4)
  })

  return canvas.toDataURL('image/png')
}

function scopeBreakdownTable(doc, startY, rows, title) {
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(title, 8, startY)

  const bySource = rows.map((r) => [
    r.scope ?? 'Unclassified',
    r.category ?? '—',
    r.activity?.emission_source ?? '—',
    r.result_tco2e != null ? r.result_tco2e.toFixed(3) : '—',
    r.export_blocked ? 'Blocked' : 'OK',
  ])

  autoTable(doc, {
    startY: startY + 4,
    head: [['Scope', 'Category', 'Emission source', 'tCO2e', 'Status']],
    body: bySource,
    headStyles: { fillColor: DEEP_BLUE, textColor: [255, 255, 255] },
    styles: { fontSize: 8, textColor: INK },
    theme: 'grid',
  })

  return doc.lastAutoTable.finalY
}

/**
 * Five fixed sections per product-spec.md Section 3 PDF design intent, always at
 * full granularity, independent of on-screen filter/expand state. `data` is the
 * fresh unfiltered {activityRows, efTable, results} bundle from fetchDashboardData().
 */
export async function downloadPdf(data) {
  const { activityRows, results } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFillColor(...DEEP_BLUE)
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('PurePastures Emissions Report', 8, 15)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toISOString().slice(0, 10)}`, 8, 21)
  doc.setTextColor(...INK)

  let y = 32

  // Section 1: per-facility breakdown
  const byFacility = groupBy(
    results.filter((r) => r.activity),
    (r) => r.activity.facility
  )
  doc.setFontSize(13)
  doc.text('1. Per-facility breakdown', 8, y)
  y += 6
  for (const [facility, rows] of byFacility) {
    y = scopeBreakdownTable(doc, y, rows, `${facility} — total ${sumTco2e(rows).toFixed(3)} tCO2e`) + 8
    if (y > 260) {
      doc.addPage()
      y = 15
    }
  }

  // Section 2: per-year breakdown
  doc.addPage()
  y = 15
  doc.setFontSize(13)
  doc.text('2. Per-year breakdown', 8, y)
  y += 6
  const byYear = groupBy(
    results.filter((r) => r.activity),
    (r) => r.activity.reporting_period.slice(0, 4)
  )
  for (const [yr, rows] of byYear) {
    y = scopeBreakdownTable(doc, y, rows, `${yr} — total ${sumTco2e(rows).toFixed(3)} tCO2e`) + 8
    if (y > 260) {
      doc.addPage()
      y = 15
    }
  }

  // Section 3: year-over-year comparison
  doc.addPage()
  y = 15
  doc.setFontSize(13)
  doc.text('3. Year-over-year comparison', 8, y)
  y += 6
  const years = [...byYear.keys()].sort()
  const yearTotals = years.map((yr) => sumTco2e(byYear.get(yr)))
  autoTable(doc, {
    startY: y,
    head: [['Year', 'Total tCO2e']],
    body: years.map((yr, i) => [yr, yearTotals[i].toFixed(3)]),
    headStyles: { fillColor: DEEP_BLUE, textColor: [255, 255, 255] },
    styles: { fontSize: 9, textColor: INK },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 6
  if (years.length > 0) {
    const img = barChartImage(years, yearTotals)
    doc.addImage(img, 'PNG', 8, y, 120, 53)
  }

  // Section 4: facility-vs-facility comparison
  doc.addPage()
  y = 15
  doc.setFontSize(13)
  doc.text('4. Facility-vs-facility comparison', 8, y)
  y += 6
  const facilities = [...byFacility.keys()].sort()
  const facilityTotals = facilities.map((f) => sumTco2e(byFacility.get(f)))
  autoTable(doc, {
    startY: y,
    head: [['Facility', 'Total tCO2e']],
    body: facilities.map((f, i) => [f, facilityTotals[i].toFixed(3)]),
    headStyles: { fillColor: DEEP_BLUE, textColor: [255, 255, 255] },
    styles: { fontSize: 9, textColor: INK },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 6
  if (facilities.length > 0) {
    const img = barChartImage(facilities, facilityTotals)
    doc.addImage(img, 'PNG', 8, y, 120, 53)
  }

  // Section 5: run-rate forecast
  doc.addPage()
  y = 15
  doc.setFontSize(13)
  doc.text('5. Run-rate forecast', 8, y)
  y += 8
  const forecast = computeForecast(activityRows, results, new Date().getFullYear())
  doc.setFontSize(11)
  doc.text(
    `Projected ${forecast.year} total: ${forecast.forecastTco2e != null ? forecast.forecastTco2e.toFixed(2) : 'n/a'} tCO2e`,
    8,
    y
  )
  y += 8
  doc.setFontSize(9)
  doc.text(`Based on ${forecast.monthCount} month(s) with Activity Data entries.`, 8, y)
  y += 8
  if (forecast.suppressedMonths.length > 0) {
    doc.setTextColor(...DEEP_BLUE)
    doc.text('Months with totals suppressed by blocked rows:', 8, y)
    y += 6
    doc.text(forecast.suppressedMonths.join(', '), 8, y)
    doc.setTextColor(...INK)
  } else {
    doc.text('No months had suppressed totals.', 8, y)
  }

  doc.save(`purepastures-emissions-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
