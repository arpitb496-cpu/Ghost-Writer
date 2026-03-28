/**
 * DNACard.tsx
 *
 * Visual display of the user's Writing DNA profile.
 * This is a key "wow moment" in the demo — seeing your
 * writing analyzed and displayed as a personality card.
 */

import { type WritingDNA } from '../lib/writingDNA'
import styles from './DNACard.module.css'

interface Props {
  dna: WritingDNA
  onClear: () => void
}

export function DNACard({ dna, onClear }: Props) {
  const timeAgo = formatTimeAgo(dna.createdAt)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.dnaIcon}>🧬</div>
          <div>
            <h3 className={styles.title}>Your Writing DNA</h3>
            <p className={styles.meta}>
              {dna.documentCount} doc{dna.documentCount !== 1 ? 's' : ''} · {dna.wordCount.toLocaleString()} words · {timeAgo}
            </p>
          </div>
        </div>
        <button className={styles.clearBtn} onClick={onClear} title="Clear and retrain">
          ✕ Reset
        </button>
      </div>

      {/* Summary */}
      <p className={styles.summary}>{dna.summary}</p>

      {/* Trait grid */}
      <div className={styles.traitGrid}>
        <Trait label="Formality" value={capitalize(dna.formality)} color={formalityColor(dna.formality)} />
        <Trait label="Sentences" value={capitalize(dna.sentenceLength)} />
        <Trait label="Contractions" value={dna.usesContractions ? 'Yes' : 'No'} color={dna.usesContractions ? 'var(--success)' : 'var(--text-secondary)'} />
        <Trait label="Emoji" value={dna.usesEmoji ? 'Yes 😄' : 'No'} />
        <Trait label="Structure" value={capitalize(dna.structureLevel)} />
        <Trait label="Opens with" value={`"${dna.openingStyle}"`} mono />
      </div>

      {/* Tone descriptors */}
      {dna.toneDescriptors.length > 0 && (
        <div className={styles.tagsRow}>
          <span className={styles.tagsLabel}>Tone</span>
          {dna.toneDescriptors.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      )}

      {/* Signature words */}
      {dna.signatureWords.length > 0 && (
        <div className={styles.tagsRow}>
          <span className={styles.tagsLabel}>Vocab</span>
          {dna.signatureWords.map((w) => (
            <span key={w} className={`${styles.tag} ${styles.tagMono}`}>{w}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Trait({ label, value, color, mono }: {
  label: string
  value: string
  color?: string
  mono?: boolean
}) {
  return (
    <div className={styles.trait}>
      <span className={styles.traitLabel}>{label}</span>
      <span className={styles.traitValue} style={{ color: color, fontFamily: mono ? 'var(--font-mono)' : undefined }}>
        {value}
      </span>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

function formalityColor(f: string) {
  if (f === 'casual') return 'var(--accent)'
  if (f === 'academic') return 'var(--violet)'
  return 'var(--success)'
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
