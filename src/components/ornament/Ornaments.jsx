/**
 * The house ornament set, redrawn from the printed menu: a brass hairline
 * tipped with a small crown, the double-rule frame with corner flourishes,
 * the chef's-hat mark, and the veg square.
 *
 * These are the only decorative elements in the app, and they all come from
 * the card the customer already holds.
 */

/**
 * Section header rule with the crown finial, as on every printed page.
 *
 * Composed rather than drawn as one stretched SVG: the hairlines flex to fill
 * the width while the crown keeps its proportions at any container size.
 */
export function CrownRule({ className = '', dark = false }) {
  const line = dark
    ? 'from-transparent via-brass-light/70 to-transparent'
    : 'from-transparent via-brass/70 to-transparent'
  return (
    <div aria-hidden="true" className={`flex items-end gap-1.5 ${className}`}>
      <span className={`h-px flex-1 bg-gradient-to-r ${line}`} />
      <svg
        viewBox="0 0 22 11"
        className={`h-[9px] w-[18px] shrink-0 ${dark ? 'text-brass-light' : 'text-brass'}`}
      >
        {/* three points on a band — the finial from the printed rules */}
        <path
          d="M1 10.2 L3.4 3.6 L6.6 8 L11 1.4 L15.4 8 L18.6 3.6 L21 10.2 Z"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <circle cx="11" cy="1" r="1" fill="currentColor" />
      </svg>
      <span className={`h-px flex-1 bg-gradient-to-r ${line}`} />
    </div>
  )
}

/** Three brass dots — the printed card's separator either side of a heading. */
export function DotTriad({ className = '' }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-[3px] ${className}`}>
      <i className="block size-[3px] rounded-full bg-brass/70" />
      <i className="block size-[3px] rounded-full bg-brass/70" />
      <i className="block size-[3px] rounded-full bg-brass/70" />
    </span>
  )
}

/** Double-rule frame with corner flourishes. Reserved for the page head and the chit. */
export function OrnateFrame({ className = '', inset = 6, dark = false }) {
  const stroke = dark ? 'var(--color-brass-light)' : 'var(--color-oxblood)'
  const accent = dark ? 'var(--color-brass-light)' : 'var(--color-brass)'
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 400 300"
    >
      <rect
        x={inset}
        y={inset}
        width={400 - inset * 2}
        height={300 - inset * 2}
        fill="none"
        stroke={stroke}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={inset + 4}
        y={inset + 4}
        width={400 - (inset + 4) * 2}
        height={300 - (inset + 4) * 2}
        fill="none"
        stroke={accent}
        strokeOpacity="0.45"
        strokeWidth="0.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Chef's-hat mark, carried over from the printed card's specials. Drawn as
 * filled shapes rather than thin strokes so it still reads at 14px.
 */
export function ChefMark({ className = '', title = "Chef's special" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      className={`size-3.5 ${className}`}
    >
      {/* three puffs of the toque */}
      <circle cx="5" cy="5.4" r="2.9" fill="currentColor" />
      <circle cx="11" cy="5.4" r="2.9" fill="currentColor" />
      <circle cx="8" cy="4.1" r="3.3" fill="currentColor" />
      {/* the band */}
      <rect x="4.3" y="8.2" width="7.4" height="4.6" rx="0.6" fill="currentColor" />
      <rect x="4.3" y="9.9" width="7.4" height="0.9" fill="var(--color-parchment)" fillOpacity="0.85" />
    </svg>
  )
}

/** The veg mark every Indian menu carries. This kitchen is entirely vegetarian. */
export function VegMark({ className = '' }) {
  return (
    <span
      role="img"
      aria-label="Vegetarian"
      className={`inline-flex size-3 shrink-0 items-center justify-center border border-veg ${className}`}
    >
      <i className="block size-1.5 rounded-full bg-veg" />
    </span>
  )
}

/** A steaming cup — used once, on the empty cart. Drawn, not animated. */
export function TeaCup({ className = '' }) {
  return (
    <svg viewBox="0 0 48 44" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M20 4c-2 2.4-2 4 0 6.4s2 4-.2 6.4" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M27 6c-1.6 2-1.6 3.4 0 5.4s1.6 3.4-.2 5.4" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M9 21h27v6a10 10 0 0 1-10 10h-7A10 10 0 0 1 9 27z" strokeWidth="1.4" />
        <path d="M36 23.5h3.5a4 4 0 0 1 0 8H35" strokeWidth="1.4" />
        <path d="M6 40h33" strokeWidth="1.4" strokeOpacity="0.5" />
      </g>
    </svg>
  )
}
