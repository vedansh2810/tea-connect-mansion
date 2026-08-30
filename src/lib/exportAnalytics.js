import { utils, writeFile } from 'xlsx'

/**
 * Export the analytics data object to a multi-sheet .xlsx file.
 *
 * @param {object} data  – the shape returned by buildAnalyticsFromOrders
 * @param {string} dateFrom – YYYY-MM-DD
 * @param {string} dateTo   – YYYY-MM-DD
 */
export function exportAnalyticsToExcel(data, dateFrom, dateTo) {
  if (!data) return

  const wb = utils.book_new()

  // ── Sheet 1: Summary ──────────────────────────────────────────────────
  const summaryRows = [
    ['Metric', 'Value'],
    ['Date Range', `${dateFrom} to ${dateTo}`],
    ['Total Revenue (₹)', data.totalRevenue],
    ['Total Orders', data.totalOrders],
    ['Avg Order Value (₹)', data.avgOrderValue],
    [''],
    ['Status', 'Count'],
    ['Pending', data.statusBreakdown?.pending ?? 0],
    ['Preparing', data.statusBreakdown?.preparing ?? 0],
    ['Served', data.statusBreakdown?.served ?? 0],
    ['Completed', data.statusBreakdown?.completed ?? 0],
  ]
  const summarySheet = utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 28 }]
  utils.book_append_sheet(wb, summarySheet, 'Summary')

  // ── Sheet 2: Top Items ────────────────────────────────────────────────
  const itemRows = [['Rank', 'Item', 'Quantity', 'Revenue (₹)']]
  ;(data.topItems || []).forEach((item, idx) => {
    itemRows.push([idx + 1, item.name, item.qty, item.revenue])
  })
  const itemSheet = utils.aoa_to_sheet(itemRows)
  itemSheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 10 }, { wch: 14 }]
  utils.book_append_sheet(wb, itemSheet, 'Top Items')

  // ── Sheet 3: Hourly Orders ────────────────────────────────────────────
  const hourlyRows = [['Hour', 'Orders', 'Revenue (₹)']]
  ;(data.hourly || []).forEach((h) => {
    const label = formatHour(h.hour)
    hourlyRows.push([label, h.count, h.revenue])
  })
  const hourlySheet = utils.aoa_to_sheet(hourlyRows)
  hourlySheet['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 14 }]
  utils.book_append_sheet(wb, hourlySheet, 'Hourly Orders')

  // ── Sheet 4: Table Performance ────────────────────────────────────────
  const tableRows = [['Table', 'Orders', 'Revenue (₹)']]
  ;(data.tables || []).forEach((t) => {
    tableRows.push([`Table ${t.table}`, t.orders, t.revenue])
  })
  const tableSheet = utils.aoa_to_sheet(tableRows)
  tableSheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 14 }]
  utils.book_append_sheet(wb, tableSheet, 'Table Performance')

  // ── Trigger download ──────────────────────────────────────────────────
  const fileName = `Analytics_${dateFrom}_to_${dateTo}.xlsx`
  writeFile(wb, fileName)
}

function formatHour(hour) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}
