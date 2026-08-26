/**
 * SessionLifecycle.test.jsx — Integration tests for SessionWatcher & Session Lifecycle Engine
 *
 * Covers test-case IDs:
 *   TC-1.1‥1.8   30-minute idle timeout
 *   TC-2.1‥2.10  2-minute background grace period
 *   TC-3.1‥3.8   Table cleared state (SessionWatcher)
 *   TC-4.3‥4.4   Cross-cutting race conditions
 *
 * Heavy components (CustomerMenu, AdminDashboard, PassGate, providers) are
 * mocked to keep tests fast and focused on the session lifecycle logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { encodeTable } from '../lib/tableToken'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Constants (mirrored from App.jsx)                                         */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const IDLE_MS = 30 * 60 * 1000            // 1,800,000 ms
const BACKGROUND_GRACE_MS = 2 * 60 * 1000 // 120,000 ms

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Hoisted mutable state — available inside vi.mock factories                */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const { mockOrdersRef, mockDisconnect } = vi.hoisted(() => ({
  mockOrdersRef: { current: [] },
  mockDisconnect: vi.fn(),
}))

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Mocks — lightweight stand-ins for heavy components & context providers    */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

vi.mock('../components/customer/CustomerMenu', () => ({
  default: ({ table }) => (
    <div data-testid="customer-menu">CustomerMenu table={table}</div>
  ),
}))

vi.mock('../components/customer/TableGate', () => ({
  default: ({ demo, onTable, onOpenPass }) => (
    <div data-testid="table-gate">TableGate</div>
  ),
}))

vi.mock('../components/customer/SessionEnded', () => ({
  default: ({ reason, onRescan }) => (
    <div data-testid="session-ended" data-reason={reason}>
      SessionEnded reason={reason}
      <button data-testid="rescan-btn" onClick={onRescan}>Rescan</button>
    </div>
  ),
}))

vi.mock('../components/admin/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard">AdminDashboard</div>,
}))

vi.mock('../components/admin/PassGate', () => ({
  default: ({ children }) => <div data-testid="pass-gate">{children}</div>,
}))

vi.mock('../store/CartContext', () => ({
  CartProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../store/OrdersContext', () => ({
  OrdersProvider: ({ children }) => <>{children}</>,
  useOrders: () => ({ orders: mockOrdersRef.current }),
}))

vi.mock('../store/AvailabilityContext', () => ({
  AvailabilityProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../store/MenuContext', () => ({
  MenuProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../store/WaiterCallContext', () => ({
  WaiterCallProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../store/backend', () => ({
  backend: { disconnect: mockDisconnect },
}))

/* ── Import App — vi.mock hoists above static imports, so mocks are ready ── */

import App from '../App.jsx'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let originalHref

function setLocation(pathAndQuery) {
  const url = new URL(pathAndQuery, 'http://localhost')
  window.history.replaceState({}, '', url.pathname + url.search)
}

/** Point the URL at a signed customer session for the given table. */
function setCustomerSession(table = '4') {
  setLocation(`/?t=${encodeTable(table)}`)
}

/**
 * document.visibilityState is read-only in the real browser. Override it
 * with a configurable getter so tests can toggle hidden ↔ visible.
 */
let _visibilityState = 'visible'

Object.defineProperty(document, 'visibilityState', {
  configurable: true,
  get: () => _visibilityState,
})

function tabHidden() {
  _visibilityState = 'hidden'
  document.dispatchEvent(new Event('visibilitychange'))
}

function tabVisible() {
  _visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
}

/** Minimal order object for testing SessionWatcher's order-count logic. */
function makeOrder(id = 'TCM-0001', table = '4', status = 'pending') {
  return {
    id,
    seq: parseInt(id.split('-')[1]),
    table,
    lines: [{ name: 'Adrak Chai', qty: 1, unitPrice: 120, key: 'chai|0|-|-' }],
    note: '',
    subtotal: 120,
    taxPercent: 0,
    taxAmount: 0,
    total: 120,
    customerName: 'Test',
    customerPhone: '9876543210',
    status,
    placedAt: new Date().toISOString(),
    history: [{ status, at: new Date().toISOString() }],
  }
}

/* ── Per-test reset ───────────────────────────────────────────────────────── */

beforeEach(() => {
  originalHref = window.location.href
  mockOrdersRef.current = []
  mockDisconnect.mockClear()
  _visibilityState = 'visible'
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', originalHref)
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Suite 1 — 30-Minute Idle Timeout (App.jsx:30–99)                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Suite 1 — 30-Minute Idle Timeout', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('TC-1.1: full 30-minute inactivity → SessionEnded reason=timeout', () => {
    setCustomerSession()
    render(<App />)
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(IDLE_MS) })

    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'timeout')
    expect(screen.queryByTestId('customer-menu')).not.toBeInTheDocument()
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('TC-1.2: mousedown at 25 min resets the idle clock', () => {
    setCustomerSession()
    render(<App />)

    // 25 min in: still active
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000) })
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // User interaction resets the timer
    act(() => { window.dispatchEvent(new Event('mousedown')) })

    // 25 more min from original start (50 min total), only 25 min since tap
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000) })
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // 5 more min → 30 min since last interaction → timeout
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000) })
    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'timeout')
  })

  it.each(['touchstart', 'mousedown', 'scroll', 'keydown'])(
    'TC-1.3: "%s" event resets the idle timer independently',
    (eventName) => {
      setCustomerSession()
      render(<App />)

      // Advance to 1 s before timeout
      act(() => { vi.advanceTimersByTime(IDLE_MS - 1000) })
      expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

      // Fire the tracked event → timer restarts
      act(() => { window.dispatchEvent(new Event(eventName)) })

      // 1 min later: only 1 min since interaction, should NOT expire
      act(() => { vi.advanceTimersByTime(60 * 1000) })
      expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

      // 29 more min → 30 min since last interaction → expires
      act(() => { vi.advanceTimersByTime(29 * 60 * 1000) })
      expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    },
  )

  it('TC-1.4: untracked events do NOT reset the idle timer', () => {
    setCustomerSession()
    render(<App />)

    act(() => { vi.advanceTimersByTime(20 * 60 * 1000) }) // 20 min

    // Fire several events that are NOT in the tracked list
    ;['mousemove', 'click', 'focus', 'pointerup'].forEach((name) => {
      act(() => { window.dispatchEvent(new Event(name)) })
    })

    // 10 more min → 30 min total from mount → expires
    act(() => { vi.advanceTimersByTime(10 * 60 * 1000) })
    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'timeout')
  })

  it('TC-1.5: idle timer does NOT activate on admin view', () => {
    setLocation('/?view=admin')
    render(<App />)

    act(() => { vi.advanceTimersByTime(2 * IDLE_MS) }) // 60 min

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-1.6: idle timer does NOT activate when no table is set', () => {
    setLocation('/')
    render(<App />)

    act(() => { vi.advanceTimersByTime(2 * IDLE_MS) }) // 60 min

    expect(screen.getByTestId('table-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
  })

  it('TC-1.7: no second timer fires after session is already expired', () => {
    setCustomerSession()
    render(<App />)

    act(() => { vi.advanceTimersByTime(IDLE_MS) }) // expires
    expect(screen.getByTestId('session-ended')).toBeInTheDocument()

    mockDisconnect.mockClear()

    // Wait another full idle period
    act(() => { vi.advanceTimersByTime(IDLE_MS) })

    // disconnect should NOT be called again (expired guard prevents re-setup)
    expect(mockDisconnect).not.toHaveBeenCalled()
    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
  })

  it('TC-1.8: timer cleanup on unmount — no dangling setTimeout', () => {
    setCustomerSession()
    const { unmount } = render(<App />)

    act(() => { vi.advanceTimersByTime(10 * 60 * 1000) }) // 10 min
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    unmount()

    // Advance well past timeout — the cleaned-up timer must not fire
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000) })
    expect(mockDisconnect).not.toHaveBeenCalled()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Suite 2 — 2-Minute Background Grace Period (App.jsx:101–144)              */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Suite 2 — 2-Minute Background Grace Period', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('TC-2.1: return at 1 min 50 sec (within grace) — session stays alive', () => {
    setCustomerSession()
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(110_000) }) // 1 m 50 s
    act(() => { tabVisible() })

    expect(mockDisconnect).not.toHaveBeenCalled()
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
  })

  it('TC-2.2: return at 2 min 10 sec (past grace) — WS disconnected', () => {
    setCustomerSession()
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(130_000) }) // 2 m 10 s — grace fires at 120 s
    act(() => { tabVisible() })

    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    // Session UI stays up — disconnect only tears down Realtime channels,
    // it does NOT set expired. The customer sees the menu until idle fires.
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
  })

  it('TC-2.3: exact 2 min boundary — grace timer fires', () => {
    setCustomerSession()
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(BACKGROUND_GRACE_MS) }) // exactly 120 000 ms
    act(() => { tabVisible() })

    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('TC-2.4: multiple background/foreground cycles within grace', () => {
    setCustomerSession()
    render(<App />)

    // Cycle 1: hidden 30 s
    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(30_000) })
    act(() => { tabVisible() })

    // Cycle 2: hidden 45 s
    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(45_000) })
    act(() => { tabVisible() })

    // Cycle 3: hidden 1 m 50 s
    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(110_000) })
    act(() => { tabVisible() })

    expect(mockDisconnect).not.toHaveBeenCalled()
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
  })

  it('TC-2.5: rapid tab-switch flicker (hidden → visible < 100 ms)', () => {
    setCustomerSession()
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(50) }) // 50 ms
    act(() => { tabVisible() })

    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-2.6: background grace does NOT apply on admin view', () => {
    setLocation('/?view=admin')
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000) }) // 5 min, well past grace
    act(() => { tabVisible() })

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-2.7: pagehide immediately disconnects (no grace period)', () => {
    setCustomerSession()
    render(<App />)

    act(() => { window.dispatchEvent(new Event('pagehide')) })

    // Immediate — no 2-minute wait
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('TC-2.8: background disconnect + idle timeout interaction', () => {
    setCustomerSession()
    render(<App />)

    // Tab hidden immediately (t = 0)
    act(() => { tabHidden() })

    // Advance 3 min → grace fires at t = 2 min (disconnect #1)
    act(() => { vi.advanceTimersByTime(3 * 60 * 1000) })
    expect(mockDisconnect).toHaveBeenCalledTimes(1)

    // Continue to t = 30 min → idle fires (disconnect #2 via handleExpire)
    act(() => { vi.advanceTimersByTime(27 * 60 * 1000) })
    expect(mockDisconnect).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'timeout')
  })

  it('TC-2.9: background timer cleaned up on unmount', () => {
    setCustomerSession()
    const { unmount } = render(<App />)

    // Tab hidden → grace timer is pending
    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(30_000) }) // 30 s into grace

    unmount()

    // Advance past grace — timer was cleaned up, disconnect must not fire
    act(() => { vi.advanceTimersByTime(3 * 60 * 1000) })
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-2.10: session stays active on return to visible within grace', () => {
    // OrdersContext (line 87-97) re-fetches orders on visibilitychange → visible.
    // With mocked OrdersContext, we verify the App shell survives the cycle.
    // Full refresh testing requires un-mocked OrdersContext + backend spy.
    setCustomerSession()
    render(<App />)

    act(() => { tabHidden() })
    act(() => { vi.advanceTimersByTime(30_000) }) // 30 s
    act(() => { tabVisible() })

    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Suite 3 — Table Cleared State (SessionWatcher, App.jsx:40–54)             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Suite 3 — Table Cleared State (SessionWatcher)', () => {
  it('TC-3.1: all orders archived → SessionEnded reason=cleared', () => {
    mockOrdersRef.current = [makeOrder('TCM-0001'), makeOrder('TCM-0002')]
    setCustomerSession()
    const { rerender } = render(<App />)

    // hadOrders latched to true
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // Staff archives both orders → count drops to 0
    mockOrdersRef.current = []
    rerender(<App />)

    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'cleared')
    expect(screen.queryByTestId('customer-menu')).not.toBeInTheDocument()
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('TC-3.2: partial clearance (1 of 2 archived) does NOT trigger expiry', () => {
    mockOrdersRef.current = [
      makeOrder('TCM-0001', '4', 'completed'),
      makeOrder('TCM-0002', '4', 'preparing'),
    ]
    setCustomerSession()
    const { rerender } = render(<App />)

    // Archive only the completed order → 1 remains
    mockOrdersRef.current = [makeOrder('TCM-0002', '4', 'preparing')]
    rerender(<App />)

    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-3.3: fresh session with zero orders never triggers cleared', () => {
    // hadOrders stays false because orders was never > 0
    mockOrdersRef.current = []
    setCustomerSession()
    render(<App />)

    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-3.4: single order voided to zero → triggers cleared', () => {
    mockOrdersRef.current = [makeOrder('TCM-0003')]
    setCustomerSession()
    const { rerender } = render(<App />)

    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // Admin voids the only item → order completed + archived → 0 orders
    mockOrdersRef.current = []
    rerender(<App />)

    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'cleared')
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('TC-3.5: other tables being cleared does not affect this table', () => {
    mockOrdersRef.current = [makeOrder('TCM-0001', '4')]
    setCustomerSession('4')
    const { rerender } = render(<App />)

    // Admin archives table 7; table 4's order is unchanged.
    // In production OrdersProvider.listForTable('4') returns the same order.
    mockOrdersRef.current = [makeOrder('TCM-0001', '4')]
    rerender(<App />)

    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-3.6: order placed → completed → archived in rapid sequence → cleared', () => {
    mockOrdersRef.current = []
    setCustomerSession()
    const { rerender } = render(<App />)

    // Order placed → hadOrders latches true
    mockOrdersRef.current = [makeOrder('TCM-0004')]
    rerender(<App />)
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // Immediately completed + archived → 0 orders
    mockOrdersRef.current = []
    rerender(<App />)

    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'cleared')
  })

  it('TC-3.7: onExpire callback is stable — no infinite loops on re-render', () => {
    mockOrdersRef.current = [makeOrder()]
    setCustomerSession()
    const { rerender } = render(<App />)

    // Multiple re-renders with changing order arrays
    mockOrdersRef.current = [makeOrder(), makeOrder('TCM-0002')]
    rerender(<App />)

    mockOrdersRef.current = [makeOrder()]
    rerender(<App />)

    // Session remains active (no crash, no infinite loop, no spurious expiry)
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-3.8: re-scan after cleared state resets the session', () => {
    // Reach the cleared state
    mockOrdersRef.current = [makeOrder()]
    setCustomerSession()
    const { rerender } = render(<App />)

    mockOrdersRef.current = []
    rerender(<App />)
    expect(screen.getByTestId('session-ended')).toBeInTheDocument()
    mockDisconnect.mockClear()

    // Click "Scan QR to start a new session" → navigate({ table: null })
    act(() => { fireEvent.click(screen.getByTestId('rescan-btn')) })
    expect(screen.getByTestId('table-gate')).toBeInTheDocument()

    // Simulate QR re-scan → new table URL + popstate
    act(() => {
      setCustomerSession('4')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // Fresh session — CustomerMenu displayed, SessionEnded gone
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('session-ended')).not.toBeInTheDocument()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Suite 4 — Cross-Cutting Race Conditions                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Suite 4 — Cross-Cutting Edge Cases', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('TC-4.3: table-cleared before idle timeout — cleared wins, timeout suppressed', () => {
    mockOrdersRef.current = [makeOrder()]
    setCustomerSession()
    const { rerender } = render(<App />)

    // Advance to t = 29 min (1 min before idle timeout)
    act(() => { vi.advanceTimersByTime(29 * 60 * 1000) })
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // Table cleared → onExpire('cleared')
    mockOrdersRef.current = []
    rerender(<App />)

    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'cleared')
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    mockDisconnect.mockClear()

    // Advance 1 more min (would have been the 30-min idle mark)
    act(() => { vi.advanceTimersByTime(60 * 1000) })

    // Reason is still 'cleared', NOT overwritten by 'timeout'
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'cleared')
    // Idle timer was cleaned up when provider tree unmounted
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('TC-4.4: concurrent idle timeout + background grace at same instant', () => {
    setCustomerSession()
    render(<App />)

    // Advance to t = 28 min
    act(() => { vi.advanceTimersByTime(28 * 60 * 1000) })
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()

    // Tab hidden at t = 28 min → grace timer set for t = 30 min
    act(() => { tabHidden() })

    // Advance 2 min → t = 30 min: both idle (30 min mark) and grace (28 + 2) fire
    act(() => { vi.advanceTimersByTime(2 * 60 * 1000) })

    // Both disconnects fire (idempotent — no crash)
    expect(mockDisconnect).toHaveBeenCalledTimes(2)
    // Idle timer fires first (registered earlier) → reason = timeout
    expect(screen.getByTestId('session-ended')).toHaveAttribute('data-reason', 'timeout')
  })
})
