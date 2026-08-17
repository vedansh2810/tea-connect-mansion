import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend } from './backend'

/**
 * The order store, shared by the customer menu and the kitchen pass.
 *
 * All persistence lives in `backend` — either a hosted database or this
 * browser's storage. This file only holds the React state and the operations
 * the UI needs, so switching backends never touches a component.
 *
 * Every change re-reads the backend rather than trusting a message payload, so
 * the store stays the single source of truth and a duplicate notification is
 * harmless.
 */

export const STATUSES = ['pending', 'preparing', 'served', 'completed']

export const STATUS_META = {
  pending: { label: 'Pending', next: 'preparing', action: 'Start preparing' },
  preparing: { label: 'Preparing', next: 'served', action: 'Mark served' },
  served: { label: 'Served', next: 'completed', action: 'Close bill' },
  completed: { label: 'Completed', next: null, action: null },
}

/**
 * Kitchen-readable failures.
 *
 * The people reading this screen are cooking, not debugging. Say what happened
 * and what to do about it — never surface a stack trace to someone holding a
 * pan. The original message goes to the console for whoever maintains this.
 */
function humanError(cause) {
  const raw = cause?.message ?? ''
  if (import.meta.env.DEV) console.error('[orders]', cause)

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return 'Cannot reach the order system. Check the internet connection.'
  }
  if (/row-level security|permission|denied|jwt/i.test(raw)) {
    return 'The order system refused that change. Sign in again, or call whoever set this up.'
  }
  if (/timeout|timed out/i.test(raw)) {
    return 'The order system is slow to answer. Try again in a moment.'
  }
  return 'Something went wrong reaching the order system. Try again.'
}

const OrdersContext = createContext(null)

export function OrdersProvider({ table: scopeTable, children }) {
  const [orders, setOrders] = useState([])
  const [status, setStatusState] = useState('connecting')
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const rows = scopeTable
        ? await backend.listForTable(scopeTable)
        : await backend.list()
      if (!mounted.current) return
      setOrders(rows)
      setStatusState('ready')
      setError(null)
    } catch (cause) {
      if (!mounted.current) return
      // Keep whatever is on screen: a cook mid-service needs the last known
      // tickets more than they need an empty page.
      setStatusState('error')
      setError(humanError(cause))
    }
  }, [scopeTable])

  useEffect(() => {
    mounted.current = true
    refresh()
    const unsubscribe = scopeTable
      ? backend.subscribeForTable(scopeTable, refresh)
      : backend.subscribe(refresh)
    return () => {
      mounted.current = false
      unsubscribe?.()
    }
  }, [refresh, scopeTable])

  // Reconnect when the tablet wakes or the network comes back.
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  // Takes the whole draft rather than picking fields out of it: the last time
  // this destructured a fixed list, adding tax silently dropped it, and the
  // customer saw one total while the kitchen ticket showed another.
  const placeOrder = useCallback(
    async (draft) => {
      const order = await backend.place(draft)
      // Show it immediately; the subscription will confirm it shortly.
      setOrders((current) =>
        current.some((candidate) => candidate.id === order.id) ? current : [order, ...current],
      )
      return order
    },
    [],
  )

  const setStatus = useCallback(
    async (orderId, next) => {
      const current = orders.find((candidate) => candidate.id === orderId)
      const history = [...(current?.history ?? []), { status: next, at: new Date().toISOString() }]
      // Optimistic: the pass must feel instant under a tap, even on café Wi-Fi.
      setOrders((rows) =>
        rows.map((row) => (row.id === orderId ? { ...row, status: next, history } : row)),
      )
      try {
        await backend.update(orderId, { status: next, history })
      } catch (cause) {
        setError(humanError(cause))
        refresh()
      }
    },
    [orders, refresh],
  )

  const advance = useCallback(
    (orderId) => {
      const order = orders.find((candidate) => candidate.id === orderId)
      const next = order && STATUS_META[order.status]?.next
      if (next) setStatus(orderId, next)
    },
    [orders, setStatus],
  )

  /** Edit individual line items on an existing order. Recalculates totals. */
  const editOrderLines = useCallback(
    async (orderId, newLines, reason = '') => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      const subtotal = newLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
      const taxPercent = order.taxPercent ?? 0
      const taxAmount = taxPercent > 0 ? Math.round((subtotal * taxPercent) / 100) : 0
      const total = subtotal + taxAmount

      // Optimistic
      setOrders((rows) =>
        rows.map((row) =>
          row.id === orderId ? { ...row, lines: newLines, subtotal, taxAmount, total } : row,
        ),
      )

      try {
        await backend.updateOrderLines(orderId, newLines, subtotal, taxAmount, total)
        await backend.logAudit(orderId, 'edit_lines', {
          reason,
          lineCount: newLines.length,
          newSubtotal: subtotal,
        })
      } catch (cause) {
        setError(humanError(cause))
        refresh()
      }
    },
    [orders, refresh],
  )

  /** Void a single line item from an order. */
  const voidItem = useCallback(
    async (orderId, lineKey, reason = '') => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      const removedLine = order.lines.find((l) => l.key === lineKey)
      const newLines = order.lines.filter((l) => l.key !== lineKey)

      if (newLines.length === 0) {
        // If voiding the last item, mark the order completed
        await setStatus(orderId, 'completed')
        await backend.logAudit(orderId, 'void_item', {
          reason,
          itemName: removedLine?.name,
          note: 'Last item voided — order closed',
        })
        return
      }

      const subtotal = newLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
      const taxPercent = order.taxPercent ?? 0
      const taxAmount = taxPercent > 0 ? Math.round((subtotal * taxPercent) / 100) : 0
      const total = subtotal + taxAmount

      setOrders((rows) =>
        rows.map((row) =>
          row.id === orderId ? { ...row, lines: newLines, subtotal, taxAmount, total } : row,
        ),
      )

      try {
        await backend.updateOrderLines(orderId, newLines, subtotal, taxAmount, total)
        await backend.logAudit(orderId, 'void_item', {
          reason,
          itemName: removedLine?.name,
          qty: removedLine?.qty,
          amount: removedLine ? removedLine.qty * removedLine.unitPrice : 0,
        })
      } catch (cause) {
        setError(humanError(cause))
        refresh()
      }
    },
    [orders, refresh, setStatus],
  )

  const clearCompleted = useCallback(async () => {
    setOrders((rows) => rows.filter((row) => row.status !== 'completed'))
    try {
      await backend.removeCompleted()
    } catch (cause) {
      setError(humanError(cause))
      refresh()
    }
  }, [refresh])

  const resetAll = useCallback(async () => {
    setOrders([])
    try {
      await backend.removeAll()
    } catch {
      refresh()
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      orders,
      placeOrder,
      setStatus,
      advance,
      editOrderLines,
      voidItem,
      clearCompleted,
      resetAll,
      refresh,
      mode: backend.mode,
      connection: status,
      error,
      dismissError: () => setError(null),
    }),
    [orders, placeOrder, setStatus, advance, editOrderLines, voidItem, clearCompleted, resetAll, refresh, status, error],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) throw new Error('useOrders must be used inside <OrdersProvider>')
  return context
}

/** Orders for one table, newest first — powers the customer's "your orders" list. */
export function useTableOrders(table) {
  const { orders } = useOrders()
  return useMemo(
    () => (table ? orders.filter((order) => order.table === String(table)) : []),
    [orders, table],
  )
}
