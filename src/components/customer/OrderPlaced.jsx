import { Check } from 'lucide-react'
import { ChitLine, ChitPaper, ChitRule } from '../chit/ChitPaper'
import { CrownRule } from '../ornament/Ornaments'
import { useOrders } from '../../store/OrdersContext'
import { RESTAURANT } from '../../data/menu'
import { clockTime, rupees } from '../../lib/format'
import { taxLabel } from '../../lib/tax'

const PROGRESS = {
  pending: { label: 'With the kitchen', detail: 'Your order has been received.' },
  preparing: { label: 'Being prepared', detail: 'The kitchen has started on it.' },
  served: { label: 'Served', detail: 'Everything is on your table.' },
  completed: { label: 'Bill closed', detail: 'Thank you for visiting.' },
}

/**
 * The same chit the customer just built, now stamped and live. It tracks the
 * status the kitchen sets, so the customer can see their order move without
 * flagging down a server.
 */
export default function OrderPlaced({ orderId, table, onOrderMore }) {
  const { orders } = useOrders()
  const order = orders.find((candidate) => candidate.id === orderId)

  if (!order) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="font-body text-sm text-ink">That order is no longer on file.</p>
        <button
          type="button"
          onClick={onOrderMore}
          className="mt-4 border border-brass/45 px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-ink uppercase hover:bg-brass/10"
        >
          Back to the menu
        </button>
      </main>
    )
  }

  const step = PROGRESS[order.status]
  const stepIndex = ['pending', 'preparing', 'served', 'completed'].indexOf(order.status)

  return (
    <main className="mx-auto w-full max-w-md px-3 py-8">
      <div className="text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-brass/50 bg-brass/10">
          <Check className="size-5 text-brass-dim" strokeWidth={2} />
        </span>
        <h1 className="mt-4 font-display text-xl font-medium tracking-[0.12em] text-ink uppercase letterpress">
          Order placed
        </h1>
        <div className="mx-auto mt-2 w-24">
          <CrownRule className="anim-draw" />
        </div>
        <p className="mt-3 font-body text-sm text-ink-soft">
          {step.detail} Pay at the counter on your way out.
        </p>
      </div>

      <div className="relative mt-7 anim-chit">
        <ChitPaper>
          <header className="text-center">
            <h2 className="font-display text-[0.95rem] font-medium tracking-[0.2em] text-ink uppercase">
              Tea Connect Mansion
            </h2>
            <p className="mt-1 font-mono text-[0.62rem] tracking-[0.14em] text-ink-soft uppercase">
              {order.id} · Table {order.table} · {clockTime(order.placedAt)}
            </p>

            {/* Customer name, when provided */}
            {order.customerName && (
              <p className="mt-1 font-mono text-[0.66rem] tracking-[0.1em] text-ink">
                {order.customerName}
                {order.customerPhone ? ` · ${order.customerPhone}` : ''}
              </p>
            )}

            {/* Brass stamp. Laid out in the flow so it never crosses the
                wordmark, tilted and pulled tight so it still reads as applied
                after the fact rather than printed with the bill. */}
            <span className="mt-2 -mb-1 inline-block -rotate-[4deg] border-2 border-oxblood/45 px-2.5 py-1 font-mono text-[0.58rem] tracking-[0.2em] text-oxblood/75 uppercase">
              Sent to kitchen
            </span>
          </header>

          <ChitRule dashed={false} className="mt-3" />

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

          {order.note && (
            <>
              <ChitRule />
              <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase">
                Note for the kitchen
              </p>
              <p className="mt-1 font-mono text-[0.72rem] leading-relaxed text-ink">{order.note}</p>
            </>
          )}

          <ChitRule />
          {/* Read from the order, not recomputed: this is what they were quoted. */}
          {order.taxAmount > 0 ? (
            <>
              <ChitLine label="Subtotal" amount={rupees(order.subtotal)} />
              <ChitLine label={taxLabel(order.taxPercent)} amount={rupees(order.taxAmount)} />
              <ChitRule dashed={false} />
              <ChitLine label="Total to pay" amount={rupees(order.total)} strong />
              <p className="font-mono text-[0.62rem] text-ink-soft">
                Your counter bill is the tax invoice.
              </p>
            </>
          ) : (
            <>
              <ChitLine label="Subtotal" amount={rupees(order.subtotal)} strong />
              <p className="font-mono text-[0.62rem] text-ink-soft">{RESTAURANT.taxNote}</p>
            </>
          )}

          <ChitRule />

          {/* Live status, driven by whatever the kitchen sets on the pass. */}
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase">
              Status
            </p>
            <p className="mt-1 font-display text-base tracking-[0.06em] text-ink">{step.label}</p>
            <ol className="mt-2.5 flex gap-1" aria-label="Order progress">
              {['pending', 'preparing', 'served', 'completed'].map((status, index) => (
                <li
                  key={status}
                  className={`h-1 flex-1 ${index <= stepIndex ? 'bg-brass' : 'bg-ink/12'}`}
                >
                  <span className="sr-only">
                    {PROGRESS[status].label}
                    {index <= stepIndex ? ' — done' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </ChitPaper>
      </div>

      <button
        type="button"
        onClick={onOrderMore}
        className="mt-7 w-full border border-brass/45 bg-ivory px-4 py-3 font-mono text-[11px] tracking-[0.18em] text-ink uppercase transition-colors hover:bg-brass/10"
      >
        Order something else
      </button>
      <p className="mt-2 text-center font-mono text-[0.6rem] text-ink-soft">
        Anything you add now goes to the kitchen as a second chit for Table {table}.
      </p>
    </main>
  )
}
