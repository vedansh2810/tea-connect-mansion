import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { CrownRule, DotTriad, OrnateFrame } from '../ornament/Ornaments'
import { RESTAURANT } from '../../data/menu'

/**
 * Shown when the URL carries no table. The QR code on the table is the way
 * in; the manual field is the fallback for a smudged or missing sticker, not
 * the headline.
 */
export default function TableGate({ onTable, demo, onOpenPass }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const table = value.trim()
    if (!/^[A-Za-z0-9-]{1,6}$/.test(table)) {
      setError('Table numbers are up to 6 letters or digits, like 4 or T12.')
      return
    }
    setError('')
    onTable(table)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-14">
      <div className="relative w-full max-w-sm px-7 py-11 text-center">
        <OrnateFrame />

        <p className="font-mono text-[10px] tracking-[0.3em] text-brass-dim uppercase">
          {RESTAURANT.hours}
        </p>

        <h1 className="mt-4 font-display text-[1.65rem] leading-[1.15] font-medium tracking-[0.13em] text-ink uppercase letterpress">
          Tea Connect
          <br />
          Mansion
        </h1>

        <div className="mx-auto mt-4 w-40">
          <CrownRule className="anim-draw" />
        </div>

        <QrCode
          className="mx-auto mt-7 size-11 text-brass"
          strokeWidth={1.25}
          aria-hidden="true"
        />

        <h2 className="mt-6 font-display text-lg tracking-wide text-ink">Scan the code on your table</h2>
        <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-soft">
          It opens this menu with your table already set, so the kitchen knows where to bring
          everything.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <span className="rule-brass flex-1" />
          <DotTriad />
          <span className="rule-brass flex-1" />
        </div>

        <form onSubmit={submit} className="mt-7 text-left">
          <label
            htmlFor="table"
            className="font-mono text-[10px] tracking-[0.22em] text-ink-soft uppercase"
          >
            No code to scan? Enter your table
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="table"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="4"
              aria-describedby={error ? 'table-error' : undefined}
              className="w-full border border-brass/40 bg-ivory px-3 py-2.5 font-mono text-base text-ink placeholder:text-ink-soft/45 focus:border-brass focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 bg-ink px-4 py-2.5 font-mono text-[11px] tracking-[0.16em] text-parchment uppercase transition-colors hover:bg-oxblood"
            >
              Open menu
            </button>
          </div>
          {error && (
            <p id="table-error" role="alert" className="mt-2 text-xs text-oxblood">
              {error}
            </p>
          )}
        </form>

        {demo && (
          <div className="mt-8 border-t border-brass/25 pt-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
              Demo shortcuts
            </p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-2">
              {['2', '4', '7', '11'].map((table) => (
                <button
                  key={table}
                  type="button"
                  onClick={() => onTable(table)}
                  className="border border-brass/40 px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:bg-brass/10"
                >
                  Table {table}
                </button>
              ))}
              <button
                type="button"
                onClick={onOpenPass}
                className="border border-ink/25 bg-ink px-3 py-1.5 font-mono text-xs text-parchment transition-colors hover:bg-oxblood"
              >
                Kitchen pass
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
