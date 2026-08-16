import { useState } from 'react'
import { Lock } from 'lucide-react'
import { CrownRule } from '../ornament/Ornaments'

/**
 * A PIN on the kitchen pass.
 *
 * Set VITE_PASS_PIN at build time to require it. Staff enter it once per
 * device and the device is remembered, so a kitchen tablet is not asking for a
 * code every morning.
 *
 * Be clear about what this is: the PIN ships inside the JavaScript bundle, so
 * anyone determined can read it out of the source. It stops a curious customer
 * poking at `?view=admin` and closing everybody's bills — it is not real
 * security. For that, put the pass behind host-level access control
 * (Cloudflare Access, or your host's password protection) or wire up proper
 * staff accounts. See DEPLOY.md.
 *
 * With no PIN configured the pass opens, but says so on screen rather than
 * pretending to be protected.
 */

const PIN = import.meta.env.VITE_PASS_PIN
const REMEMBER_KEY = 'tcm.pass.unlocked'

export function isPassProtected() {
  return Boolean(PIN)
}

export default function PassGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => !PIN || localStorage.getItem(REMEMBER_KEY) === PIN,
  )
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  if (unlocked) return children

  function submit(event) {
    event.preventDefault()
    if (entry.trim() === PIN) {
      localStorage.setItem(REMEMBER_KEY, PIN)
      setUnlocked(true)
      return
    }
    setWrong(true)
    setEntry('')
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-rail px-6 py-16">
      <div className="w-full max-w-xs text-center">
        <h1 className="font-display text-base font-medium tracking-[0.18em] text-parchment uppercase">
          Tea Content Mansion
        </h1>
        <p className="mt-1 font-mono text-[9.5px] tracking-[0.26em] text-brass-light/80 uppercase">
          The pass
        </p>
        <div className="mx-auto mt-4 w-24">
          <CrownRule dark className="anim-draw" />
        </div>

        <Lock className="mx-auto mt-9 size-7 text-brass-light/70" strokeWidth={1.4} aria-hidden="true" />
        <h2 className="mt-5 font-display text-lg tracking-[0.06em] text-parchment">Staff only</h2>
        <p className="mx-auto mt-2 max-w-[15rem] font-body text-sm leading-relaxed text-parchment/60">
          Enter the pass code to see incoming orders. This device will be remembered.
        </p>

        <form onSubmit={submit} className="mt-7">
          <label htmlFor="pass-pin" className="sr-only">
            Pass code
          </label>
          <input
            id="pass-pin"
            type="password"
            value={entry}
            onChange={(event) => {
              setEntry(event.target.value)
              setWrong(false)
            }}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-describedby={wrong ? 'pin-error' : undefined}
            className="w-full border border-brass/45 bg-ink-deep px-3 py-3 text-center font-mono text-lg tracking-[0.4em] text-parchment focus:border-brass focus:outline-none"
          />
          {wrong && (
            <p id="pin-error" role="alert" className="mt-2 font-mono text-[10px] tracking-[0.14em] text-oxblood uppercase">
              That code is not right
            </p>
          )}
          <button
            type="submit"
            className="mt-3 w-full bg-brass px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-ink-deep uppercase transition-colors hover:bg-brass-light"
          >
            Open the pass
          </button>
        </form>
      </div>
    </main>
  )
}
