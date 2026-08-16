/**
 * The chit.
 *
 * One piece of paper, torn top and bottom, set in monospace. It is the
 * customer's bill while they are ordering and the kitchen's ticket once they
 * have ordered — the same artifact either side of the pass, which is also
 * exactly what the shared store does.
 *
 * Nothing else in the app uses this treatment, so it stays the thing people
 * remember.
 */
export function ChitPaper({ children, className = '', edge = true }) {
  return (
    <div className={`[filter:drop-shadow(0_6px_14px_rgb(36_28_20/0.18))] ${className}`}>
      <div className={`bg-ivory ${edge ? 'chit-paper' : ''}`}>
        {/* Padding clears the scalloped tear so no content sits in a notch. */}
        <div className="px-4 py-5 sm:px-5">{children}</div>
      </div>
    </div>
  )
}

/** The dot-leader line used inside a chit: description ⋯ amount. */
export function ChitLine({ label, sub, amount, qty, children, strong = false }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline gap-1">
        {qty != null && (
          <span className="w-7 shrink-0 font-mono text-[0.72rem] text-brass-dim tabular">
            {qty}×
          </span>
        )}
        <span
          className={`min-w-0 font-mono text-[0.76rem] leading-snug ${
            strong ? 'font-semibold text-ink' : 'text-ink'
          }`}
        >
          {label}
        </span>
        <span className="leader" aria-hidden="true" />
        {amount != null && (
          <span
            className={`shrink-0 font-mono text-[0.76rem] tabular ${
              strong ? 'font-semibold text-ink' : 'text-ink'
            }`}
          >
            {amount}
          </span>
        )}
      </div>
      {sub && (
        <p className="pl-7 font-mono text-[0.66rem] leading-snug text-ink-soft">{sub}</p>
      )}
      {children}
    </div>
  )
}

/** Torn-paper divider used between a chit's zones. */
export function ChitRule({ dashed = true, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`my-2 border-t border-ink/25 ${dashed ? 'border-dashed' : ''} ${className}`}
    />
  )
}
