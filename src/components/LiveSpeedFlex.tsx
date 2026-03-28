/**
 * Feature 3 — Live Speed Flex: real-time throughput HUD + peak + engine metrics.
 */

import styles from './LiveSpeedFlex.module.css'

interface Props {
  /** Smoothed live chunks/sec while streaming */
  liveTps: number
  /** Best live value this session */
  peakTps: number
  /** From on-device engine after stream ends (authoritative when present) */
  engineTps: number | null
  engineLatencyMs: number | null
  isStreaming: boolean
  backend: 'local' | 'remote'
  /** Compact row (e.g. compare column) */
  compact?: boolean
  label: string
}

function clampBar(tps: number, cap = 180) {
  return Math.min(100, (tps / cap) * 100)
}

export function LiveSpeedFlex({
  liveTps,
  peakTps,
  engineTps,
  engineLatencyMs,
  isStreaming,
  backend,
  compact = false,
  label,
}: Props) {
  const display =
    !isStreaming && engineTps != null && engineTps > 0
      ? engineTps
      : liveTps > 0
        ? liveTps
        : peakTps

  const bar = clampBar(isStreaming ? liveTps : display || peakTps)

  return (
    <div className={compact ? `${styles.wrap} ${styles.compact}` : styles.wrap}>
      <div className={styles.strip} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.top}>
          <span className={styles.label}>{label}</span>
          {isStreaming && <span className={styles.liveDot}>LIVE</span>}
          {!isStreaming && backend === 'local' && engineTps != null && engineTps > 0 && (
            <span className={styles.finalTag}>engine</span>
          )}
          {backend === 'remote' && <span className={styles.remoteTag}>remote</span>}
        </div>
        <div className={styles.readout}>
          <span className={styles.number}>{display > 0 ? display.toFixed(1) : '—'}</span>
          <span className={styles.unit}>tok/s</span>
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${bar}%` }} />
        </div>
        <div className={styles.meta}>
          <span>peak {peakTps > 0 ? peakTps.toFixed(1) : '—'}</span>
          {engineLatencyMs != null && engineLatencyMs > 0 && (
            <span className={styles.lat}>{engineLatencyMs} ms latency</span>
          )}
        </div>
      </div>
    </div>
  )
}
