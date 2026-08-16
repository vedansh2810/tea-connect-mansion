import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellOff,
  CircleSlash,
  MonitorSmartphone,
  QrCode,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import OrderTicket from './OrderTicket'
import TableCodes from './TableCodes'
import SoldOut from './SoldOut'
import { CrownRule } from '../ornament/Ornaments'
import { STATUS_META, STATUSES, useOrders } from '../../store/OrdersContext'
import { useAvailability } from '../../store/AvailabilityContext'
import { useChime } from '../../lib/useChime'
import { rupees } from '../../lib/format'

const FILTERS = [{ id: 'live', label: 'Live' }, ...STATUSES.map((s) => ({ id: s, label: STATUS_META[s].label })), { id: 'all', label: 'All' }]

/**
 * The pass.
 *
 * Inverted from the customer's parlour: ink ground, warm light, chits pinned
 * in a grid so a whole room of tables reads at a glance. Same tokens, other
 * side of the kitchen door.
 */
/**
 * Says out loud where orders are coming from. A manager should never have to
 * guess whether the pass is device-only — that is the difference between
 * "no orders yet" and "orders are going nowhere".
 */
function ConnectionBadge({ mode, connection, onRetry }) {
  if (connection === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 border border-oxblood px-2.5 py-1.5 font-mono text-[9px] tracking-[0.14em] text-oxblood uppercase transition-colors hover:bg-oxblood/15"
      >
        <WifiOff className="size-3" aria-hidden="true" />
        Offline · retry
      </button>
    )
  }

  if (mode === 'local') {
    return (
      <span
        title="Orders are stored in this browser only. Customer phones cannot reach this screen."
        className="flex items-center gap-1.5 border border-brass/40 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.14em] text-brass-light/80 uppercase"
      >
        <MonitorSmartphone className="size-3" aria-hidden="true" />
        This device only
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 border border-veg/50 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.14em] text-parchment/75 uppercase">
      <span
        className={`size-1.5 rounded-full ${connection === 'ready' ? 'bg-veg' : 'bg-brass-light'}`}
        aria-hidden="true"
      />
      {connection === 'ready' ? 'Live' : 'Connecting'}
    </span>
  )
}

export default function AdminDashboard({ onOpenMenu }) {
  const { orders, advance, setStatus, clearCompleted, mode, connection, error, dismissError, refresh } =
    useOrders()
  const { arm, ring, armed, muted, setMuted } = useChime()
  const { count: soldOutCount } = useAvailability()

  const [filter, setFilter] = useState('live')
  const [now, setNow] = useState(() => Date.now())
  const [freshIds, setFreshIds] = useState(() => new Set())
  const [flash, setFlash] = useState(0)
  const [codesOpen, setCodesOpen] = useState(false)
  const [soldOutOpen, setSoldOutOpen] = useState(false)

  const knownIds = useRef(null)

  // The pass owns the whole window, so the document itself goes dark. Without
  // this, overscroll and any short-content gap show the parlour's parchment.
  useEffect(() => {
    const previous = document.body.style.backgroundColor
    document.body.style.backgroundColor = 'var(--color-ink-rail)'
    return () => {
      document.body.style.backgroundColor = previous
    }
  }, [])

  // Held-time counters tick without re-rendering anything else.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  // A new row in the store is a new order. Announce it: chime, flash, drop-in.
  useEffect(() => {
    const ids = new Set(orders.map((order) => order.id))

    if (knownIds.current === null) {
      knownIds.current = ids
      return
    }

    const arrived = orders.filter((order) => !knownIds.current.has(order.id))
    knownIds.current = ids

    if (arrived.length === 0) return

    ring()
    setFlash((tick) => tick + 1)
    setFreshIds(new Set(arrived.map((order) => order.id)))
    const timer = setTimeout(() => setFreshIds(new Set()), 900)
    return () => clearTimeout(timer)
  }, [orders, ring])

  const counts = useMemo(() => {
    const base = { pending: 0, preparing: 0, served: 0, completed: 0 }
    orders.forEach((order) => {
      base[order.status] += 1
    })
    return base
  }, [orders])

  const openRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'completed')
        .reduce((sum, order) => sum + (order.total ?? order.subtotal), 0),
    [orders],
  )

  const visible = useMemo(() => {
    const rows =
      filter === 'all'
        ? orders
        : filter === 'live'
          ? orders.filter((order) => order.status !== 'completed')
          : orders.filter((order) => order.status === filter)
    // Oldest first inside the live view: the pass works front to back.
    return filter === 'live'
      ? [...rows].sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt))
      : rows
  }, [orders, filter])

  return (
    <div className="min-h-dvh bg-ink-rail text-parchment">
      {/* ── Pass header ─────────────────────────────────────────────────── */}
      <header
        key={flash}
        className={`sticky top-0 z-30 border-b border-brass/25 bg-ink-deep/95 backdrop-blur ${flash ? 'anim-flash' : ''}`}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-baseline gap-4">
            <div>
              <h1 className="font-display text-base font-medium tracking-[0.18em] text-parchment uppercase">
                Tea Content Mansion
              </h1>
              <p className="font-mono text-[9.5px] tracking-[0.26em] text-brass-light/80 uppercase">
                The pass · live orders
              </p>
            </div>
            <div className="hidden w-24 sm:block">
              <CrownRule dark className="anim-draw" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ConnectionBadge mode={mode} connection={connection} onRetry={refresh} />

            {!armed && (
              <button
                type="button"
                onClick={arm}
                className="flex items-center gap-1.5 border border-brass px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-brass-light uppercase transition-colors hover:bg-brass/15"
              >
                <Bell className="size-3.5" aria-hidden="true" />
                Turn on the bell
              </button>
            )}
            {armed && (
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                aria-pressed={muted}
                className="flex items-center gap-1.5 border border-parchment/25 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-parchment/80 uppercase transition-colors hover:border-brass hover:text-brass-light"
              >
                {muted ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
                {muted ? 'Bell off' : 'Bell on'}
              </button>
            )}

            {/* The count is on the button on purpose: an item left marked off
                after the delivery arrives loses sales quietly all day. */}
            <button
              type="button"
              onClick={() => setSoldOutOpen(true)}
              className={`flex items-center gap-1.5 border px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${
                soldOutCount
                  ? 'border-oxblood bg-oxblood/20 text-parchment'
                  : 'border-parchment/25 text-parchment/80 hover:border-brass hover:text-brass-light'
              }`}
            >
              <CircleSlash className="size-3.5" aria-hidden="true" />
              {soldOutCount ? `${soldOutCount} sold out` : 'Sold out'}
            </button>

            <button
              type="button"
              onClick={() => setCodesOpen(true)}
              className="flex items-center gap-1.5 border border-parchment/25 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-parchment/80 uppercase transition-colors hover:border-brass hover:text-brass-light"
            >
              <QrCode className="size-3.5" aria-hidden="true" />
              Table codes
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              className="border border-parchment/25 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-parchment/80 uppercase transition-colors hover:border-brass hover:text-brass-light"
            >
              Customer view
            </button>
          </div>
        </div>

        {/* ── Counts. The numbers a manager scans, not decoration. ───────── */}
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-x-8 gap-y-2 border-t border-parchment/10 px-5 py-2.5">
          {[
            { label: 'Pending', value: counts.pending, tone: 'text-oxblood' },
            { label: 'Preparing', value: counts.preparing, tone: 'text-brass-light' },
            { label: 'Served', value: counts.served, tone: 'text-parchment' },
            { label: 'Open bills', value: rupees(openRevenue), tone: 'text-parchment' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-[9px] tracking-[0.22em] text-parchment/45 uppercase">
                {stat.label}
              </p>
              <p className={`figure text-lg ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-1.5">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={filter === entry.id}
                className={`border px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.14em] uppercase transition-colors ${
                  filter === entry.id
                    ? 'border-brass bg-brass/20 text-brass-light'
                    : 'border-parchment/20 text-parchment/60 hover:border-brass/60 hover:text-parchment'
                }`}
              >
                {entry.label}
              </button>
            ))}
            {counts.completed > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="flex items-center gap-1.5 border border-parchment/20 px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.14em] text-parchment/60 uppercase transition-colors hover:border-oxblood hover:text-oxblood"
              >
                <Trash2 className="size-3" aria-hidden="true" />
                Clear {counts.completed} closed
              </button>
            )}
          </div>
        </div>
      </header>

      {/* A failed write is worth interrupting for — the kitchen may be looking
          at a status the database never accepted. */}
      {error && (
        <div role="alert" className="border-b border-oxblood/50 bg-oxblood/20">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-2">
            <p className="flex-1 font-mono text-[10.5px] tracking-[0.08em] text-parchment">
              {error}
            </p>
            <button
              type="button"
              onClick={refresh}
              className="border border-parchment/30 px-2 py-1 font-mono text-[9px] tracking-[0.14em] text-parchment uppercase hover:border-brass"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss"
              className="grid size-6 place-items-center text-parchment/70 hover:text-parchment"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── The rail ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1600px] px-5 py-6">
        {visible.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-xl tracking-[0.08em] text-parchment/85">
              {filter === 'live' ? 'No orders on the pass.' : `Nothing ${filter}.`}
            </p>
            <p className="mx-auto mt-2 max-w-sm font-body text-sm leading-relaxed text-parchment/55">
              {mode === 'cloud'
                ? 'Orders land here the moment a table sends one. Open the customer view on a phone, or print the table codes.'
                : 'This build has no database configured, so orders only travel between tabs on this device — a phone cannot reach this screen. See DEPLOY.md to connect one.'}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setCodesOpen(true)}
                className="border border-brass px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-brass-light uppercase hover:bg-brass/15"
              >
                Print table codes
              </button>
              <button
                type="button"
                onClick={onOpenMenu}
                className="border border-parchment/25 px-4 py-2 font-mono text-[10px] tracking-[0.16em] text-parchment/75 uppercase hover:border-brass"
              >
                Open a table's menu
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                now={now}
                fresh={freshIds.has(order.id)}
                onAdvance={advance}
                onSetStatus={setStatus}
              />
            ))}
          </div>
        )}
      </main>

      <TableCodes open={codesOpen} onClose={() => setCodesOpen(false)} />
      <SoldOut open={soldOutOpen} onClose={() => setSoldOutOpen(false)} />
    </div>
  )
}
