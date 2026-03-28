import { useCallback, useRef, useState } from 'react'

/**
 * Live streaming throughput: each stream chunk bumps the counter.
 * EMA-smoothed tok/s (chunk/s) for a stable HUD; tracks session peak.
 */
export function useLiveGenerationSpeed() {
  const startRef = useRef<number | null>(null)
  const nRef = useRef(0)
  const peakRef = useRef(0)
  const emaRef = useRef(0)

  const [live, setLive] = useState(0)
  const [peak, setPeak] = useState(0)

  const reset = useCallback(() => {
    startRef.current = null
    nRef.current = 0
    peakRef.current = 0
    emaRef.current = 0
    setLive(0)
    setPeak(0)
  }, [])

  const bump = useCallback(() => {
    const now = performance.now()
    if (startRef.current === null) startRef.current = now
    nRef.current += 1
    const sec = (now - startRef.current) / 1000
    const avg = nRef.current / Math.max(sec, 0.04)
    emaRef.current = emaRef.current === 0 ? avg : emaRef.current * 0.82 + avg * 0.18
    setLive(emaRef.current)
    if (emaRef.current > peakRef.current) {
      peakRef.current = emaRef.current
      setPeak(peakRef.current)
    }
  }, [])

  return { live, peak, reset, bump }
}
