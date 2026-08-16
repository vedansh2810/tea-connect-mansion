import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Printer, X } from 'lucide-react'
import { tableUrl } from '../../lib/useRoute'

/**
 * The codes that go on the tables. Each one encodes this app's URL with the
 * table already set, which is the whole mechanism the customer side relies on.
 *
 * Printing is the point of this panel, so the print stylesheet drops the
 * chrome and lays the cards out on plain paper.
 */

function QrCard({ table }) {
  const canvasRef = useRef(null)
  const url = tableUrl(table)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 176,
      margin: 1,
      color: { dark: '#33291fff', light: '#fdfbf4ff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {
      /* A failed draw leaves the URL below, which still works. */
    })
  }, [url])

  return (
    <figure className="border border-brass/40 bg-ivory px-4 py-4 text-center break-inside-avoid">
      <figcaption>
        <p className="font-mono text-[9px] tracking-[0.26em] text-brass-dim uppercase">
          Tea Content Mansion
        </p>
        <p className="mt-1 font-display text-lg font-semibold tracking-[0.1em] text-ink uppercase">
          Table {table}
        </p>
      </figcaption>
      <canvas ref={canvasRef} className="mx-auto mt-2.5" aria-label={`QR code for table ${table}`} />
      <p className="mt-2 font-mono text-[9px] tracking-[0.14em] text-ink-soft uppercase">
        Scan to see the menu & order
      </p>
      <p className="mt-1 font-mono text-[8px] break-all text-ink-soft/70 print:block">{url}</p>
    </figure>
  )
}

export default function TableCodes({ open, onClose }) {
  const [tableCount, setTableCount] = useState(12)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const tables = Array.from({ length: tableCount }, (_, index) => index + 1)

  async function copy(table) {
    try {
      await navigator.clipboard.writeText(tableUrl(table))
      setCopied(table)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-deep/70 p-4 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Table QR codes"
    >
      <div className="mx-auto max-w-3xl bg-parchment p-5 print:max-w-none print:p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="font-display text-lg font-medium tracking-[0.12em] text-ink uppercase">
              Table codes
            </h2>
            <p className="mt-1 font-body text-xs text-ink-soft">
              Print these and put one on each table. Each code opens the menu with that table set.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase">
              Tables
              <input
                type="number"
                min="1"
                max="60"
                value={tableCount}
                onChange={(event) =>
                  setTableCount(Math.min(60, Math.max(1, Number(event.target.value) || 1)))
                }
                className="w-16 border border-brass/40 bg-ivory px-2 py-1 font-mono text-sm text-ink focus:border-brass focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-parchment uppercase hover:bg-oxblood"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close table codes"
              className="grid size-9 place-items-center border border-brass/40 text-ink hover:bg-brass/10"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3">
          {tables.map((table) => (
            <div key={table}>
              <QrCard table={table} />
              <button
                type="button"
                onClick={() => copy(table)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 py-1 font-mono text-[9px] tracking-[0.14em] text-ink-soft uppercase transition-colors hover:text-ink print:hidden"
              >
                {copied === table ? (
                  <>
                    <Check className="size-3" aria-hidden="true" /> Link copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" aria-hidden="true" /> Copy link
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
