import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { ChefMark } from '../ornament/Ornaments'
import { useCart } from '../../store/CartContext'
import { useAvailability } from '../../store/AvailabilityContext'
import { rupees } from '../../lib/format'

/**
 * One line of the menu, set the way the printed card sets it: name, dot
 * leader, price. What differs is that the row can be tapped.
 *
 * Three shapes, because the menu has three:
 *   plain   — one price, so the row carries a stepper once it is in the cart
 *   tiered  — the chai pots; one chip per serving size
 *   choice  — Dry or Gravy, which the kitchen must be told
 */
export default function ItemRow({ item, group, highlight }) {
  const { add, setQty, lines, qtyOfItem } = useCart()
  const { isSoldOut } = useAvailability()
  const [askChoice, setAskChoice] = useState(false)

  const inCart = qtyOfItem(item.id)
  const soldOut = isSoldOut(item.id)

  // A plain item maps to exactly one cart line, so it can be stepped in place.
  const plainLine =
    !item.prices && !item.choices ? lines.find((line) => line.itemId === item.id) : null

  function addTier(tierIndex, choice = null) {
    add({ itemId: item.id, tierIndex, choice, addOn: false })
    setAskChoice(false)
  }

  return (
    <li
      className={`py-2.5 ${highlight ? 'bg-brass/[0.07] -mx-2 px-2' : ''}`}
      data-item={item.id}
      data-sold-out={soldOut || undefined}
    >
      <div className="flex items-baseline gap-1.5">
        {/* No flex-1 here: the name takes its natural width and the leader
            absorbs what is left, so short names never wrap. */}
        <div className={`min-w-0 ${item.prices ? 'flex-1' : ''}`}>
          <span
            className={`align-middle font-body text-[0.93rem] leading-snug ${
              soldOut ? 'text-ink-soft/60' : 'text-ink'
            }`}
          >
            {item.name}
          </span>
          {item.chef && !soldOut && (
            <ChefMark className="ml-1.5 inline-block shrink-0 translate-y-px align-middle text-brass" />
          )}
        </div>

        {!item.prices && (
          <>
            <span className="leader" aria-hidden="true" />
            <span
              className={`font-mono text-[0.8rem] tabular ${
                soldOut ? 'text-ink-soft/55 line-through' : 'text-ink'
              }`}
            >
              {item.price}
            </span>
          </>
        )}

        {/* Sold out replaces the controls outright: nothing to tap, and the
            reason is stated rather than left as a dead button. */}
        {soldOut && (
          <span className="ml-2 shrink-0 border border-ink-soft/30 px-2 py-1 font-mono text-[9px] tracking-[0.14em] text-ink-soft uppercase">
            Sold out
          </span>
        )}

        {/* Controls sit at the row end and keep a 44px tap target. */}
        {!item.prices && !soldOut && (
          <div className="ml-2 shrink-0">
            {plainLine ? (
              <div className="flex items-center border border-brass/45 bg-ivory">
                <button
                  type="button"
                  onClick={() => setQty(plainLine.key, plainLine.qty - 1)}
                  aria-label={`Remove one ${item.name}`}
                  className="grid size-8 place-items-center text-ink transition-colors hover:bg-brass/10"
                >
                  <Minus className="size-3.5" strokeWidth={2} />
                </button>
                <span
                  className="w-6 text-center font-mono text-xs text-ink tabular"
                  aria-live="polite"
                >
                  {plainLine.qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(plainLine.key, plainLine.qty + 1)}
                  aria-label={`Add another ${item.name}`}
                  className="grid size-8 place-items-center text-ink transition-colors hover:bg-brass/10"
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            ) : item.choices ? (
              <button
                type="button"
                onClick={() => setAskChoice((open) => !open)}
                aria-expanded={askChoice}
                className="grid size-8 place-items-center border border-brass/45 bg-ivory text-brass-dim transition-colors hover:bg-brass/10"
              >
                <Plus className="size-4" strokeWidth={2} />
                <span className="sr-only">Choose an option for {item.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => addTier(0)}
                aria-label={`Add ${item.name}, ${rupees(item.price)}`}
                className="grid size-8 place-items-center border border-brass/45 bg-ivory text-brass-dim transition-colors hover:bg-brass/10 active:bg-brass/20"
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>

      {item.note && (
        <p className="mt-0.5 pr-14 font-body text-[0.7rem] leading-snug text-ink-soft italic">
          {item.note}
        </p>
      )}

      {/* Required choice, revealed on demand rather than always on screen. */}
      {item.choices && askChoice && !soldOut && (
        <div className="mt-2 flex flex-wrap items-center gap-2 anim-rise">
          <span className="font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase">
            Choose
          </span>
          {item.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => addTier(0, choice)}
              className="border border-brass/50 bg-ivory px-3 py-1.5 font-body text-xs text-ink transition-colors hover:bg-brass/15"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* Serving sizes for the chai pots: one chip each, price under the label. */}
      {item.prices && !soldOut && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {group.tiers.map((tier, index) => {
            const count = lines
              .filter((line) => line.itemId === item.id && line.tierIndex === index)
              .reduce((sum, line) => sum + line.qty, 0)
            return (
              <button
                key={tier}
                type="button"
                onClick={() => addTier(index)}
                className={`flex items-center gap-1.5 border px-2 py-1.5 transition-colors ${
                  count
                    ? 'border-brass bg-brass/15'
                    : 'border-brass/35 bg-ivory hover:bg-brass/10'
                }`}
              >
                <span className="font-mono text-[9px] tracking-[0.06em] whitespace-nowrap text-ink-soft uppercase">
                  {tier}
                </span>
                <span className="font-mono text-[11px] text-ink tabular">{item.prices[index]}</span>
                {count > 0 && (
                  <span className="grid size-4 place-items-center rounded-full bg-ink font-mono text-[9px] text-parchment tabular">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {inCart > 0 && item.prices && (
        <p className="sr-only" aria-live="polite">
          {inCart} {item.name} in your order
        </p>
      )}
    </li>
  )
}
