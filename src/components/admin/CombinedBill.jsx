import { CheckCircle } from 'lucide-react'
import { ChitLine, ChitPaper, ChitRule } from '../chit/ChitPaper'
import { clockTime, rupees } from '../../lib/format'
import { taxLabel } from '../../lib/tax'

/**
 * A combined bill for one table.
 *
 * When a table places multiple orders during a sitting, this groups all their
 * completed orders into a single bill so the cashier sees one card per table
 * with a grand total, rather than three or four separate tickets.
 *
 * Stays visible in the completed section until explicitly marked as Paid.
 */

export default function CombinedBill({ tableNumber, orders, onMarkPaid }) {
  // Merge all line items across orders, keeping them grouped by order for clarity.
  const combinedSubtotal = orders.reduce((sum, o) => sum + (o.subtotal ?? 0), 0)
  const combinedTaxAmount = orders.reduce((sum, o) => sum + (o.taxAmount ?? 0), 0)
  const combinedTotal = orders.reduce((sum, o) => sum + (o.total ?? o.subtotal ?? 0), 0)

  // Use the tax percent from the first order that has one (they should all be the same).
  const taxPercent = orders.find((o) => o.taxPercent > 0)?.taxPercent ?? 0

  // Sort orders oldest first so the bill reads chronologically.
  const sorted = [...orders].sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt))

  return (
    <article aria-label={`Combined bill, table ${tableNumber}`}>
      <ChitPaper>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-ink-soft uppercase">Table</p>
            <p className="figure text-[2.1rem] text-ink">{tableNumber}</p>
          </div>
          <div className="text-right">
            <span className="border border-veg/60 bg-veg/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em] text-veg uppercase">
              Combined bill
            </span>
            <p className="mt-1.5 font-mono text-[0.68rem] text-ink-soft">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </header>

        <ChitRule dashed={false} className="mt-3" />

        {/* ── Per-order breakdown ──────────────────────────────────── */}
        {sorted.map((order, idx) => (
          <div key={order.id}>
            {idx > 0 && <ChitRule />}
            <div className="flex items-baseline justify-between gap-2 pb-1 pt-0.5">
              <p className="font-mono text-[9px] tracking-[0.16em] text-brass-dim uppercase">
                {order.id}
              </p>
              <p className="font-mono text-[0.66rem] text-ink-soft tabular">
                {clockTime(order.placedAt)}
              </p>
            </div>
            <ul className="divide-y divide-ink/10">
              {order.lines.map((line) => (
                <li key={line.key}>
                  <ChitLine
                    qty={line.qty}
                    label={line.name}
                    sub={
                      [line.tierLabel, line.choice, line.addOnLabel && `with ${line.addOnLabel.toLowerCase()}`]
                        .filter(Boolean)
                        .join(' · ') || null
                    }
                    amount={rupees(line.qty * line.unitPrice)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <ChitRule />

        {/* ── Combined totals ─────────────────────────────────────── */}
        {combinedTaxAmount > 0 ? (
          <>
            <ChitLine label="Subtotal" amount={rupees(combinedSubtotal)} />
            <ChitLine label={taxLabel(taxPercent)} amount={rupees(combinedTaxAmount)} />
            <ChitLine label="Grand total" amount={rupees(combinedTotal)} strong />
          </>
        ) : (
          <ChitLine label="Grand total" amount={rupees(combinedSubtotal)} strong />
        )}

        <ChitRule />

        {/* ── Mark Paid button ────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => onMarkPaid(tableNumber)}
          className="w-full bg-veg/90 px-3 py-2.5 font-mono text-[10.5px] tracking-[0.18em] text-parchment uppercase transition-colors hover:bg-veg"
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="size-3.5" aria-hidden="true" />
            Mark paid
          </span>
        </button>
      </ChitPaper>
    </article>
  )
}
