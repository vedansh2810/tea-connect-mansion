import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { CrownRule } from '../ornament/Ornaments'
import { backend, isCloudConfigured } from '../../store/backend'

/* ── Admin session expiry: 24 hours ──────────────────────────────────────── */

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const SESSION_TS_KEY = 'tcm.admin.session_start'

/** Returns true if the stored admin session timestamp is older than 24 hours. */
function isSessionExpired() {
  const ts = localStorage.getItem(SESSION_TS_KEY)
  if (!ts) return false // no timestamp recorded yet
  return Date.now() - Number(ts) >= SESSION_TTL_MS
}

/** Record the current time as the admin session start. */
function stampSession() {
  localStorage.setItem(SESSION_TS_KEY, String(Date.now()))
}

/** Clear the stored session timestamp. */
function clearSessionStamp() {
  localStorage.removeItem(SESSION_TS_KEY)
}

/**
 * Gate on the kitchen pass.
 *
 * Cloud mode — Supabase Auth (email + password). The Supabase client upgrades
 * from the public anon role to the authenticated role, which unlocks the
 * production RLS policies: update/delete orders, manage the menu, toggle
 * sold-out items, acknowledge waiter calls.
 *
 * Local mode — client-side PIN (VITE_PASS_PIN). This is the old behaviour.
 * The PIN ships in the bundle and stops a curious customer, not a determined
 * attacker. Fine for a single-tablet setup.
 *
 * The pass exports a `usePassAuth` hook so any component inside PassGate can
 * access the current user and the signOut function.
 */

/* ── Shared auth context ─────────────────────────────────────────────────── */

const PassAuthContext = createContext({ user: null, signOut: () => {} })

export function usePassAuth() {
  return useContext(PassAuthContext)
}

export function isPassProtected() {
  return isCloudConfigured || Boolean(import.meta.env.VITE_PASS_PIN)
}

/* ── Cloud gate (Supabase Auth) ──────────────────────────────────────────── */

function CloudGate({ children }) {
  // undefined → loading, null → not signed in, object → signed in
  const [user, setUser] = useState(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  /* ── Rate limiting: 5 failures → 60 s lockout ───────────────────────── */

  const MAX_FAILURES = 5
  const LOCKOUT_SECONDS = 60

  const failures = useRef(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [lockCountdown, setLockCountdown] = useState(0)

  // Tick the countdown every second while locked out.
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setLockCountdown(0)
        setError(null)
      } else {
        setLockCountdown(remaining)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  useEffect(() => {
    backend.getUser().then((u) => {
      if (u && isSessionExpired()) {
        // Session older than 24 hours — force re-login.
        backend.signOut().catch(() => {})
        clearSessionStamp()
        backend.logSecurity('session_expired', { email: u.email })
        setUser(null)
      } else {
        // If signed in but no stamp exists (e.g. first deploy), stamp now.
        if (u) stampSession()
        setUser(u ?? null)
      }
    }).catch(() => setUser(null))
    const unsubscribe = backend.onAuthStateChange((u) => {
      if (u && isSessionExpired()) {
        backend.signOut().catch(() => {})
        clearSessionStamp()
        setUser(null)
      } else {
        setUser(u ?? null)
      }
    })
    return unsubscribe
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await backend.signOut()
      backend.logSecurity('sign_out', { email: user?.email })
      clearSessionStamp()
      setUser(null)
    } catch {
      clearSessionStamp()
      setUser(null)
    }
  }, [user])

  /* ── Periodic 24-hour expiry check (every 60 s while signed in) ──────── */

  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      if (isSessionExpired()) {
        backend.signOut().catch(() => {})
        clearSessionStamp()
        backend.logSecurity('session_expired', { email: user.email })
        setUser(null)
      }
    }, 60 * 1000) // check every minute
    return () => clearInterval(id)
  }, [user])

  /* ── Loading ──────────────────────────────────────────────────────────── */

  if (user === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ink-rail">
        <p className="font-mono text-[10px] tracking-[0.2em] text-brass-light/70 uppercase">
          Checking session…
        </p>
      </main>
    )
  }

  /* ── Authenticated ────────────────────────────────────────────────────── */

  if (user) {
    return (
      <PassAuthContext.Provider value={{ user, signOut: handleSignOut }}>
        {children}
      </PassAuthContext.Provider>
    )
  }

  /* ── Login form ───────────────────────────────────────────────────────── */

  async function submit(event) {
    event.preventDefault()

    // Enforce lockout
    if (lockedUntil && Date.now() < lockedUntil) return

    setSubmitting(true)
    setError(null)
    try {
      await backend.signIn(email.trim(), password)
      failures.current = 0
      stampSession()
      backend.logSecurity('sign_in_success', { email: email.trim() })
    } catch (cause) {
      failures.current += 1

      const msg = cause?.message ?? ''
      if (/invalid.*credentials|invalid.*password|user not found/i.test(msg)) {
        setError('Wrong email or password.')
      } else if (/email.*required|password.*required/i.test(msg)) {
        setError('Enter both email and password.')
      } else if (/fetch|network/i.test(msg)) {
        setError('Cannot reach the server. Check the connection.')
      } else {
        setError('Sign-in failed. Try again.')
      }

      backend.logSecurity('sign_in_failure', {
        email: email.trim(),
        reason: msg,
        attempt: failures.current,
      })

      // Lock out after too many consecutive failures
      if (failures.current >= MAX_FAILURES) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000
        setLockedUntil(until)
        setError(`Too many failed attempts. Try again in ${LOCKOUT_SECONDS} seconds.`)
        backend.logSecurity('rate_limited', {
          email: email.trim(),
          attempts: failures.current,
          lockoutSeconds: LOCKOUT_SECONDS,
        })
        failures.current = 0
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-rail px-6 py-16">
      <div className="w-full max-w-xs text-center">
        <h1 className="font-display text-base font-medium tracking-[0.18em] text-parchment uppercase">
          Tea Connect Mansion
        </h1>
        <p className="mt-1 font-mono text-[9.5px] tracking-[0.26em] text-brass-light/80 uppercase">
          The pass
        </p>
        <div className="mx-auto mt-4 w-24">
          <CrownRule dark className="anim-draw" />
        </div>

        <Lock className="mx-auto mt-9 size-7 text-brass-light/70" strokeWidth={1.4} aria-hidden="true" />
        <h2 className="mt-5 font-display text-lg tracking-[0.06em] text-parchment">Staff sign in</h2>
        <p className="mx-auto mt-2 max-w-[15rem] font-body text-sm leading-relaxed text-parchment/60">
          Sign in to see and manage incoming orders.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <label htmlFor="pass-email" className="sr-only">Email</label>
          <input
            id="pass-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            placeholder="Email"
            autoComplete="email"
            autoFocus
            className="w-full border border-brass/45 bg-ink-deep px-3 py-3 text-center font-mono text-sm tracking-[0.06em] text-parchment placeholder:text-parchment/30 focus:border-brass focus:outline-none"
          />

          <label htmlFor="pass-password" className="sr-only">Password</label>
          <input
            id="pass-password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full border border-brass/45 bg-ink-deep px-3 py-3 text-center font-mono text-sm tracking-[0.06em] text-parchment placeholder:text-parchment/30 focus:border-brass focus:outline-none"
          />

          {error && (
            <p role="alert" className="font-mono text-[10px] tracking-[0.14em] text-oxblood uppercase">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !!lockedUntil}
            className="w-full bg-brass px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-ink-deep uppercase transition-colors hover:bg-brass-light disabled:opacity-50"
          >
            {lockedUntil
              ? `Locked — ${lockCountdown}s`
              : submitting
                ? 'Signing in…'
                : 'Open the pass'}
          </button>
        </form>
      </div>
    </main>
  )
}

/* ── PIN gate (local mode fallback) ──────────────────────────────────────── */

const PIN = import.meta.env.VITE_PASS_PIN
const REMEMBER_KEY = 'tcm.pass.unlocked'

function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    if (!PIN) return true
    // If 24-hour session has expired, clear the remembered PIN.
    if (isSessionExpired()) {
      localStorage.removeItem(REMEMBER_KEY)
      clearSessionStamp()
      return false
    }
    const remembered = localStorage.getItem(REMEMBER_KEY) === PIN
    // If remembered but no timestamp exists, stamp now (first deploy).
    if (remembered && !localStorage.getItem(SESSION_TS_KEY)) stampSession()
    return remembered
  })
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  /* ── Periodic 24-hour expiry check (every 60 s while unlocked) ──────── */

  useEffect(() => {
    if (!unlocked || !PIN) return
    const id = setInterval(() => {
      if (isSessionExpired()) {
        localStorage.removeItem(REMEMBER_KEY)
        clearSessionStamp()
        setUnlocked(false)
      }
    }, 60 * 1000)
    return () => clearInterval(id)
  }, [unlocked])

  if (unlocked) return children

  function submit(event) {
    event.preventDefault()
    if (entry.trim() === PIN) {
      localStorage.setItem(REMEMBER_KEY, PIN)
      stampSession()
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
          Tea Connect Mansion
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

/* ── Exports ─────────────────────────────────────────────────────────────── */

export default function PassGate({ children }) {
  if (isCloudConfigured) return <CloudGate>{children}</CloudGate>
  return <PinGate>{children}</PinGate>
}
