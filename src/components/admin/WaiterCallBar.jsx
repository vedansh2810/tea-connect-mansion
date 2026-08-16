import { useEffect, useState } from 'react'
import { Check, HandMetal, X } from 'lucide-react'
import { elapsed } from '../../lib/format'

/**
 * WaiterCallBar
 *
 * A notification strip pinned to the top of the admin pass whenever
 * a dining room table summons assistance.
 *
 * Design choices:
 * - Returns null when no calls exist, leaving the pass unencumbered.
 * - Stacks multiple calls vertically so no table request is obscured.
 * - Uses a pulsing brass indicator dot to catch the eye in a busy kitchen/floor.
 * - Monospace, tabular figures for immediate legibility across distances.
 * - Dark theme palette: bg-ink-deep, text-parchment, border-brass, and bg-brass/20.
 * - "On my way" acknowledges the call; "✕" dismisses it.
 *
 * @param {Object} props
 * @param {Array<{ id: string|number, table: string|number, status: string, createdAt: string }>} props.calls - Array of active waiter calls
 * @param {(callId: string|number) => void} props.onAcknowledge - Handler when staff acknowledges a call
 * @param {(callId: string|number) => void} props.onDismiss - Handler when staff dismisses a call
 */
export function WaiterCallBar({ calls = [], onAcknowledge, onDismiss }) {
  const [now, setNow] = useState(() => Date.now())

  // Keep the elapsed timestamps fresh every 10 seconds while there are active calls
  useEffect(() => {
    if (!calls || calls.length === 0) return
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [calls])

  if (!calls || calls.length === 0) {
    return null
  }

  return (
    <aside
      aria-label="Waiter calls"
      className="sticky top-0 z-20 w-full border-b border-brass bg-ink-deep/95 shadow-md backdrop-blur"
    >
      <div className="flex flex-col divide-y divide-brass/30">
        {calls.map((call) => (
          <div
            key={call.id}
            role="alert"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l-4 border-l-brass bg-brass/20 px-4 py-2.5 sm:px-6"
          >
            {/* Call details */}
            <div className="flex min-w-0 items-center gap-3">
              {/* Pulsing indicator beacon */}
              <span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brass-light opacity-75 duration-1000" />
                <span className="relative inline-flex size-2 rounded-full bg-brass-light shadow-[0_0_8px_var(--color-brass-light)]" />
              </span>

              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.14em] text-parchment uppercase sm:text-xs">
                  <HandMetal className="size-3.5 text-brass-light" aria-hidden="true" />
                  Table <span className="font-bold text-brass-light">{call.table}</span> is calling for a waiter
                </span>

                <span className="font-mono text-[10px] tracking-[0.12em] text-parchment/65 tabular">
                  · {elapsed(call.createdAt, now)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAcknowledge?.(call.id)}
                className="flex items-center gap-1.5 border border-brass bg-brass px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-ink-deep uppercase transition-colors hover:border-brass-light hover:bg-brass-light focus-visible:outline-parchment"
              >
                <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                On my way
              </button>

              <button
                type="button"
                onClick={() => onDismiss?.(call.id)}
                aria-label={`Dismiss call from Table ${call.table}`}
                title="Dismiss call"
                className="grid size-7 place-items-center border border-parchment/20 text-parchment/70 transition-colors hover:border-oxblood hover:bg-oxblood/20 hover:text-parchment focus-visible:outline-parchment"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default WaiterCallBar
