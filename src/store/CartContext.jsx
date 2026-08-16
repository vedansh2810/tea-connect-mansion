import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import { useMenu } from './MenuContext'

/**
 * The cart for one seating. Scoped per table and kept in sessionStorage so a
 * dropped connection or an accidental refresh does not lose the order, but a
 * new customer at the same table starts clean.
 */

const storageKey = (table) => `tcm.cart.${table}`

/**
 * A line is identified by item + serving tier + required choice + add-ons.
 * Two Adrak Chai pots for four are one line; a pot and a single are two.
 */
function lineKey({ itemId, tierIndex = 0, choice = null, addOn = false }) {
  return [itemId, tierIndex, choice ?? '-', addOn ? 'addon' : '-'].join('|')
}

function priceOf(item, tierIndex, addOn) {
  const base = item.prices ? item.prices[tierIndex] : item.price
  return base + (addOn && item.addOn ? item.addOn.price : 0)
}

function makeReducer(findItem) {
  return function reducer(state, action) {
    switch (action.type) {
      case 'hydrate':
        return action.lines

      case 'add': {
        const { itemId, tierIndex = 0, choice = null, addOn = false } = action
        const item = findItem(itemId)
        if (!item) return state

        const key = lineKey({ itemId, tierIndex, choice, addOn })
        const existing = state.find((line) => line.key === key)
        if (existing) {
          return state.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line))
        }

        return [
          ...state,
          {
            key,
            itemId,
            name: item.name,
            groupName: item.groupName,
            tierIndex,
            tierLabel: item.tiers?.[tierIndex] ?? null,
            choice,
            addOn,
            addOnLabel: addOn ? item.addOn.label : null,
            unitPrice: priceOf(item, tierIndex, addOn),
            qty: 1,
          },
        ]
      }

      case 'setQty':
        return state
          .map((line) => (line.key === action.key ? { ...line, qty: action.qty } : line))
          .filter((line) => line.qty > 0)

      case 'toggleAddOn': {
        // Moving a line onto/off an add-on can collide with an existing line.
        const line = state.find((candidate) => candidate.key === action.key)
        if (!line) return state
        const item = findItem(line.itemId)
        if (!item?.addOn) return state

        const addOn = !line.addOn
        const nextKey = lineKey({ ...line, addOn })
        const collision = state.find((candidate) => candidate.key === nextKey)

        const updated = {
          ...line,
          key: nextKey,
          addOn,
          addOnLabel: addOn ? item.addOn.label : null,
          unitPrice: priceOf(item, line.tierIndex, addOn),
        }

        if (collision) {
          return state
            .filter((candidate) => candidate.key !== line.key)
            .map((candidate) =>
              candidate.key === nextKey ? { ...candidate, qty: candidate.qty + line.qty } : candidate,
            )
        }
        return state.map((candidate) => (candidate.key === line.key ? updated : candidate))
      }

      case 'remove':
        return state.filter((line) => line.key !== action.key)

      case 'clear':
        return []

      default:
        return state
    }
  }
}

const CartContext = createContext(null)

export function CartProvider({ table, children }) {
  const { findItem } = useMenu()
  const reducer = useMemo(() => makeReducer(findItem), [findItem])
  const [lines, dispatch] = useReducer(reducer, [])

  // Rehydrate when the table changes; sessionStorage keeps it to this seating.
  useEffect(() => {
    if (!table) return
    try {
      const raw = sessionStorage.getItem(storageKey(table))
      dispatch({ type: 'hydrate', lines: raw ? JSON.parse(raw) : [] })
    } catch {
      dispatch({ type: 'hydrate', lines: [] })
    }
  }, [table])

  useEffect(() => {
    if (!table) return
    try {
      sessionStorage.setItem(storageKey(table), JSON.stringify(lines))
    } catch {
      /* Nothing to do — the cart still works for this session. */
    }
  }, [lines, table])

  const add = useCallback((options) => dispatch({ type: 'add', ...options }), [])
  const setQty = useCallback((key, qty) => dispatch({ type: 'setQty', key, qty }), [])
  const remove = useCallback((key) => dispatch({ type: 'remove', key }), [])
  const toggleAddOn = useCallback((key) => dispatch({ type: 'toggleAddOn', key }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.qty, 0), [lines])
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
    [lines],
  )

  /** Total already in the cart for one menu item, across every variant. */
  const qtyOfItem = useCallback(
    (itemId) =>
      lines.reduce((sum, line) => (line.itemId === itemId ? sum + line.qty : sum), 0),
    [lines],
  )

  const value = useMemo(
    () => ({ lines, add, setQty, remove, toggleAddOn, clear, count, subtotal, qtyOfItem }),
    [lines, add, setQty, remove, toggleAddOn, clear, count, subtotal, qtyOfItem],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
