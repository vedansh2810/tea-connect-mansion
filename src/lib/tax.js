/**
 * GST on the bill.
 *
 * The rate is configuration, not a constant, because it is the café's tax
 * position and not mine to assume: set VITE_GST_PERCENT to the rate their
 * accountant confirms. Indian restaurant service is commonly 5% without input
 * tax credit, but "commonly" is not good enough to compile into someone's
 * billing, so with nothing configured the app behaves exactly as the printed
 * card does and says "GST extra, as applicable".
 *
 * This is still not a tax invoice. The till issues that, and a real invoice
 * splits the rate into CGST and SGST. What this does is stop the customer being
 * surprised at the counter by a number they were never shown.
 */

const RAW = Number(import.meta.env.VITE_GST_PERCENT)
const PERCENT = Number.isFinite(RAW) && RAW > 0 && RAW < 100 ? RAW : 0

/** True when a rate is configured, so the bill can show a computed total. */
export const showsTax = PERCENT > 0

export const taxPercent = PERCENT

/** Rounded to whole rupees, matching how the menu is priced. */
export function taxOn(subtotal) {
  if (!showsTax) return { percent: 0, amount: 0, total: subtotal }
  const amount = Math.round((subtotal * PERCENT) / 100)
  return { percent: PERCENT, amount, total: subtotal + amount }
}

/** "GST @ 5%" — the label used on both the bill and the ticket. */
export function taxLabel(percent = PERCENT) {
  const shown = Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/\.?0+$/, '')
  return `GST @ ${shown}%`
}
