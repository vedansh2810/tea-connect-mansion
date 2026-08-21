import { QrCode, ScanLine } from 'lucide-react'
import { CrownRule, DotTriad, OrnateFrame } from '../ornament/Ornaments'
import { RESTAURANT } from '../../data/menu'

/**
 * Shown when the URL carries no table. The QR code on the table is the only
 * way in — scanning it opens the menu with the table already set.
 */
export default function TableGate({ onTable, demo, onOpenPass }) {
  function handleScan() {
    // On mobile devices, opening a QR scanner is typically done by the camera app.
    // Guide the user to use their phone's native camera or QR scanner.
    // If running in a context where we can trigger a scan, we would do so here.
    // For now, prompt the user to use their device camera.
    if (navigator.clipboard) {
      window.open('intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end', '_blank')
    }
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

        {/* Scan QR Code button */}
        <button
          type="button"
          onClick={handleScan}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 font-mono text-[11px] tracking-[0.16em] text-parchment uppercase transition-colors hover:bg-oxblood"
        >
          <ScanLine className="size-4" aria-hidden="true" />
          Scan QR Code
        </button>

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
