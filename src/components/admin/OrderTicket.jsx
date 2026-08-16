import { useState } from 'react'
import { MessageSquareWarning, Minus, Pencil, Phone, Plus, Trash2, User, X } from 'lucide-react'
import { ChitLine, ChitPaper, ChitRule } from '../chit/ChitPaper'
import { STATUS_META, STATUSES, useOrders } from '../../store/OrdersContext'
import { clockTime, elapsed, rupees } from '../../lib/format'
import { taxLabel } from '../../lib/tax'

/**
 * The kitchen's copy of the chit. Same paper, same monospace, same dot
 * leaders the customer saw — so a server holding a phone and a cook reading
 * the pass are looking at one document.
 *
 * Now shows customer name and phone, and supports inline order editing
 * (quantity changes and item voids with reason tracking).
 */

const STATUS_TONE = {
  pending: 'border-oxblood/60 text-oxblood',
  preparing: 'border-brass text-brass-dim',
  served: 'border-veg/70 text-veg',
  completed: 'border-ink/25 text-ink-soft',
}

const VOID_REASONS = [
  'Wrong item',
  'Customer changed mind',
  'Kitchen issue',
  'Duplicate order',
  'Other',
]

export default function OrderTicket({ order, now, onAdvance, onSetStatus, fresh }) {
  const { editOrderLines, voidItem } = useOrders()
  const [editing, setEditing] = useState(false)
  const [editLines, setEditLines] = useState([])
  const [voidingKey, setVoidingKey] = useState(null)
  const [voidReason, setVoidReason] = useState('')

  const meta = STATUS_META[order.status]
  const held = elapsed(order.placedAt, now)
  const minutes = Math.floor((now - new Date(order.placedAt).getTime()) / 60000)
  // A pending ticket sitting past 10 minutes is the one thing worth shouting about.
  const late = order.status !== 'completed' && order.status !== 'served' && minutes >= 10

  function startEdit() {
    setEditLines(order.lines.map((l) => ({ ...l })))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditLines([])
    setVoidingKey(null)
  }

  async function saveEdit() {
    const filtered = editLines.filter((l) => l.qty > 0)
    if (filtered.length === 0) return
    await editOrderLines(order.id, filtered, 'Edited from pass')
    setEditing(false)
    setEditLines([])
  }

  function changeQty(key, delta) {
    setEditLines((lines) =>
      lines
        .map((l) => (l.key === key ? { ...l, qty: Math.max(0, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    )
  }

  async function confirmVoid(lineKey) {
    await voidItem(order.id, lineKey, voidReason || 'No reason given')
    setVoidingKey(null)
    setVoidReason('')
  }

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

        {/* ── Customer details ─────────────────────────────────────── */}
        {(order.customerName || order.customerPhone) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border border-brass/25 bg-brass/[0.06] px-2.5 py-1.5">
            {order.customerName && (
              <span className="flex items-center gap-1 font-mono text-[0.7rem] text-ink">
                <User className="size-3 text-brass-dim" aria-hidden="true" />
                {order.customerName}
              </span>
            )}
            {order.customerPhone && (
              <a
                href={`tel:${order.customerPhone}`}
                className="flex items-center gap-1 font-mono text-[0.7rem] text-ink underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
              >
                <Phone className="size-3 text-brass-dim" aria-hidden="true" />
                {order.customerPhone}
              </a>
            )}
          </div>
        )}

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

        {/* ── Order lines (normal or edit mode) ────────────────── */}
        {editing ? (
          <>
            <ul className="divide-y divide-ink/10">
              {editLines.map((line) => (
                <li key={line.key} className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-brass/40">
                      <button
                        type="button"
                        onClick={() => changeQty(line.key, -1)}
                        className="grid size-6 place-items-center text-ink hover:bg-brass/10"
                      >
                        <Minus className="size-3" strokeWidth={2} />
                      </button>
                      <span className="w-5 text-center font-mono text-[0.68rem] text-ink tabular">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(line.key, 1)}
                        className="grid size-6 place-items-center text-ink hover:bg-brass/10"
                      >
                        <Plus className="size-3" strokeWidth={2} />
                      </button>
                    </div>
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.72rem] text-ink">
                      {line.name}
                    </span>
                    <span className="font-mono text-[0.72rem] text-ink tabular">
                      {rupees(line.qty * line.unitPrice)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={editLines.filter((l) => l.qty > 0).length === 0}
                className="flex-1 bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-parchment uppercase transition-colors hover:bg-oxblood disabled:opacity-40"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="border border-ink/30 px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-ink uppercase hover:bg-brass/10"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
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
                >
                  {/* Void button for individual items */}
                  {order.status !== 'completed' && (
                    <div className="mt-1 pl-7">
                      {voidingKey === line.key ? (
                        <div className="space-y-1.5 anim-rise">
                          <select
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            className="w-full border border-brass/40 bg-ivory px-2 py-1 font-mono text-[0.62rem] text-ink focus:border-brass focus:outline-none"
                          >
                            <option value="">Select reason…</option>
                            {VOID_REASONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmVoid(line.key)}
                              className="border border-oxblood/50 px-2 py-1 font-mono text-[0.58rem] tracking-[0.1em] text-oxblood uppercase hover:bg-oxblood/10"
                            >
                              Confirm void
                            </button>
                            <button
                              type="button"
                              onClick={() => { setVoidingKey(null); setVoidReason('') }}
                              className="font-mono text-[0.58rem] tracking-[0.1em] text-ink-soft uppercase underline underline-offset-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVoidingKey(line.key)}
                          className="flex items-center gap-1 font-mono text-[0.58rem] tracking-[0.08em] text-oxblood/70 uppercase transition-colors hover:text-oxblood"
                        >
                          <Trash2 className="size-2.5" /> Void
                        </button>
                      )}
                    </div>
                  )}
                </ChitLine>
              </li>
            ))}
          </ul>
        )}

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
          <div className="flex gap-2">
            {meta.next ? (
              <button
                type="button"
                onClick={() => onAdvance(order.id)}
                className="flex-1 bg-ink px-3 py-2.5 font-mono text-[10.5px] tracking-[0.18em] text-parchment uppercase transition-colors hover:bg-oxblood"
              >
                {meta.action}
              </button>
            ) : (
              <p className="flex-1 py-1 text-center font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                Closed at {clockTime(order.history?.at(-1)?.at ?? order.placedAt)}
              </p>
            )}
            {order.status !== 'completed' && !editing && (
              <button
                type="button"
                onClick={startEdit}
                title="Edit order"
                className="grid size-10 place-items-center border border-ink/25 text-ink-soft transition-colors hover:border-brass hover:text-ink"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>

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
