import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend } from './backend'

/**
 * Waiter calls.
 *
 * A customer taps "Call a Waiter" on their phone. The backend writes a row,
 * the admin pass picks it up via realtime and plays a distinct chime. The
 * cook or server can acknowledge ("On my way") or dismiss it.
 */

const WaiterCallContext = createContext(null)

export function WaiterCallProvider({ children }) {
  const [calls, setCalls] = useState([])
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const rows = await backend.listWaiterCalls()
      if (mounted.current) {
        setCalls(rows)
        setError(null)
      }
    } catch {
      if (mounted.current) setError('Could not load waiter calls.')
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    const unsubscribe = backend.subscribeWaiterCalls(refresh)
    return () => {
      mounted.current = false
      unsubscribe?.()
    }
  }, [refresh])

  const placeCall = useCallback(
    async (table) => {
      try {
        const call = await backend.placeWaiterCall(table)
        setCalls((current) =>
          current.some((c) => c.id === call.id) ? current : [call, ...current],
        )
        return call
      } catch {
        setError('Could not call the waiter. Try again.')
        throw new Error('Call failed')
      }
    },
    [],
  )

  const acknowledge = useCallback(
    async (callId) => {
      setCalls((current) => current.filter((c) => c.id !== callId))
      try {
        await backend.updateWaiterCall(callId, 'acknowledged')
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const dismiss = useCallback(
    async (callId) => {
      setCalls((current) => current.filter((c) => c.id !== callId))
      try {
        await backend.updateWaiterCall(callId, 'dismissed')
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const value = useMemo(
    () => ({ calls, placeCall, acknowledge, dismiss, count: calls.length, error, refresh }),
    [calls, placeCall, acknowledge, dismiss, error, refresh],
  )

  return <WaiterCallContext.Provider value={value}>{children}</WaiterCallContext.Provider>
}

export function useWaiterCalls() {
  const context = useContext(WaiterCallContext)
  if (!context) throw new Error('useWaiterCalls must be used inside <WaiterCallProvider>')
  return context
}
