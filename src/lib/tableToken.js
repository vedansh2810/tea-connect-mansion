/**
 * Signed table tokens.
 *
 * QR codes encode a signed token instead of a plain table number, so changing
 * `?t=xK9mP2…` in the address bar does not let someone jump to another table.
 *
 * The token is: base64url( table + "." + keyedHash(table) )
 *
 * The keyed hash mixes the table number with a build-time secret. It is NOT a
 * cryptographic HMAC — the secret ships inside the JS bundle, so a determined
 * attacker can extract it from the minified source. What it DOES prevent is a
 * casual customer changing `5` to `6` in the URL bar, which is the real threat
 * at a restaurant.
 */

const SECRET = import.meta.env.VITE_TABLE_SECRET || 'tcm-default-key-change-in-production'

/**
 * Two independent hash functions mixed with the secret.
 * Produces a ~12-char base-36 signature that is not guessable without the key.
 */
function keyedHash(table) {
  const str = SECRET + ':' + String(table) + ':' + SECRET

  // FNV-1a 32-bit
  let h1 = 2166136261
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i)
    h1 = Math.imul(h1, 16777619)
  }

  // djb2
  let h2 = 5381
  for (let i = 0; i < str.length; i++) {
    h2 = ((h2 << 5) + h2) + str.charCodeAt(i)
  }

  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}

/* ── Base64-url helpers ──────────────────────────────────────────────────── */

function toBase64Url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  try {
    return atob(s)
  } catch {
    return null
  }
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/** Encode a plain table number into a signed, URL-safe token. */
export function encodeTable(table) {
  const sig = keyedHash(String(table))
  return toBase64Url(`${table}.${sig}`)
}

/**
 * Decode a signed token back to a plain table number.
 * Returns `null` if the token is missing, malformed, or the signature is wrong.
 */
export function decodeTable(token) {
  if (!token) return null
  const decoded = fromBase64Url(token)
  if (!decoded) return null

  const dot = decoded.lastIndexOf('.')
  if (dot < 1) return null

  const table = decoded.substring(0, dot)
  const sig = decoded.substring(dot + 1)

  if (keyedHash(table) !== sig) return null

  // Sanity-check the table value itself.
  if (!/^[A-Za-z0-9-]{1,6}$/.test(table)) return null

  return table
}
