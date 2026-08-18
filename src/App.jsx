import { useCallback, useEffect, useRef, useState } from 'react'
import CustomerMenu from './components/customer/CustomerMenu'
import TableGate from './components/customer/TableGate'
import SessionEnded from './components/customer/SessionEnded'
import AdminDashboard from './components/admin/AdminDashboard'
import PassGate from './components/admin/PassGate'
import { CartProvider } from './store/CartContext'
import { OrdersProvider, useOrders } from './store/OrdersContext'
import { AvailabilityProvider } from './store/AvailabilityContext'
import { MenuProvider } from './store/MenuContext'
import { WaiterCallProvider } from './store/WaiterCallContext'
import { useRoute } from './lib/useRoute'
import { backend } from './store/backend'

/**
 * Two screens off one URL:
 *
 *   ?t=<token>      the customer's menu (table encoded in a signed token)
 *   ?view=admin     the kitchen pass
 *   (no table)      the scan prompt
 *
 * Both sit inside OrdersProvider, so an order placed on one is on the other
 * immediately — in this tab, and in any other tab on this browser.
 *
 * Each view carries its own way across: the pass has a "Customer view" button
 * in its header, and in demo mode the menu has a link in its footer. No
 * floating switcher — it would sit on top of the very layout it demonstrates.
 */

/* ── Idle timeout: 30 min of no taps / scrolls / keypresses ────────────── */

const IDLE_MS = 30 * 60 * 1000

/**
 * Invisible watcher that sits *inside* the providers. Once all orders for
 * this table disappear after the customer had at least one, it tells the
 * parent to expire the session — which unmounts the providers and frees the
 * Supabase connection.
 */
function SessionWatcher({ onExpire }) {
  const { orders } = useOrders()
  const hadOrders = useRef(false)

  useEffect(() => {
    if (orders.length > 0) {
      hadOrders.current = true
    } else if (hadOrders.current) {
      // All orders for this table were cleared → session over.
      onExpire('cleared')
    }
  }, [orders, onExpire])

  return null
}

export default function App() {
  const { view, table, demo, navigate } = useRoute()
  const [expired, setExpired] = useState(false)
  const [expireReason, setExpireReason] = useState(null)
  const idleTimer = useRef(null)

  /* ── Session expiry callback ─────────────────────────────────────────── */

  const handleExpire = useCallback((reason) => {
    setExpired(true)
    setExpireReason(reason)
    // Actively drop all realtime channels so the WebSocket closes.
    backend.disconnect()
  }, [])

  /* ── Reset when the customer re-scans a QR code ──────────────────────── */

  useEffect(() => {
    if (table) {
      setExpired(false)
      setExpireReason(null)
    }
  }, [table])

  /* ── Idle timeout (customer views only) ──────────────────────────────── */

  useEffect(() => {
    if (view === 'admin' || !table || expired) return

    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => handleExpire('timeout'), IDLE_MS)
    }

    resetIdle()

    const events = ['touchstart', 'mousedown', 'scroll', 'keydown']
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }))

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      events.forEach((e) => window.removeEventListener(e, resetIdle))
    }
  }, [view, table, expired, handleExpire])

  /* ── Free connections when customers leave or lock their phone ──────── */

  const bgTimer = useRef(null)

  useEffect(() => {
    if (view === 'admin' || !table) return

    // Close WebSocket when the tab is closed / navigated away.
    // These are terminal events — no reconnection needed.
    const onPageHide = () => backend.disconnect()

    // When the phone is locked or the tab is backgrounded, start a grace
    // period. If the customer doesn't return within BACKGROUND_GRACE_MS,
    // drop the Realtime channels to free a connection slot. If they come
    // back sooner, cancel the timer so existing channels stay alive and
    // no re-subscribe is needed.
    const BACKGROUND_GRACE_MS = 2 * 60 * 1000 // 2 minutes

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        bgTimer.current = setTimeout(() => {
          backend.disconnect()
          bgTimer.current = null
        }, BACKGROUND_GRACE_MS)
      } else {
        // Page came back — cancel deferred disconnect.
        if (bgTimer.current) {
          clearTimeout(bgTimer.current)
          bgTimer.current = null
        }
      }
    }

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
      if (bgTimer.current) clearTimeout(bgTimer.current)
    }
  }, [view, table])

  /* ── Admin view ──────────────────────────────────────────────────────── */

  if (view === 'admin') {
    return (
      <PassGate>
        <MenuProvider>
          <OrdersProvider>
            <AvailabilityProvider>
              <WaiterCallProvider>
                <AdminDashboard onOpenMenu={() => navigate({ view: 'menu', table: table ?? '4' })} />
              </WaiterCallProvider>
            </AvailabilityProvider>
          </OrdersProvider>
        </MenuProvider>
      </PassGate>
    )
  }

  /* ── Customer: session expired ───────────────────────────────────────── */

  if (table && expired) {
    return (
      <SessionEnded
        reason={expireReason}
        onRescan={() => navigate({ view: 'menu', table: null })}
      />
    )
  }

  /* ── Customer: no table yet (QR scan prompt) ─────────────────────────── */

  if (!table) {
    return (
      <TableGate
        demo={demo}
        onTable={(next) => navigate({ view: 'menu', table: next })}
        onOpenPass={() => navigate({ view: 'admin' })}
      />
    )
  }

  /* ── Customer: active session ────────────────────────────────────────── */

  return (
    <MenuProvider>
      <OrdersProvider table={table}>
        <AvailabilityProvider>
          <WaiterCallProvider>
            <CartProvider table={table}>
              <SessionWatcher onExpire={handleExpire} />
              <CustomerMenu
                table={table}
                demo={demo}
                onChangeTable={() => navigate({ view: 'menu', table: null })}
                onOpenPass={() => navigate({ view: 'admin' })}
              />
            </CartProvider>
          </WaiterCallProvider>
        </AvailabilityProvider>
      </OrdersProvider>
    </MenuProvider>
  )
}
