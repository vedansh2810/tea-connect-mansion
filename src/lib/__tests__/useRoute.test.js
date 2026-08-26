/**
 * useRoute.test.js — Tests for the useRoute hook and parse() logic
 *
 * Covers test-case IDs:
 *   RT-06‥10  Navigate round-trips, admin paths, popstate, tableUrl
 *   RT-11‥14  Missing parameter → TableGate
 *   RT-28,31  Demo mode (via ?demo and DEV)
 *   RT-37‥39  Legacy param cleanup, navigate(null), trailing slashes
 *
 * We test the hook via renderHook from @testing-library/react and
 * manipulate window.location / history directly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRoute, tableUrl } from '../useRoute'
import { encodeTable, decodeTable } from '../tableToken'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Set window.location to a given path + query without triggering navigation.
 * jsdom allows us to assign location properties directly.
 */
function setLocation(pathAndQuery) {
  const url = new URL(pathAndQuery, 'http://localhost')
  // jsdom does not support assigning window.location.href directly in all
  // versions, so we use history.replaceState to change the URL silently.
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

/** Keep track of the original location so we can restore between tests. */
let originalHref

beforeEach(() => {
  originalHref = window.location.href
})

afterEach(() => {
  // Restore original URL to avoid test bleed.
  window.history.replaceState({}, '', originalHref)
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  1 · Valid routing — navigate round-trips                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('useRoute — navigation round-trips', () => {
  it('RT-06: navigate({ table }) encodes token and re-parses correctly', () => {
    setLocation('/')
    const { result } = renderHook(() => useRoute())

    act(() => {
      result.current.navigate({ view: 'menu', table: '11' })
    })

    expect(result.current.table).toBe('11')
    expect(result.current.view).toBe('menu')

    // The URL should now contain a ?t= param.
    const url = new URL(window.location.href)
    expect(url.searchParams.has('t')).toBe(true)

    // And that token should decode back to '11'.
    expect(decodeTable(url.searchParams.get('t'))).toBe('11')
  })

  it('RT-07: /admin pathname → view is "admin"', () => {
    setLocation('/admin')
    const { result } = renderHook(() => useRoute())
    expect(result.current.view).toBe('admin')
  })

  it('RT-08: ?view=admin query param → view is "admin"', () => {
    setLocation('/?view=admin')
    const { result } = renderHook(() => useRoute())
    expect(result.current.view).toBe('admin')
  })

  it('RT-09: popstate event re-parses route', () => {
    const token4 = encodeTable('4')
    setLocation(`/?t=${token4}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('4')

    // Navigate to table 7 via the hook.
    act(() => {
      result.current.navigate({ view: 'menu', table: '7' })
    })
    expect(result.current.table).toBe('7')

    // jsdom's history.back() doesn't synchronously restore the URL,
    // so we simulate what the browser does: restore the old URL and
    // fire popstate.
    act(() => {
      window.history.replaceState({}, '', `/?t=${token4}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.table).toBe('4')
  })

  it('RT-10: tableUrl() generates a scannable customer URL', () => {
    setLocation('/admin')
    const url = tableUrl(4)
    const parsed = new URL(url)

    // Should not carry admin view.
    expect(parsed.searchParams.has('view')).toBe(false)
    expect(parsed.hash).toBe('')

    // Token should decode to '4'.
    const token = parsed.searchParams.get('t')
    expect(token).toBeTruthy()
    expect(decodeTable(token)).toBe('4')
  })

  it('RT-01: loading /?t=<valid-token> resolves numeric table', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('4')
    expect(result.current.view).toBe('menu')
  })

  it('RT-02: loading /?t=<valid-token> resolves alphanumeric table (VIP-1)', () => {
    const token = encodeTable('VIP-1')
    setLocation(`/?t=${token}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('VIP-1')
    expect(result.current.view).toBe('menu')
  })

  it('RT-05: combined table token + ?view=admin → admin view with table', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}&view=admin`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.view).toBe('admin')
    expect(result.current.table).toBe('4')
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  2 · Missing parameter → table is null                                     */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('useRoute — missing parameter', () => {
  it('RT-11: root URL "/" with no params → table is null', () => {
    setLocation('/')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
    expect(result.current.view).toBe('menu')
  })

  it('RT-12: empty ?t= param → table is null', () => {
    setLocation('/?t=')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
  })

  it('RT-13: only ?view=admin, no table → table is null, view is admin', () => {
    setLocation('/?view=admin')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
    expect(result.current.view).toBe('admin')
  })

  it('RT-14: unrelated params only (?foo=bar) → table is null', () => {
    setLocation('/?foo=bar')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
  })

  it('RT-12b: tampered token in URL → table is null', () => {
    setLocation('/?t=dGVzdC50ZXN0') // base64url of "test.test"
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
  })

  it('RT-11: legacy ?table=4 param (no ?t) → table is null', () => {
    setLocation('/?table=4')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
  })

  it('RT-13: navigate({ table: undefined }) clears token ("table" key present)', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('4')

    // 'table' in next is true (key exists), so t param should be deleted.
    act(() => {
      result.current.navigate({ table: undefined })
    })

    const url = new URL(window.location.href)
    expect(url.searchParams.has('t')).toBe(false)
    expect(result.current.table).toBeNull()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  3 · Demo mode                                                             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('useRoute — demo mode', () => {
  it('RT-28: ?demo flag → demo is true', () => {
    setLocation('/?demo')
    const { result } = renderHook(() => useRoute())
    expect(result.current.demo).toBe(true)
    expect(result.current.table).toBeNull()
  })

  it('RT-31: DEV mode → demo is true (Vitest runs with DEV=true)', () => {
    // import.meta.env.DEV is true in vitest by default.
    setLocation('/')
    const { result } = renderHook(() => useRoute())
    expect(result.current.demo).toBe(true)
  })

  it('RT-32: ?demo combined with valid ?t= → both parsed', () => {
    const token = encodeTable('7')
    setLocation(`/?demo&t=${token}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('7')
    expect(result.current.demo).toBe(true)
  })

  it('RT-33: ?demo with ?view=admin → admin + demo', () => {
    setLocation('/?demo&view=admin')
    const { result } = renderHook(() => useRoute())
    expect(result.current.view).toBe('admin')
    expect(result.current.demo).toBe(true)
  })

  it('RT-36: ?demo with tampered token → table null, demo true', () => {
    setLocation('/?demo&t=dGVzdC50ZXN0')
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBeNull()
    expect(result.current.demo).toBe(true)
  })

  it('RT-32b: ?demo=false (truthy presence) → demo is still true', () => {
    // URLSearchParams.has('demo') checks key existence, not value.
    setLocation('/?demo=false')
    const { result } = renderHook(() => useRoute())
    expect(result.current.demo).toBe(true)
  })

  it('RT-33: demo mode table switching round-trip', () => {
    setLocation('/?demo')
    const { result } = renderHook(() => useRoute())

    // Switch to table 2.
    act(() => {
      result.current.navigate({ view: 'menu', table: '2' })
    })
    expect(result.current.table).toBe('2')
    expect(result.current.demo).toBe(true)

    // Switch to table 7.
    act(() => {
      result.current.navigate({ view: 'menu', table: '7' })
    })
    expect(result.current.table).toBe('7')

    // Token in URL should decode to '7'.
    const url = new URL(window.location.href)
    expect(decodeTable(url.searchParams.get('t'))).toBe('7')
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  4 · Regression / integration edge cases                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('useRoute — regression edge cases', () => {
  it('RT-37: legacy ?table=5 param is deleted on navigate()', () => {
    setLocation('/?table=5')
    const { result } = renderHook(() => useRoute())

    act(() => {
      result.current.navigate({ view: 'menu', table: '7' })
    })

    const url = new URL(window.location.href)
    expect(url.searchParams.has('table')).toBe(false) // legacy param removed
    expect(url.searchParams.has('t')).toBe(true)      // signed token present
  })

  it('RT-38: navigate({ table: null }) clears token from URL', () => {
    const token = encodeTable('4')
    setLocation(`/?t=${token}`)
    const { result } = renderHook(() => useRoute())
    expect(result.current.table).toBe('4')

    act(() => {
      result.current.navigate({ view: 'menu', table: null })
    })

    const url = new URL(window.location.href)
    expect(url.searchParams.has('t')).toBe(false)
    expect(result.current.table).toBeNull()
  })

  it('RT-39: trailing slashes in /admin/// path still resolve to admin', () => {
    setLocation('/admin///')
    const { result } = renderHook(() => useRoute())
    expect(result.current.view).toBe('admin')
  })
})
