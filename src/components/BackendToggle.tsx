/**
 * BackendToggle.tsx
 *
 * Toggle switch between on-device and remote LLM backend.
 */

import styles from './BackendToggle.module.css'

export type Backend = 'local' | 'remote'

interface Props {
  backend: Backend
  onChange: (b: Backend) => void
  localReady: boolean
  remoteConfigured: boolean
}

export function BackendToggle({ backend, onChange, localReady, remoteConfigured }: Props) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.option} ${backend === 'local' ? styles.active : ''}`}
        onClick={() => onChange('local')}
      >
        <span>🧠</span>
        <span className={styles.label}>On-Device</span>
        <span className={`${styles.dot} ${localReady ? styles.dotGreen : styles.dotOrange}`} />
      </button>

      <button
        className={`${styles.option} ${backend === 'remote' ? styles.active : ''}`}
        onClick={() => onChange('remote')}
      >
        <span>🌐</span>
        <span className={styles.label}>Remote Free LLM</span>
        <span className={`${styles.dot} ${remoteConfigured ? styles.dotGreen : styles.dotGray}`} />
      </button>
    </div>
  )
}
