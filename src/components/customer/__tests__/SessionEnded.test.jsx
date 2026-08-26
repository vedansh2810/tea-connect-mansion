/**
 * SessionEnded.test.jsx — Unit tests for the SessionEnded terminal screen
 *
 * Covers test-case IDs:
 *   TC-4.1  Reason message correctness (cleared / timeout / unknown / default)
 *   TC-4.2  backend.disconnect() local-mode no-op verification
 *   TC-4.5  UI structure validation (heading, button, footer, ornaments)
 *
 * These render the real SessionEnded component (no mock) to verify text,
 * structure, and callback wiring.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import SessionEnded from '../SessionEnded'

afterEach(cleanup)

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  TC-4.1 — Reason message correctness                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('TC-4.1 — SessionEnded renders correct message per reason', () => {
  it.each([
    [
      'cleared',
      'Your bill has been settled. We hope you enjoyed your meal at Tea Connect Mansion.',
    ],
    [
      'timeout',
      'Your session has expired due to inactivity. Scan the QR code on your table to start a new session.',
    ],
    [
      'unknown_value',
      'Your bill has been settled. We hope you enjoyed your meal at Tea Connect Mansion.',
    ],
  ])('reason="%s" → correct message', (reason, expected) => {
    render(<SessionEnded reason={reason} onRescan={() => {}} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('no reason prop → defaults to "cleared" message', () => {
    render(<SessionEnded onRescan={() => {}} />)
    expect(
      screen.getByText(
        'Your bill has been settled. We hope you enjoyed your meal at Tea Connect Mansion.',
      ),
    ).toBeInTheDocument()
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  TC-4.2 — backend.disconnect() behavior (local mode)                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('TC-4.2 — backend.disconnect() behavior', () => {
  it('disconnect() completes without throwing in the current backend mode', async () => {
    const { backend, isCloudConfigured } = await import('../../../store/backend')

    // Whatever mode the env is in, disconnect must not throw.
    // Local mode: empty function body (no-op).
    // Cloud mode: calls supabase.removeAllChannels(), does NOT null
    //             clientPromise (allows lazy reuse on re-scan).
    await expect(
      Promise.resolve(backend.disconnect()),
    ).resolves.not.toThrow()

    // Confirm we know which mode we're testing
    expect(typeof isCloudConfigured).toBe('boolean')
  })
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  TC-4.5 — SessionEnded UI structure validation                             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

describe('TC-4.5 — SessionEnded UI structure', () => {
  it('renders all required structural elements', () => {
    const mockRescan = vi.fn()
    render(<SessionEnded reason="cleared" onRescan={mockRescan} />)

    // ── Heading ──
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /thank you for visiting/i,
    )

    // ── Reason message ──
    expect(
      screen.getByText(/Your bill has been settled/),
    ).toBeInTheDocument()

    // ── CTA button ──
    const button = screen.getByRole('button', { name: /scan qr/i })
    expect(button).toBeInTheDocument()

    // Button fires onRescan callback
    fireEvent.click(button)
    expect(mockRescan).toHaveBeenCalledTimes(1)

    // ── Helper text ──
    expect(screen.getByText(/call a waiter/i)).toBeInTheDocument()

    // ── Restaurant footer (name + hours) ──
    // "Tea Connect Mansion" appears in both the reason message and the footer,
    // so use getAllByText to accept both matches.
    const nameMatches = screen.getAllByText(/Tea Connect Mansion/)
    expect(nameMatches.length).toBeGreaterThanOrEqual(2) // message + footer
    expect(screen.getByText(/Open 24×7/)).toBeInTheDocument()
  })
})
