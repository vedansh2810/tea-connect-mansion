import { useCallback, useEffect, useState } from 'react'
import { encodeTable, decodeTable } from './tableToken'

/**
 * Two screens, one query string. Kept deliberately small — a router library
 * would outweigh what this app needs.
 *
 *   /menu?t=<token>   the customer's menu (table encoded in a signed token)
 *   /admin            the kitchen pass, or /?view=admin
 *
 * The `t` parameter carries a signed token so customers cannot guess other
 * tables by changing a number in the URL. See `tableToken.js`.
 */

function parse() {
  const url = new URL(window.location.href)
  const params = url.searchParams
  const path = url.pathname.replace(/\/+$/, '')

  const view = path.endsWith('/admin') || params.get('view') === 'admin' ? 'admin' : 'menu'

  // Decode the signed token. Falls back to null (→ TableGate) if invalid.
  const token = params.get('t')
  const table = decodeTable(token)

  return { view, table, demo: params.has('demo') || import.meta.env.DEV }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)

  useEffect(() => {
    const update = () => setRoute(parse())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const navigate = useCallback((next) => {
    const url = new URL(window.location.href)
    // Keep the app at its mount path so it works from a subdirectory too.
    url.pathname = url.pathname.replace(/\/admin\/?$/, '/')

    if (next.view === 'admin') url.searchParams.set('view', 'admin')
    else url.searchParams.delete('view')

    // Clean up legacy `table` param if present.
    url.searchParams.delete('table')

    if (next.table) url.searchParams.set('t', encodeTable(next.table))
    else if ('table' in next) url.searchParams.delete('t')

    window.history.pushState({}, '', url)
    setRoute(parse())
  }, [])

  return { ...route, navigate }
}

/** The URL a table's QR code should encode. */
export function tableUrl(table) {
  const url = new URL(window.location.href)
  url.pathname = url.pathname.replace(/\/admin\/?$/, '/')
  url.search = ''
  url.hash = ''
  url.searchParams.set('t', encodeTable(String(table)))
  return url.toString()
}
