/**
 * tableToken.test.js — Unit tests for encodeTable / decodeTable
 *
 * Covers test-case IDs:
 *   RT-01‥05  Valid tokens (numeric, alphanumeric, hyphenated, boundary lengths)
 *   RT-15‥27  Tamper & spoof checks
 *   RT-40     Default secret fallback
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest'
import { encodeTable, decodeTable } from '../tableToken'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** Base64-url encode a raw string (mirrors toBase64Url in tableToken.js). */
function toBase64Url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Base64-url decode back to a raw string. */
function fromBase64Url(b64) {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

/** Decode a valid token, tamper the payload, and re-encode. */
function tamperToken(validToken, tamperFn) {
  const decoded = fromBase64Url(validToken)
  const tampered = tamperFn(decoded)
  return toBase64Url(tampered)
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  1 · Valid Routing Parameters                                              */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Valid token encode/decode round-trips', () => {
  it.each([
    ['4',      'RT-01: numeric table'],
    ['A1',     'RT-02: alphanumeric table'],
    ['VIP-2',  'RT-03: hyphenated table'],
    ['7',      'RT-04: single-char boundary'],
    ['Ab12-X', 'RT-05: max 6-char boundary'],
    ['11',     'RT-06 prerequisite: two-digit table'],
    ['2',      'demo table 2'],
  ])('encodeTable(%s) → decodeTable() round-trips  (%s)', (table) => {
    const token = encodeTable(table)

    // Token must be a non-empty string.
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')

    // Decoding must return the exact original table.
    expect(decodeTable(token)).toBe(table)
  })

  it('RT-01b: encoded token is valid base64-url (no +, /, =)', () => {
    const token = encodeTable('4')
    expect(token).not.toMatch(/[+/=]/)
  })

  it('RT-01c: encoded payload has the expected table.hash structure', () => {
    const token = encodeTable('4')
    const decoded = fromBase64Url(token)
    expect(decoded).toMatch(/^4\..+$/)
  })

  it('different tables produce different tokens', () => {
    const t4 = encodeTable('4')
    const t5 = encodeTable('5')
    expect(t4).not.toBe(t5)
  })

  it('same table always produces the same token (deterministic)', () => {
    expect(encodeTable('4')).toBe(encodeTable('4'))
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  2 · Missing / empty parameter                                             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Missing or empty tokens', () => {
  it('RT-12a: decodeTable(null) → null', () => {
    expect(decodeTable(null)).toBeNull()
  })

  it('RT-12b: decodeTable(undefined) → null', () => {
    expect(decodeTable(undefined)).toBeNull()
  })

  it('RT-12c: decodeTable("") → null', () => {
    expect(decodeTable('')).toBeNull()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  3 · Tamper / Spoof Checks                                                 */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Tamper / spoof detection', () => {
  const validTokenFor4 = encodeTable('4')

  it('RT-15: changing table number (4→5) while keeping hash → null', () => {
    // Decode, replace '4.' with '5.', re-encode.
    const spoofed = tamperToken(validTokenFor4, (payload) => {
      const dot = payload.lastIndexOf('.')
      return '5' + payload.substring(dot)
    })
    expect(decodeTable(spoofed)).toBeNull()
  })

  it('RT-16: replacing hash while keeping table number → null', () => {
    const spoofed = tamperToken(validTokenFor4, (payload) => {
      const dot = payload.lastIndexOf('.')
      return payload.substring(0, dot) + '.aaa111bbb222'
    })
    expect(decodeTable(spoofed)).toBeNull()
  })

  it('RT-17: completely fabricated token → null', () => {
    const fake = toBase64Url('test.test')
    expect(decodeTable(fake)).toBeNull()
  })

  it('RT-18: token with no dot separator → null', () => {
    const noDot = toBase64Url('nodot')
    expect(decodeTable(noDot)).toBeNull()
  })

  it('RT-19: token with dot at position 0 (.hash) → null', () => {
    const leadingDot = toBase64Url('.somehash')
    expect(decodeTable(leadingDot)).toBeNull()
  })

  it('RT-20: token with multiple dots (a.b.c) → null (dot in table fails regex)', () => {
    // lastIndexOf('.') splits at last dot → table='a.b', sig='c'.
    // 'a.b' contains a dot, which is disallowed by the regex.
    const multiDot = toBase64Url('a.b.c')
    expect(decodeTable(multiDot)).toBeNull()
  })

  it('RT-21: table ID exceeding 6 characters → null (regex fails)', () => {
    // Even with a correct hash, the sanity check rejects long IDs.
    // Forge a payload with the real hash for 'LONGNAME'.
    // Since we can't call keyedHash directly, we test via encodeTable
    // which would create a valid token — but decodeTable must reject
    // because the table doesn't match /^[A-Za-z0-9-]{1,6}$/.
    const token = encodeTable('LONGNAME')
    expect(decodeTable(token)).toBeNull()
  })

  it('RT-22: empty table string with valid-looking hash (dot at pos 0) → null', () => {
    // Payload: '.<anything>'  →  dot index is 0  →  < 1  →  null
    const emptyTable = toBase64Url('.validhash')
    expect(decodeTable(emptyTable)).toBeNull()
  })

  it('RT-23: table ID with special chars (4!@#) → null (regex fails)', () => {
    // Even if the hash were correct, special chars fail the regex.
    const specialToken = toBase64Url('4!@#.fakehash')
    expect(decodeTable(specialToken)).toBeNull()
  })

  it('RT-24: invalid base64url encoding (%%%) → null (atob throws, caught)', () => {
    expect(decodeTable('%%%')).toBeNull()
  })

  it('RT-24b: non-base64 chars (#$^&) → null', () => {
    expect(decodeTable('#$^&')).toBeNull()
  })

  it('RT-26: very long token string (10 KB) → null and no crash', () => {
    // Generate a 10 KB random-ish base64url string.
    const longPayload = 'A'.repeat(10240)
    const longToken = toBase64Url(longPayload)
    expect(() => decodeTable(longToken)).not.toThrow()
    expect(decodeTable(longToken)).toBeNull()
  })

  it('RT-27: unicode/emoji in token payload → null (graceful failure)', () => {
    // btoa does not accept multi-byte chars directly; fromBase64Url will
    // catch the error and return null, so decodeTable returns null.
    // We test by manually encoding a safe version first.
    expect(decodeTable('8J-NtQ')).toBeNull() // base64-ish string that decodes to garbage
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  3b · Additional tamper / edge cases (RT-14, RT-22, RT-23, RT-25)           */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Additional tamper and edge-case checks', () => {
  it('RT-14: swap table 4→5 in token payload → null (spoof rejected)', () => {
    const validToken = encodeTable('4')
    const spoofed = tamperToken(validToken, (payload) =>
      payload.replace(/^4\./, '5.')
    )
    expect(decodeTable(spoofed)).toBeNull()
  })

  it('RT-22: table containing spaces ("4 5") → null (regex rejects space)', () => {
    const token = toBase64Url('4 5.fakehash')
    expect(decodeTable(token)).toBeNull()
  })

  it('RT-23: multi-dot payload "4.2.validhash" → null (table "4.2" fails regex)', () => {
    // lastIndexOf('.') splits at last dot → table='4.2', sig='validhash'.
    // '4.2' contains a dot, which fails /^[A-Za-z0-9-]{1,6}$/.
    const token = toBase64Url('4.2.validhash')
    expect(decodeTable(token)).toBeNull()
  })

  it('RT-25: percent-encoded base64url chars still decode correctly', () => {
    // Simulate what a browser does: percent-encode the - and _ chars.
    const token = encodeTable('4')
    const percentEncoded = token.replace(/-/g, '%2D').replace(/_/g, '%5F')
    // URLSearchParams.get() auto-decodes percent-encoding, so the token
    // that reaches decodeTable() is the original. Verify the round-trip.
    const decoded = decodeURIComponent(percentEncoded)
    expect(decodeTable(decoded)).toBe('4')
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Table ID sanity regex /^[A-Za-z0-9-]{1,6}$/', () => {
  it.each([
    ['1',       true,  'single digit'],
    ['Ab12-X',  true,  '6-char max length'],
    ['LONG123', false, '7 chars — too long'],
    ['4.5',     false, 'contains dot'],
    ['a b',     false, 'contains space'],
    ['T@1',     false, 'contains @'],
  ])('table "%s" → accepted=%s  (%s)', (table, shouldAccept) => {
    const token = encodeTable(table)
    const result = decodeTable(token)
    if (shouldAccept) {
      expect(result).toBe(table)
    } else {
      expect(result).toBeNull()
    }
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  5 · Secret / default key (RT-40)                                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('Default secret fallback (RT-40)', () => {
  it('tokens encode and decode when VITE_TABLE_SECRET is unset', () => {
    // In test environment, import.meta.env.VITE_TABLE_SECRET is undefined,
    // so the module falls back to 'tcm-default-key-change-in-production'.
    // If encode → decode round-trips, the fallback is working.
    const token = encodeTable('4')
    expect(decodeTable(token)).toBe('4')
  })
})
