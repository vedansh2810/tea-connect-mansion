import { useEffect, useMemo, useRef, useState } from 'react'
import { ChefHat, Search, X } from 'lucide-react'
import SectionBlock from './SectionBlock'
import CartSheet from './CartSheet'
import OrderPlaced from './OrderPlaced'
import { ChefMark, CrownRule, DotTriad, OrnateFrame, VegMark } from '../ornament/Ornaments'
import { useCart } from '../../store/CartContext'
import { useOrders, useTableOrders } from '../../store/OrdersContext'
import { MENU, RESTAURANT, TOTAL_ITEMS } from '../../data/menu'
import { clockTime, rupees } from '../../lib/format'

/** Narrow the menu to matches, keeping the section and group structure intact. */
function filterMenu(query, sectionId) {
  const needle = query.trim().toLowerCase()
  return MENU.map((section) => {
    if (sectionId !== 'all' && section.id !== sectionId) return null
    if (!needle) return section

    const groups = section.groups
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(needle)
        const items = groupMatches
          ? group.items
          : group.items.filter(
              (item) =>
                item.name.toLowerCase().includes(needle) ||
                item.note?.toLowerCase().includes(needle),
            )
        return items.length ? { ...group, items } : null
      })
      .filter(Boolean)

    return groups.length ? { ...section, groups } : null
  }).filter(Boolean)
}

export default function CustomerMenu({ table, demo, onChangeTable, onOpenPass }) {
  const { count, subtotal, clear, lines } = useCart()
  const { placeOrder } = useOrders()
  const tableOrders = useTableOrders(table)

  const [query, setQuery] = useState('')
  const [sectionId, setSectionId] = useState('all')
  const [cartOpen, setCartOpen] = useState(false)
  const [placedId, setPlacedId] = useState(null)
  const searchRef = useRef(null)

  const sections = useMemo(() => filterMenu(query, sectionId), [query, sectionId])
  const matchCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.groups.reduce((n, g) => n + g.items.length, 0), 0),
    [sections],
  )

  // A placed order takes over the screen; going back to the menu restores it.
  useEffect(() => {
    if (placedId) window.scrollTo({ top: 0 })
  }, [placedId])

  // Throws on failure so the bill can keep the cart and say so. Never clear a
  // customer's order before the kitchen has actually accepted it.
  async function handlePlace({ note, tax }) {
    const order = await placeOrder({
      table,
      lines,
      note,
      subtotal,
      taxPercent: tax.percent,
      taxAmount: tax.amount,
      total: tax.total,
    })
    clear()
    setCartOpen(false)
    setPlacedId(order.id)
  }

  if (placedId) {
    return (
      <OrderPlaced
        orderId={placedId}
        table={table}
        onOrderMore={() => setPlacedId(null)}
      />
    )
  }

  const openOrders = tableOrders.filter((order) => order.status !== 'completed')

  return (
    <div className="pb-28">
      {/* ── Table plaque header ─────────────────────────────────────────── */}
      <header className="relative px-5 pt-7 pb-6 text-center">
        <OrnateFrame className="opacity-90" inset={10} />

        <p className="font-mono text-[9.5px] tracking-[0.3em] text-brass-dim uppercase">
          {RESTAURANT.hours}
        </p>

        <h1 className="mt-3 font-display text-[1.45rem] leading-[1.1] font-medium tracking-[0.14em] text-ink uppercase letterpress">
          Tea Content
          <br />
          Mansion
        </h1>

        <div className="mx-auto mt-3 w-36">
          <CrownRule className="anim-draw" />
        </div>

        {/* The brass plaque on the table, echoed on screen. */}
        <div className="mt-4 inline-flex items-baseline gap-3 border border-brass/55 bg-brass/10 px-4 py-2.5">
          <span className="font-mono text-[9.5px] tracking-[0.24em] text-brass-dim uppercase">
            Table
          </span>
          <span className="figure text-lg text-ink">{table}</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2.5 font-mono text-[9.5px] tracking-[0.14em] text-ink-soft uppercase">
          <VegMark />
          <span>{RESTAURANT.vegNote}</span>
        </div>

        <button
          type="button"
          onClick={onChangeTable}
          className="mt-3 font-mono text-[9.5px] tracking-[0.14em] text-ink-soft uppercase underline decoration-brass/40 underline-offset-2 transition-colors hover:text-ink"
        >
          Not table {table}?
        </button>
      </header>

      {/* ── Orders already sent from this table ─────────────────────────── */}
      {openOrders.length > 0 && (
        <div className="mx-3 mb-2 border border-brass/30 bg-ivory/70 px-4 py-3">
          <p className="font-mono text-[9.5px] tracking-[0.2em] text-brass-dim uppercase">
            Already with the kitchen
          </p>
          <ul className="mt-1.5 space-y-1">
            {openOrders.map((order) => (
              <li key={order.id} className="flex items-baseline gap-2 font-mono text-[0.7rem] text-ink">
                <span className="text-ink-soft">{clockTime(order.placedAt)}</span>
                <span className="leader" aria-hidden="true" />
                <span className="tracking-[0.1em] text-brass-dim uppercase">{order.status}</span>
                <span className="tabular">{rupees(order.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Search and section rail ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-y border-brass/25 bg-parchment/95 backdrop-blur-sm">
        <div className="px-3 pt-2.5 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brass-dim"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${TOTAL_ITEMS} dishes — chai, paneer, waffle…`}
              aria-label="Search the menu"
              className="w-full border border-brass/35 bg-ivory py-2.5 pr-9 pl-9 font-body text-sm text-ink placeholder:text-ink-soft/55 focus:border-brass focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center text-ink-soft hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          {[{ id: 'all', name: 'Everything' }, ...MENU].map((entry) => {
            const active = sectionId === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setSectionId(entry.id)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                aria-pressed={active}
                className={`shrink-0 border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors ${
                  active
                    ? 'border-ink bg-ink text-parchment'
                    : 'border-brass/35 bg-ivory text-ink hover:bg-brass/10'
                }`}
              >
                {entry.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── The menu ────────────────────────────────────────────────────── */}
      <div className="px-4">
        {query && (
          <p className="pt-4 text-center font-mono text-[10px] tracking-[0.16em] text-ink-soft uppercase" role="status">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'} for “{query}”
          </p>
        )}

        {sections.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-lg tracking-wide text-ink">Nothing matches “{query}”.</p>
            <p className="mt-2 font-body text-sm text-ink-soft">
              Try a shorter word — “chai”, “paneer”, “waffle”.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSectionId('all')
              }}
              className="mt-5 border border-brass/45 px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-ink uppercase hover:bg-brass/10"
            >
              Show the whole menu
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <SectionBlock key={section.id} section={section} query={query} />
          ))
        )}

        <footer className="mt-14 pb-6 text-center">
          <div className="mx-auto flex w-48 items-center gap-3">
            <span className="rule-brass flex-1" />
            <DotTriad />
            <span className="rule-brass flex-1" />
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
            <ChefMark className="text-brass" title="" />
            Chef's special
          </p>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
            {RESTAURANT.taxNote} · {RESTAURANT.hours}
          </p>

          {demo && (
            <button
              type="button"
              onClick={onOpenPass}
              className="mt-6 inline-flex items-center gap-1.5 border border-brass/40 px-3 py-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-soft uppercase transition-colors hover:bg-brass/10 hover:text-ink"
            >
              <ChefHat className="size-3.5" aria-hidden="true" />
              Open the kitchen pass
            </button>
          )}
        </footer>
      </div>

      {/* ── The chit tab: the bill peeking up from the bottom edge ──────── */}
      {count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 safe-b">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="group relative w-full anim-rise"
          >
            <span className="chit-paper block bg-ivory px-4 py-3.5 shadow-[0_-4px_18px_rgb(36_28_20/0.22)] transition-colors group-hover:bg-white">
              <span className="flex items-center justify-between gap-3">
                <span className="text-left">
                  <span className="block font-mono text-[9.5px] tracking-[0.2em] text-brass-dim uppercase">
                    Table {table} · review your bill
                  </span>
                  <span className="mt-0.5 block font-mono text-[0.78rem] text-ink">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </span>
                <span className="figure text-base text-ink">{rupees(subtotal)}</span>
              </span>
            </span>
          </button>
        </div>
      )}

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        table={table}
        onPlace={handlePlace}
      />
    </div>
  )
}
