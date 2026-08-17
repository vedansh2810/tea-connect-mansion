import { Check } from 'lucide-react'
import { CrownRule, DotTriad, OrnateFrame } from '../ornament/Ornaments'
import { RESTAURANT } from '../../data/menu'

const REASON_MESSAGES = {
  cleared: 'Your bill has been settled. We hope you enjoyed your meal at Tea Connect Mansion.',
  timeout: 'Your session has expired due to inactivity. Scan the QR code on your table to start a new session.',
}

/**
 * Shown when a customer session has concluded, either because the table bill
 * was settled by staff or due to an idle timeout.
 */
export default function SessionEnded({ reason = 'cleared', onRescan }) {
  const message =
    REASON_MESSAGES[reason] ??
    'Your bill has been settled. We hope you enjoyed your meal at Tea Connect Mansion.'

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-14">
      <div className="relative w-full max-w-sm px-7 py-11 text-center">
        <OrnateFrame />

        <span className="mx-auto grid size-12 place-items-center rounded-full border border-brass/50 bg-brass/10">
          <Check className="size-6 text-brass-dim" strokeWidth={2} aria-hidden="true" />
        </span>

        <h1 className="mt-5 font-display text-[1.65rem] leading-[1.15] font-medium tracking-[0.13em] text-ink uppercase letterpress">
          Thank you for visiting
        </h1>

        <div className="mx-auto mt-4 w-40">
          <CrownRule className="anim-draw" />
        </div>

        <p className="mx-auto mt-5 max-w-[17rem] font-body text-sm leading-relaxed text-ink-soft">
          {message}
        </p>

        <div className="mt-7 flex items-center gap-3">
          <span className="rule-brass flex-1" />
          <DotTriad />
          <span className="rule-brass flex-1" />
        </div>

        <button
          type="button"
          onClick={onRescan}
          className="mt-7 w-full bg-ink px-4 py-3 font-mono text-[11px] tracking-[0.18em] text-parchment uppercase transition-colors hover:bg-oxblood"
        >
          Scan QR to start a new session
        </button>

        <p className="mt-4 font-body text-xs text-ink-soft">
          If you need anything, call a waiter at the counter.
        </p>

        <div className="mt-8 border-t border-brass/25 pt-5">
          <p className="font-mono text-[10px] tracking-[0.3em] text-brass-dim uppercase">
            {RESTAURANT.name} · {RESTAURANT.hours}
          </p>
        </div>
      </div>
    </main>
  )
}
