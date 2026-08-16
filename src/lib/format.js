/** ₹1,240 — no decimals, the way the printed menu sets prices. */
export function rupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

/** 7:42 pm */
export function clockTime(iso) {
  return new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

/** "just now", "4 min", "1 h 12 min" — how long the kitchen has held a ticket. */
export function elapsed(iso, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

/** Full line description for a ticket: "Adrak Chai · Pot for 4 · with ice cream" */
export function describeLine(line) {
  return [line.name, line.tierLabel, line.choice, line.addOnLabel && `with ${line.addOnLabel.toLowerCase()}`]
    .filter(Boolean)
    .join(' · ')
}
