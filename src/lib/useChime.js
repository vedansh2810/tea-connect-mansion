import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The pass bell. Synthesised rather than shipped as an audio file — two
 * struck brass tones with a short decay, which carries over kitchen noise
 * without being shrill.
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

  useEffect(
    () => () => {
      contextRef.current?.close()
      contextRef.current = null
    },
    [],
  )

  return { arm, ring, armed, muted, setMuted }
}
