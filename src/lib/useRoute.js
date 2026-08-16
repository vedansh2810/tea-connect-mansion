import { useCallback, useEffect, useState } from 'react'

/**
 * Two screens, one query string. Kept deliberately small — a router library
 * would outweigh what this app needs.
 *
 *   /menu?table=4   the customer's menu (also the bare "/" with ?table=)
 *   /admin          the kitchen pass, or /?view=admin
 */

function parse() {
  const url = new URL(window.location.href)
  const params = url.searchParams
  const path = url.pathname.replace(/\/+$/, '')

  const view = path.endsWith('/admin') || params.get('view') === 'admin' ? 'admin' : 'menu'
  const rawTable = params.get('table')
  const table = rawTable && /^[A-Za-z0-9-]{1,6}$/.test(rawTable) ? rawTable : null

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

    if (next.table) url.searchParams.set('table', next.table)
    else if ('table' in next) url.searchParams.delete('table')

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
  url.searchParams.set('table', String(table))
  return url.toString()
}
