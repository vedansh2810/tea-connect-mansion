import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, X } from 'lucide-react'
import { useAvailability } from '../../store/AvailabilityContext'
import { ITEM_INDEX, MENU } from '../../data/menu'
import { rupees } from '../../lib/format'

/**
 * What the kitchen has run out of.
 *
 * Ordered by what the kitchen actually needs to do. Currently-out items sit at
 * the top, because putting something back is the urgent action — an item left
 * marked off after the delivery arrives costs sales silently. Marking something
 * off is the deliberate action, so it lives behind a search.
 *
 * Every change reaches the customers' phones immediately.
 */
export default function SoldOut({ open, onClose }) {
  const { unavailable, toggle, restoreAll, count, error } = useAvailability()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const soldOutItems = useMemo(
    () => ITEM_INDEX.filter((item) => unavailable.has(item.id)),
    [unavailable],
  )

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return ITEM_INDEX.filter(
      (item) =>
        !unavailable.has(item.id) &&
        (item.name.toLowerCase().includes(needle) ||
          item.groupName.toLowerCase().includes(needle)),
    ).slice(0, 40)
  }, [query, unavailable])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-deep/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sold out items"
    >
      <div className="mx-auto max-w-2xl bg-parchment p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium tracking-[0.12em] text-ink uppercase">
              Sold out
            </h2>
            <p className="mt-1 max-w-md font-body text-xs leading-relaxed text-ink-soft">
              Anything marked here stops being orderable on every phone in the room, straight away.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sold out list"
            className="grid size-9 shrink-0 place-items-center border border-brass/40 text-ink hover:bg-brass/10"
          >
            <X className="size-4" />
          </button>
        </header>

        {error && (
          <p role="alert" className="mt-3 border-l-2 border-oxblood bg-oxblood/[0.07] px-2.5 py-2 font-mono text-[11px] text-ink">
            {error}
          </p>
        )}

        {/* ── Off the menu right now ──────────────────────────────────────── */}
        <section className="mt-6" aria-labelledby="currently-out">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="currently-out"
              className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase"
            >
              Off the menu now · {count}
            </h3>
            {count > 1 && (
              <button
                type="button"
                onClick={restoreAll}
                className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-ink-soft uppercase underline decoration-brass/40 underline-offset-2 hover:text-ink"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Put everything back
              </button>
            )}
          </div>

          {count === 0 ? (
            <p className="mt-2 border border-dashed border-brass/30 px-4 py-6 text-center font-body text-sm text-ink-soft">
              Everything on the menu is available.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-brass/20 border border-brass/25 bg-ivory">
              {soldOutItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-sm text-ink line-through">
                      {item.name}
                    </span>
                    <span className="font-mono text-[9.5px] tracking-[0.12em] text-ink-soft uppercase">
                      {item.groupName}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="shrink-0 border border-veg/60 bg-veg/10 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.14em] text-veg uppercase transition-colors hover:bg-veg/20"
                  >
                    Put back
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Take something off ─────────────────────────────────────────── */}
        <section className="mt-8" aria-labelledby="mark-out">
          <h3 id="mark-out" className="font-mono text-[10px] tracking-[0.2em] text-brass-dim uppercase">
            Take something off
          </h3>

          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brass-dim"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the menu — paneer, chai, waffle…"
              aria-label="Search for an item to mark sold out"
              className="w-full border border-brass/35 bg-ivory py-2.5 pr-3 pl-9 font-body text-sm text-ink placeholder:text-ink-soft/55 focus:border-brass focus:outline-none"
            />
          </div>

          {query.trim() ? (
            matches.length ? (
              <ul className="mt-2 max-h-72 divide-y divide-brass/20 overflow-y-auto border border-brass/25 bg-ivory">
                {matches.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-body text-sm text-ink">{item.name}</span>
                      <span className="font-mono text-[9.5px] tracking-[0.12em] text-ink-soft uppercase">
                        {item.groupName} · {rupees(item.basePrice)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="shrink-0 border border-oxblood/50 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.14em] text-oxblood uppercase transition-colors hover:bg-oxblood/10"
                    >
                      Mark sold out
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 px-1 py-4 font-body text-sm text-ink-soft">
                Nothing matches “{query}”.
              </p>
            )
          ) : (
            <p className="mt-2 px-1 font-body text-xs leading-relaxed text-ink-soft">
              Search by dish or by section — {MENU.length} sections, {ITEM_INDEX.length} items.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
