import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The pass bell and the waiter call chime.
 *
 * Two distinct sounds, both synthesised via WebAudio:
 *
 *   ring()       — Two struck brass tones (triangle waves, 784 + 1175 Hz).
 *                  A bell that carries over kitchen noise. Plays on new orders.
 *
 *   ringWaiter() — Three quick ascending xylophone-like tones (sine waves,
 *                  523 → 659 → 784 Hz, short staccato). Distinctly different
 *                  rhythm and timbre so staff can tell them apart by ear.
 *
 * Browsers refuse to start audio before a gesture, so the hook reports
 * whether it is armed and the dashboard shows an explicit control. Silence
 * the customer never asked for is a bug; silence the kitchen can see and
 * fix is not.
 */
export function useChime() {
  const contextRef = useRef(null)
  const [armed, setArmed] = useState(false)
  const [muted, setMuted] = useState(() => localStorage.getItem('tcm.muted') === '1')

  useEffect(() => {
    localStorage.setItem('tcm.muted', muted ? '1' : '0')
  }, [muted])

  const arm = useCallback(async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return false
    if (!contextRef.current) contextRef.current = new AudioContextClass()
    try {
      await contextRef.current.resume()
      setArmed(contextRef.current.state === 'running')
      return contextRef.current.state === 'running'
    } catch {
      return false
    }
  }, [])

  /** Order bell — two struck brass tones, a fifth apart. */
  const ring = useCallback(() => {
    const audio = contextRef.current
    if (!audio || muted || audio.state !== 'running') return

    const now = audio.currentTime
    const master = audio.createGain()
    master.gain.value = 0.22
    master.connect(audio.destination)

    // Two strikes, a fifth apart, second one softer — a bell, not a beep.
    ;[
      { freq: 784, at: 0, hold: 1.1 },
      { freq: 1175, at: 0.11, hold: 0.9 },
    ].forEach(({ freq, at, hold }) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + at)
      gain.gain.linearRampToValueAtTime(at === 0 ? 0.9 : 0.5, now + at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + hold)
      osc.connect(gain).connect(master)
      osc.start(now + at)
      osc.stop(now + at + hold + 0.05)
    })
  }, [muted])

  /** Waiter call — three quick ascending xylophone-like tones. */
  const ringWaiter = useCallback(() => {
    const audio = contextRef.current
    if (!audio || muted || audio.state !== 'running') return

    const now = audio.currentTime
    const master = audio.createGain()
    master.gain.value = 0.28
    master.connect(audio.destination)

    // Three ascending tones, sine waves for a softer xylophone feel,
    // short staccato so it sounds distinctly different from the brass bell.
    ;[
      { freq: 523, at: 0, hold: 0.22 },
      { freq: 659, at: 0.15, hold: 0.22 },
      { freq: 784, at: 0.30, hold: 0.35 },
    ].forEach(({ freq, at, hold }) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + at)
      gain.gain.linearRampToValueAtTime(0.7, now + at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + hold)
      osc.connect(gain).connect(master)
      osc.start(now + at)
      osc.stop(now + at + hold + 0.05)
    })
  }, [muted])

  useEffect(
    () => () => {
      contextRef.current?.close()
      contextRef.current = null
    },
    [],
  )

  return { arm, ring, ringWaiter, armed, muted, setMuted }
}
