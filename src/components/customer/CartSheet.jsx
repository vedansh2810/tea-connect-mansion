import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { ChitLine, ChitPaper, ChitRule } from '../chit/ChitPaper'
import { TeaCup } from '../ornament/Ornaments'
import { useCart } from '../../store/CartContext'
import { useAvailability } from '../../store/AvailabilityContext'
import { useMenu } from '../../store/MenuContext'
import { RESTAURANT } from '../../data/menu'
import { describeLine, rupees } from '../../lib/format'
import { showsTax, taxLabel, taxOn } from '../../lib/tax'

const NOTE_LIMIT = 200

/**
 * The bill, as a chit. Opens over the menu, closes on Escape or backdrop, and
 * traps nothing it does not need to — the menu behind it is inert while open.
 *
 * Now collects customer name and phone before sending to the kitchen.
 */
export default function CartSheet({ open, onClose, table, onPlace }) {
  const { lines, setQty, remove, toggleAddOn, subtotal, count } = useCart()
  const { isSoldOut } = useAvailability()
  const { findItem } = useMenu()
  const [note, setNote] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [placing, setPlacing] = useState(false)
  const [failed, setFailed] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  // An item can sell out between adding it and paying. Say so here rather than
  // letting the order reach a kitchen that cannot cook it.
  const blocked = lines.filter((line) => isSoldOut(line.itemId))
  const tax = taxOn(subtotal)

  const nameValid = customerName.trim().length >= 1
  const phoneValid = /^[6-9]\d{9}$/.test(customerPhone.trim())
  const canPlace = lines.length > 0 && !placing && blocked.length === 0 && nameValid && phoneValid

  async function place() {
    if (!canPlace) return
    setPlacing(true)
    setFailed(false)
    try {
      await onPlace({ note, tax, customerName: customerName.trim(), customerPhone: customerPhone.trim() })
      setNote('')
      setCustomerName('')
      setCustomerPhone('')
    } catch {
      // The cart is deliberately left intact. Losing someone's order to a
      // dropped connection and telling them it worked is the worst outcome
      // this screen can produce.
      setFailed(true)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Your bill"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close bill"
        className="absolute inset-0 bg-ink-deep/55 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col anim-rise focus:outline-none"
      >
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="font-mono text-[10px] tracking-[0.24em] text-parchment/80 uppercase">
            Table {table} · your bill
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center text-parchment/80 transition-colors hover:text-parchment"
            aria-label="Close bill"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-3 pb-3 safe-b">
          <ChitPaper>
            <header className="text-center">
              <h2 className="font-display text-[0.95rem] font-medium tracking-[0.2em] text-ink uppercase">
                Tea Connect Mansion
              </h2>
              <p className="mt-1 font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase">
                Table {table} · not yet sent to the kitchen
              </p>
            </header>

            <ChitRule dashed={false} className="mt-3" />

            {lines.length === 0 ? (
              <div className="py-9 text-center">
                <TeaCup className="mx-auto size-11 text-brass/70" />
                <p className="mt-4 font-body text-sm text-ink">Your bill is empty.</p>
                <p className="mx-auto mt-1 max-w-[15rem] font-body text-xs leading-relaxed text-ink-soft">
                  Add something from the menu and it will show up here, then go straight to the
                  kitchen.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 border border-brass/45 px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-ink uppercase transition-colors hover:bg-brass/10"
                >
                  Back to the menu
                </button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-ink/10">
                  {lines.map((line) => {
                    const item = findItem(line.itemId)
                    return (
                      <li key={line.key}>
                        <ChitLine
                          qty={line.qty}
                          label={line.name}
                          sub={[line.tierLabel, line.choice].filter(Boolean).join(' · ') || null}
                          amount={rupees(line.qty * line.unitPrice)}
                        >
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
                            <div className="flex items-center border border-brass/40">
                              <button
                                type="button"
                                onClick={() => setQty(line.key, line.qty - 1)}
                                aria-label={`One fewer ${describeLine(line)}`}
                                className="grid size-7 place-items-center text-ink transition-colors hover:bg-brass/10"
                              >
                                <Minus className="size-3" strokeWidth={2} />
                              </button>
                              <span className="w-6 text-center font-mono text-[0.7rem] text-ink tabular">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(line.key, line.qty + 1)}
                                aria-label={`One more ${describeLine(line)}`}
                                className="grid size-7 place-items-center text-ink transition-colors hover:bg-brass/10"
                              >
                                <Plus className="size-3" strokeWidth={2} />
                              </button>
                            </div>

                            {item?.addOn && (
                              <button
                                type="button"
                                onClick={() => toggleAddOn(line.key)}
                                aria-pressed={line.addOn}
                                className={`border px-2 py-1 font-mono text-[0.62rem] tracking-[0.08em] uppercase transition-colors ${
                                  line.addOn
                                    ? 'border-brass bg-brass/20 text-ink'
                                    : 'border-brass/40 text-brass-dim hover:bg-brass/10'
                                }`}
                              >
                                {line.addOn ? '✓ ' : '+ '}
                                {item.addOn.label} {item.addOn.price}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => remove(line.key)}
                              className="font-mono text-[0.62rem] tracking-[0.08em] text-oxblood uppercase underline decoration-oxblood/40 underline-offset-2 transition-colors hover:decoration-oxblood"
                            >
                              Remove
                            </button>
                          </div>
                        </ChitLine>
                      </li>
                    )
                  })}
                </ul>

                <ChitRule />

                {/* ── Customer details ───────────────────────────────────── */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase"
                    >
                      Your name <span className="text-oxblood">*</span>
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your name"
                      maxLength={60}
                      autoComplete="name"
                      className="mt-1 w-full border border-brass/35 bg-parchment/60 px-2.5 py-2 font-mono text-[0.72rem] text-ink placeholder:text-ink-soft/50 focus:border-brass focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase"
                    >
                      Phone number <span className="text-oxblood">*</span>
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      className="mt-1 w-full border border-brass/35 bg-parchment/60 px-2.5 py-2 font-mono text-[0.72rem] text-ink placeholder:text-ink-soft/50 focus:border-brass focus:outline-none"
                    />
                    {customerPhone.length > 0 && !phoneValid && (
                      <p className="mt-1 font-mono text-[0.58rem] text-oxblood">
                        Enter a valid 10-digit Indian mobile number
                      </p>
                    )}
                  </div>
                </div>

                <ChitRule />

                <div className="pt-1">
                  <label
                    htmlFor="kitchen-note"
                    className="font-mono text-[0.62rem] tracking-[0.16em] text-ink-soft uppercase"
                  >
                    Anything the kitchen should know?
                  </label>
                  <textarea
                    id="kitchen-note"
                    value={note}
                    maxLength={NOTE_LIMIT}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    placeholder="Extra spicy · no onions · less sugar in the chai"
                    className="mt-1.5 w-full resize-none border border-brass/35 bg-parchment/60 px-2.5 py-2 font-mono text-[0.72rem] leading-relaxed text-ink placeholder:text-ink-soft/50 focus:border-brass focus:outline-none"
                  />
                  <p className="mt-1 text-right font-mono text-[0.58rem] text-ink-soft tabular">
                    {note.length}/{NOTE_LIMIT}
                  </p>
                </div>

                <ChitRule />

                <ChitLine
                  label={`Subtotal · ${count} ${count === 1 ? 'item' : 'items'}`}
                  amount={rupees(subtotal)}
                  strong={!showsTax}
                />

                {showsTax ? (
                  <>
                    <ChitLine label={taxLabel(tax.percent)} amount={rupees(tax.amount)} />
                    <ChitRule dashed={false} />
                    <ChitLine label="Total to pay" amount={rupees(tax.total)} strong />
                    <p className="font-mono text-[0.62rem] text-ink-soft">
                      Pay at the counter when you leave. Your bill there is the tax invoice.
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-[0.62rem] text-ink-soft">
                    {RESTAURANT.taxNote}. Pay at the counter when you leave.
                  </p>
                )}

                {blocked.length > 0 && (
                  <div role="alert" className="mt-3 border-l-2 border-oxblood bg-oxblood/[0.07] px-2.5 py-2">
                    <p className="font-mono text-[0.62rem] tracking-[0.16em] text-oxblood uppercase">
                      {blocked.length === 1 ? 'One item just sold out' : 'Some items just sold out'}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {blocked.map((line) => (
                        <li key={line.key} className="flex items-baseline gap-2">
                          <span className="font-mono text-[0.7rem] text-ink line-through">
                            {line.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(line.key)}
                            className="font-mono text-[0.62rem] tracking-[0.08em] text-oxblood uppercase underline decoration-oxblood/40 underline-offset-2"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 font-mono text-[0.66rem] leading-relaxed text-ink-soft">
                      Remove them to send the rest of your order.
                    </p>
                  </div>
                )}

                {failed && (
                  <div role="alert" className="mt-3 border-l-2 border-oxblood bg-oxblood/[0.07] px-2.5 py-2">
                    <p className="font-mono text-[0.62rem] tracking-[0.16em] text-oxblood uppercase">
                      Not sent
                    </p>
                    <p className="mt-1 font-mono text-[0.7rem] leading-relaxed text-ink">
                      The kitchen did not receive this. Your order is still here — check your
                      connection and try again, or show this screen to a server.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={place}
                  disabled={!canPlace}
                  className="mt-4 flex w-full items-center justify-center gap-2 bg-ink px-4 py-3.5 font-mono text-[11px] tracking-[0.2em] text-parchment uppercase transition-colors hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {blocked.length > 0
                    ? 'Remove sold-out items first'
                    : !nameValid || !phoneValid
                      ? 'Fill in your details above'
                      : placing
                        ? 'Sending to the kitchen…'
                        : failed
                          ? `Try again · ${rupees(tax.total)}`
                          : `Order now · ${rupees(tax.total)}`}
                </button>
                <p className="mt-2 text-center font-mono text-[0.6rem] text-ink-soft">
                  No payment now — this only sends your order to the kitchen.
                </p>
              </>
            )}
          </ChitPaper>
        </div>
      </div>
    </div>
  )
}
