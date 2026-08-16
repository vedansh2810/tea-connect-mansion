import { useEffect, useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { backend } from '../../store/backend'
import { rupees } from '../../lib/format'

function getDayString(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresets() {
  const now = new Date()
  
  const today = getDayString(now)
  
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterday = getDayString(y)
  
  const w = new Date(now)
  const day = w.getDay()
  const diff = w.getDate() - day + (day === 0 ? -6 : 1)
  w.setDate(diff)
  const monday = getDayString(w)
  
  const sunday = new Date(w)
  sunday.setDate(sunday.getDate() + 6)
  const endOfWeek = getDayString(sunday)
  
  const monthStart = getDayString(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = getDayString(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  return {
    'Today': { from: today, to: today },
    'Yesterday': { from: yesterday, to: yesterday },
    'This Week': { from: monday, to: endOfWeek },
    'This Month': { from: monthStart, to: monthEnd },
    'All Time': { from: '2020-01-01', to: '2099-12-31' },
  }
}

export default function Analytics({ open, onClose }) {
  const [dateFrom, setDateFrom] = useState(getDayString(new Date()))
  const [dateTo, setDateTo] = useState(getDayString(new Date()))
  const [preset, setPreset] = useState('Today')
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    
    let cancelled = false
    setLoading(true)
    setError(null)
    
    // convert YYYY-MM-DD to full ISO bounds
    const fromIso = `${dateFrom}T00:00:00.000Z`
    const toIso = `${dateTo}T23:59:59.999Z`

    backend.queryAnalytics(fromIso, toIso)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
      
    return () => { cancelled = true }
  }, [open, dateFrom, dateTo])

  const handlePreset = (p) => {
    const presets = getPresets()
    const vals = presets[p]
    if (vals) {
      setPreset(p)
      setDateFrom(vals.from)
      setDateTo(vals.to)
    }
  }

  const handleCustomFrom = (v) => {
    setPreset('Custom')
    setDateFrom(v)
  }

  const handleCustomTo = (v) => {
    setPreset('Custom')
    setDateTo(v)
  }

  const peakHour = useMemo(() => {
    if (!data || !data.hourly) return -1
    let maxCount = 0
    let maxHour = -1
    data.hourly.forEach((h) => {
      if (h.count > maxCount) {
        maxCount = h.count
        maxHour = h.hour
      }
    })
    return maxHour
  }, [data])

  const formatHourLabel = (hour) => {
    if (hour === 0) return '12am'
    if (hour === 12) return '12pm'
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`
  }

  const hourlyMaxCount = useMemo(() => {
    if (!data || !data.hourly) return 0
    return Math.max(...data.hourly.map((h) => h.count), 1)
  }, [data])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-deep/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Analytics"
    >
      <div className="mx-auto max-w-5xl bg-ink-rail p-5 text-parchment">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-brass/20 pb-5">
          <div>
            <h2 className="font-display text-lg font-medium tracking-[0.12em] text-parchment uppercase">
              Analytics
            </h2>
            <p className="mt-1 font-body text-xs text-brass-dim">
              Order and revenue metrics across the restaurant.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics"
            className="grid size-9 shrink-0 place-items-center border border-brass/40 text-brass hover:bg-brass/10 hover:text-parchment transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Filters */}
        <section className="mt-5 flex flex-wrap items-end gap-5">
          <div className="flex flex-wrap gap-2">
            {['Today', 'Yesterday', 'This Week', 'This Month', 'All Time'].map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${
                  preset === p
                    ? 'border-brass bg-brass/20 text-parchment'
                    : 'border-brass/30 text-brass-dim hover:border-brass/60 hover:text-parchment'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-brass-dim uppercase">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleCustomFrom(e.target.value)}
                className="border border-brass/40 bg-ink-deep px-2 py-1 text-sm text-parchment focus:border-brass focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-brass-dim uppercase">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleCustomTo(e.target.value)}
                className="border border-brass/40 bg-ink-deep px-2 py-1 text-sm text-parchment focus:border-brass focus:outline-none"
              />
            </label>
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-5 border-l-2 border-oxblood bg-oxblood/10 px-3 py-2 font-mono text-[11px] text-parchment">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-8 text-center font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">
            Loading analytics...
          </div>
        ) : data ? (
          <div className="mt-8 space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border border-brass/30 bg-ink-deep p-4 text-center">
                <p className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">Total Revenue</p>
                <p className="mt-2 font-mono text-3xl text-parchment tabular-nums">{rupees(data.totalRevenue)}</p>
              </div>
              <div className="border border-brass/30 bg-ink-deep p-4 text-center">
                <p className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">Total Orders</p>
                <p className="mt-2 font-mono text-3xl text-parchment tabular-nums">{data.totalOrders}</p>
              </div>
              <div className="border border-brass/30 bg-ink-deep p-4 text-center">
                <p className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">Avg Order Value</p>
                <p className="mt-2 font-mono text-3xl text-parchment tabular-nums">{rupees(data.avgOrderValue)}</p>
              </div>
            </div>

            {/* Status Breakdown & Hourly Chart */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Status Breakdown */}
              <div className="lg:col-span-1">
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">Status Breakdown</h3>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex justify-between border border-brass/20 bg-ink-deep px-3 py-2 font-mono text-xs">
                    <span className="text-brass">Pending</span>
                    <span className="tabular-nums">{data.statusBreakdown.pending || 0}</span>
                  </div>
                  <div className="flex justify-between border border-brass/20 bg-ink-deep px-3 py-2 font-mono text-xs">
                    <span className="text-brass">Preparing</span>
                    <span className="tabular-nums">{data.statusBreakdown.preparing || 0}</span>
                  </div>
                  <div className="flex justify-between border border-brass/20 bg-ink-deep px-3 py-2 font-mono text-xs">
                    <span className="text-brass">Served</span>
                    <span className="tabular-nums">{data.statusBreakdown.served || 0}</span>
                  </div>
                  <div className="flex justify-between border border-brass/20 bg-ink-deep px-3 py-2 font-mono text-xs">
                    <span className="text-brass">Completed</span>
                    <span className="tabular-nums">{data.statusBreakdown.completed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Hourly Chart */}
              <div className="lg:col-span-2">
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">Orders by Hour</h3>
                <div className="mt-3 flex h-40 items-end gap-1 border-b border-brass/30 pb-2">
                  {data.hourly.map((h) => {
                    const heightPct = hourlyMaxCount > 0 ? (h.count / hourlyMaxCount) * 100 : 0
                    const isPeak = h.hour === peakHour && h.count > 0
                    return (
                      <div key={h.hour} className="group relative flex flex-1 flex-col justify-end h-full">
                        <div
                          className={`w-full transition-all ${isPeak ? 'bg-brass' : 'bg-brass/40 group-hover:bg-brass/70'}`}
                          style={{ height: `${heightPct}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-ink px-1.5 py-0.5 font-mono text-[9px] text-parchment pointer-events-none">
                          {h.count} orders
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9px] text-brass-dim">
                  <span>12am</span>
                  <span>6am</span>
                  <span>12pm</span>
                  <span>6pm</span>
                  <span>11pm</span>
                </div>
              </div>
            </div>

            {/* Tables Grid: Top Items & Table Performance */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Top Items */}
              <div>
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase mb-3">Top Items (Top 15)</h3>
                <div className="border border-brass/30 bg-ink-deep">
                  <table className="w-full text-left font-body text-sm">
                    <thead>
                      <tr className="border-b border-brass/30 bg-ink-rail/50 font-mono text-[9px] tracking-[0.14em] text-brass-dim uppercase">
                        <th className="px-3 py-2 font-normal">Rank</th>
                        <th className="px-3 py-2 font-normal">Item</th>
                        <th className="px-3 py-2 font-normal text-right">Qty</th>
                        <th className="px-3 py-2 font-normal text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brass/10">
                      {data.topItems.length > 0 ? (
                        data.topItems.map((item, idx) => (
                          <tr key={item.name} className="hover:bg-brass/5">
                            <td className="px-3 py-2 font-mono text-xs text-brass-dim tabular-nums">#{idx + 1}</td>
                            <td className="px-3 py-2 text-parchment">{item.name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-right tabular-nums">{item.qty}</td>
                            <td className="px-3 py-2 font-mono text-xs text-right tabular-nums">{rupees(item.revenue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-3 py-6 text-center text-brass-dim">No items sold in this period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Performance */}
              <div>
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase mb-3">Table Performance</h3>
                <div className="border border-brass/30 bg-ink-deep">
                  <table className="w-full text-left font-body text-sm">
                    <thead>
                      <tr className="border-b border-brass/30 bg-ink-rail/50 font-mono text-[9px] tracking-[0.14em] text-brass-dim uppercase">
                        <th className="px-3 py-2 font-normal">Table</th>
                        <th className="px-3 py-2 font-normal text-right">Orders</th>
                        <th className="px-3 py-2 font-normal text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brass/10">
                      {data.tables.length > 0 ? (
                        data.tables.map((t) => (
                          <tr key={t.table} className="hover:bg-brass/5">
                            <td className="px-3 py-2 font-mono text-xs text-parchment">Table {t.table}</td>
                            <td className="px-3 py-2 font-mono text-xs text-right tabular-nums">{t.orders}</td>
                            <td className="px-3 py-2 font-mono text-xs text-right tabular-nums">{rupees(t.revenue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-3 py-6 text-center text-brass-dim">No orders in this period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
