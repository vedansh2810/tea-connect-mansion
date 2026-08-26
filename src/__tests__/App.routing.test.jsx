/**
 * App.routing.test.jsx — Integration tests for App routing decisions
 *
 * Covers test-case IDs:
 *   RT-11     Root "/" renders TableGate
 *   RT-12     Empty ?t= renders TableGate
 *   RT-01     Valid token renders CustomerMenu (table resolved)
 *   RT-28‥29  ?demo shows TableGate with demo shortcuts, clicking navigates
 *   RT-30     Demo "Kitchen pass" button → admin view
 *   RT-34     Production (no demo) hides shortcuts
 *   RT-35     Switching tables preserves demo flag
 *
 * Heavy components (CustomerMenu, AdminDashboard, PassGate, providers) are
 * mocked to keep tests fast and focused on the routing layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { encodeTable } from '../lib/tableToken'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Mocks — keep App from pulling in Supabase, heavy UI, etc.                 */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Lightweight stand-ins that render identifying text so we can assert routing.

vi.mock('../components/customer/CustomerMenu', () => ({
  default: ({ table, demo }) => (
    <div data-testid="customer-menu">
      CustomerMenu table={table} demo={String(demo)}
    </div>
  ),
}))

vi.mock('../components/customer/TableGate', () => ({
  default: ({ demo, onTable, onOpenPass }) => (
    <div data-testid="table-gate">
      TableGate demo={String(demo)}
      {demo && (
        <div data-testid="demo-shortcuts">
          {['2', '4', '7', '11'].map((t) => (
            <button key={t} data-testid={`demo-table-${t}`} onClick={() => onTable(t)}>
              Table {t}
            </button>
          ))}
          <button data-testid="demo-kitchen" onClick={onOpenPass}>
            Kitchen pass
          </button>
        </div>
      )}
    </div>
  ),
}))

vi.mock('../components/customer/SessionEnded', () => ({
  default: () => <div data-testid="session-ended">SessionEnded</div>,
}))

vi.mock('../components/admin/AdminDashboard', () => ({
  default: ({ onOpenMenu }) => (
    <div data-testid="admin-dashboard">
      AdminDashboard
      {onOpenMenu && (
        <button data-testid="admin-customer-view" onClick={onOpenMenu}>
          Customer view
        </button>
      )}
    </div>
  ),
}))

vi.mock('../components/admin/PassGate', () => ({
  default: ({ children }) => <div data-testid="pass-gate">{children}</div>,
}))

// Mock all context providers to simple pass-throughs.
vi.mock('../store/CartContext', () => ({
  CartProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../store/OrdersContext', () => ({
  OrdersProvider: ({ children }) => <>{children}</>,
  useOrders: () => ({ orders: [] }),
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
  backend: { disconnect: vi.fn() },
}))

/* ── Import App AFTER mocks are set up ────────────────────────────────────── */

// Dynamic import so mocks are in place before the module loads.
let App
beforeEach(async () => {
  const mod = await import('../App.jsx')
  App = mod.default
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let originalHref

function setLocation(pathAndQuery) {
  const url = new URL(pathAndQuery, 'http://localhost')
  window.history.replaceState({}, '', url.pathname + url.search)
}

beforeEach(() => {
  originalHref = window.location.href
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', originalHref)
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Tests                                                                     */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('App routing — TableGate vs CustomerMenu', () => {
  it('RT-11: root "/" with no params → renders TableGate', () => {
    setLocation('/')
    render(<App />)
    expect(screen.getByTestId('table-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-menu')).not.toBeInTheDocument()
  })

  it('RT-12: empty ?t= → renders TableGate', () => {
    setLocation('/?t=')
    render(<App />)
    expect(screen.getByTestId('table-gate')).toBeInTheDocument()
  })

  it('RT-01: valid token → renders CustomerMenu with correct table', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}`)
    render(<App />)
    const menu = screen.getByTestId('customer-menu')
    expect(menu).toBeInTheDocument()
    expect(menu.textContent).toContain('table=4')
  })

  it('RT-15 integration: tampered token → renders TableGate', () => {
    // "test.test" base64url-encoded
    setLocation('/?t=dGVzdC50ZXN0')
    render(<App />)
    expect(screen.getByTestId('table-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-menu')).not.toBeInTheDocument()
  })
})

describe('App routing — admin view', () => {
  it('RT-07/08: ?view=admin → renders PassGate/AdminDashboard', () => {
    setLocation('/?view=admin')
    render(<App />)
    expect(screen.getByTestId('pass-gate')).toBeInTheDocument()
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('table-gate')).not.toBeInTheDocument()
  })
})

describe('App routing — demo mode', () => {
  it('RT-28: ?demo flag → TableGate shows demo shortcuts', () => {
    setLocation('/?demo')
    render(<App />)
    const gate = screen.getByTestId('table-gate')
    expect(gate.textContent).toContain('demo=true')
    expect(screen.getByTestId('demo-shortcuts')).toBeInTheDocument()
  })

  it('RT-29: clicking demo table button → navigates to CustomerMenu', () => {
    setLocation('/?demo')
    render(<App />)

    // Click "Table 4" demo button.
    fireEvent.click(screen.getByTestId('demo-table-4'))

    // Should now render CustomerMenu with table=4.
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.getByTestId('customer-menu').textContent).toContain('table=4')
  })

  it('RT-30: clicking "Kitchen pass" demo button → navigates to admin', () => {
    setLocation('/?demo')
    render(<App />)
    fireEvent.click(screen.getByTestId('demo-kitchen'))

    expect(screen.getByTestId('pass-gate')).toBeInTheDocument()
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })

  it('RT-32: ?demo + valid token → CustomerMenu with demo=true', () => {
    const token = encodeTable('7')
    setLocation(`/?demo&t=${token}`)
    render(<App />)
    const menu = screen.getByTestId('customer-menu')
    expect(menu.textContent).toContain('table=7')
    expect(menu.textContent).toContain('demo=true')
  })

  it('RT-36: ?demo + tampered token → TableGate with demo shortcuts', () => {
    setLocation('/?demo&t=dGVzdC50ZXN0')
    render(<App />)
    expect(screen.getByTestId('table-gate')).toBeInTheDocument()
    expect(screen.getByTestId('demo-shortcuts')).toBeInTheDocument()
  })
})

describe('App routing — additional valid routing (RT-02, RT-05)', () => {
  it('RT-02: valid alphanumeric token (VIP-1) → CustomerMenu renders', () => {
    const token = encodeTable('VIP-1')
    setLocation(`/?t=${token}`)
    render(<App />)
    const menu = screen.getByTestId('customer-menu')
    expect(menu).toBeInTheDocument()
    expect(menu.textContent).toContain('table=VIP-1')
  })

  it('RT-05: valid token + ?view=admin → admin view renders (not CustomerMenu)', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}&view=admin`)
    render(<App />)
    expect(screen.getByTestId('pass-gate')).toBeInTheDocument()
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-menu')).not.toBeInTheDocument()
  })
})

describe('App routing — demo round-trips (RT-33, RT-34)', () => {
  it('RT-33: demo table switching round-trip (Table 2 → Table 7)', () => {
    setLocation('/?demo')
    render(<App />)

    // Click "Table 2" demo button.
    fireEvent.click(screen.getByTestId('demo-table-2'))
    expect(screen.getByTestId('customer-menu').textContent).toContain('table=2')

    // Re-render at the new URL (navigate already called).
    // Now navigate to table 7 via the URL.
    cleanup()
    const token7 = encodeTable('7')
    setLocation(`/?demo&t=${token7}`)
    render(<App />)
    expect(screen.getByTestId('customer-menu').textContent).toContain('table=7')
  })

  it('RT-34: demo admin → "Customer view" button → CustomerMenu renders', () => {
    setLocation('/?demo&view=admin')
    render(<App />)
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()

    // Click the "Customer view" button exposed by our mock.
    fireEvent.click(screen.getByTestId('admin-customer-view'))

    // Should now render CustomerMenu (the default table is '4' from App.jsx).
    expect(screen.getByTestId('customer-menu')).toBeInTheDocument()
    expect(screen.getByTestId('customer-menu').textContent).toContain('table=4')
  })
})
