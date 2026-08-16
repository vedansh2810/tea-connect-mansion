import { MessageSquareWarning } from 'lucide-react'
import { ChitLine, ChitPaper, ChitRule } from '../chit/ChitPaper'
import { STATUS_META, STATUSES } from '../../store/OrdersContext'
import { clockTime, elapsed, rupees } from '../../lib/format'
import { taxLabel } from '../../lib/tax'

/**
 * The kitchen's copy of the chit. Same paper, same monospace, same dot
 * leaders the customer saw — so a server holding a phone and a cook reading
 * the pass are looking at one document.
 *
 * Held time is the number that matters on a pass, so it is set largest after
 * the table.
 */

const STATUS_TONE = {
  pending: 'border-oxblood/60 text-oxblood',
  preparing: 'border-brass text-brass-dim',
  served: 'border-veg/70 text-veg',
  completed: 'border-ink/25 text-ink-soft',
}

export default function OrderTicket({ order, now, onAdvance, onSetStatus, fresh }) {
  const meta = STATUS_META[order.status]
  const held = elapsed(order.placedAt, now)
  const minutes = Math.floor((now - new Date(order.placedAt).getTime()) / 60000)
  // A pending ticket sitting past 10 minutes is the one thing worth shouting about.
  const late = order.status !== 'completed' && order.status !== 'served' && minutes >= 10

  return (
    <article className={fresh ? 'anim-chit' : ''} aria-label={`Order ${order.id}, table ${order.table}`}>
      <ChitPaper className={late ? '[filter:drop-shadow(0_0_16px_rgb(123_59_46/0.5))]' : ''}>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.2em] text-ink-soft uppercase">Table</p>
            <p className="figure text-[2.1rem] text-ink">{order.table}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9.5px] tracking-[0.16em] text-ink-soft uppercase">
              {order.id}
            </p>
            <p className="mt-0.5 font-mono text-[0.7rem] text-ink tabular">
              {clockTime(order.placedAt)}
            </p>
            <p
              className={`font-mono text-[0.7rem] tabular ${late ? 'font-semibold text-oxblood' : 'text-ink-soft'}`}
            >
              held {held}
            </p>
          </div>
        </header>

        <div className="mt-2.5 flex items-center gap-2">
          <span
            className={`border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em] uppercase ${STATUS_TONE[order.status]}`}
          >
            {meta.label}
          </span>
          {late && (
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-oxblood uppercase">
              running long
            </span>
          )}
        </div>

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

        {/* The note is what gets missed on a busy pass, so it is boxed. */}
        {order.note && (
          <div className="mt-2 border-l-2 border-oxblood bg-oxblood/[0.07] px-2.5 py-2">
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] text-oxblood uppercase">
              <MessageSquareWarning className="size-3" aria-hidden="true" />
              Special request
            </p>
            <p className="mt-1 font-mono text-[0.74rem] leading-relaxed text-ink">{order.note}</p>
          </div>
        )}

        <ChitRule />
        {order.taxAmount > 0 ? (
          <>
            <ChitLine label="Subtotal" amount={rupees(order.subtotal)} />
            <ChitLine label={taxLabel(order.taxPercent)} amount={rupees(order.taxAmount)} />
            <ChitLine label="Total" amount={rupees(order.total)} strong />
          </>
        ) : (
          <ChitLine label="Total" amount={rupees(order.subtotal)} strong />
        )}

        <ChitRule />

        {/* Advancing is one tap; correcting a mis-tap is one more. */}
        <div className="space-y-2">
          {meta.next ? (
            <button
              type="button"
              onClick={() => onAdvance(order.id)}
              className="w-full bg-ink px-3 py-2.5 font-mono text-[10.5px] tracking-[0.18em] text-parchment uppercase transition-colors hover:bg-oxblood"
            >
              {meta.action}
            </button>
          ) : (
            <p className="py-1 text-center font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase">
              Closed at {clockTime(order.history?.at(-1)?.at ?? order.placedAt)}
            </p>
          )}

          <div className="flex gap-1" role="group" aria-label="Set status">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onSetStatus(order.id, status)}
                aria-pressed={order.status === status}
                className={`flex-1 border px-1 py-1.5 font-mono text-[8.5px] tracking-[0.1em] uppercase transition-colors ${
                  order.status === status
                    ? 'border-ink bg-ink/10 text-ink'
                    : 'border-ink/20 text-ink-soft hover:border-brass hover:text-ink'
                }`}
              >
                {STATUS_META[status].label}
              </button>
            ))}
          </div>
        </div>
      </ChitPaper>
    </article>
  )
}
