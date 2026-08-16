import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend } from './backend'

/**
 * What the kitchen has run out of.
 *
 * Shared through the same backend as orders, so the moment the kitchen marks
 * paneer off, every phone in the room stops offering it. Held as a set of item
 * ids — absence means available, which keeps the common case free.
 */

const AvailabilityContext = createContext(null)

export function AvailabilityProvider({ children }) {
  const [unavailable, setUnavailable] = useState(() => new Set())
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const ids = await backend.listUnavailable()
      if (mounted.current) setUnavailable(new Set(ids))
    } catch {
      // A failure here must not take the menu down. Everything stays orderable,
      // which is the same situation the café was in before this feature.
      if (mounted.current) setError('Could not check what is sold out.')
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    const unsubscribe = backend.subscribeAvailability(refresh)
    return () => {
      mounted.current = false
      unsubscribe?.()
    }
  }, [refresh])

  const isSoldOut = useCallback((itemId) => unavailable.has(itemId), [unavailable])

  const toggle = useCallback(
    async (itemId) => {
      const next = !unavailable.has(itemId)
      // Optimistic: a cook tapping this during a rush needs it to answer now.
      setUnavailable((current) => {
        const copy = new Set(current)
        if (next) copy.add(itemId)
        else copy.delete(itemId)
        return copy
      })
      try {
        await backend.setUnavailable(itemId, next)
        setError(null)
      } catch {
        setError('That did not save. Check the connection.')
        refresh()
      }
    },
    [unavailable, refresh],
  )

  const restoreAll = useCallback(async () => {
    setUnavailable(new Set())
    try {
      await backend.clearUnavailable()
    } catch {
      refresh()
    }
  }, [refresh])

  const value = useMemo(
    () => ({ unavailable, isSoldOut, toggle, restoreAll, count: unavailable.size, error }),
    [unavailable, isSoldOut, toggle, restoreAll, error],
  )

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>
}

export function useAvailability() {
  const context = useContext(AvailabilityContext)
  if (!context) throw new Error('useAvailability must be used inside <AvailabilityProvider>')
  return context
}
