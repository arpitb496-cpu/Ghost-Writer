/**
 * Feature 2 — Content Authenticity Stamp: copy & verify keccak-bound output + DNA fingerprint.
 */

import { useMemo, useState, useCallback } from 'react'
import { type WritingDNA } from '../lib/writingDNA'
import {
  createAuthenticityStamp,
  serializeStamp,
  formatStampBlock,
  parseStampJson,
  verifyAuthenticityStamp,
  type AuthenticityStampV1,
} from '../lib/authenticityStamp'
import styles from './ContentAuthenticityStamp.module.css'

type Mode = 'email' | 'message' | 'content'

interface Props {
  content: string
  dna: WritingDNA
  mode: Mode
  /** Hide when empty or still streaming */
  visible: boolean
}

export function ContentAuthenticityStamp({ content, dna, mode, visible }: Props) {
  const [showVerify, setShowVerify] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteStamp, setPasteStamp] = useState('')
  const [verifyResult, setVerifyResult] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [verifyDetail, setVerifyDetail] = useState('')
  const [verifyDnaToo, setVerifyDnaToo] = useState(false)

  const stamp: AuthenticityStampV1 | null = useMemo(() => {
    if (!content.trim()) return null
    return createAuthenticityStamp(content, dna, mode)
  }, [content, dna, mode])

  const copyJson = useCallback(() => {
    if (!stamp) return
    void navigator.clipboard.writeText(serializeStamp(stamp))
  }, [stamp])

  const copyBlock = useCallback(() => {
    if (!stamp) return
    void navigator.clipboard.writeText(formatStampBlock(stamp))
  }, [stamp])

  const runVerify = useCallback(() => {
    const parsed = parseStampJson(pasteStamp.trim())
    if (!parsed) {
      setVerifyResult('fail')
      setVerifyDetail('Could not parse stamp JSON.')
      return
    }
    const r = verifyAuthenticityStamp(pasteText, parsed, verifyDnaToo ? dna : undefined)
    if (r.ok) {
      setVerifyResult('ok')
      setVerifyDetail(
        verifyDnaToo
          ? 'Content hash and current Writing DNA both match this stamp.'
          : 'Content hash matches — the text is unchanged from what was stamped. The DNA hash in the JSON is the Writing DNA fingerprint at issue time.'
      )
    } else {
      setVerifyResult('fail')
      const labels: Record<string, string> = {
        invalidStamp: 'Invalid or unsupported stamp.',
        contentMismatch: 'Text does not match the stamped content hash (any edit breaks the stamp).',
        dnaMismatch: 'Current Writing DNA does not match the stamp (profile changed or different device).',
      }
      setVerifyDetail(labels[r.reason] ?? r.reason)
    }
  }, [pasteText, pasteStamp, verifyDnaToo, dna])

  if (!visible || !stamp) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.kicker}>Authenticity</span>
        <h3 className={styles.title}>Content stamp</h3>
        <p className={styles.lead}>
          Cryptographic fingerprint of this output and your Writing DNA profile. Share the JSON to let others verify
          the text has not been altered.
        </p>
      </div>

      <div className={styles.row}>
        <div className={styles.fp}>
          <span className={styles.fpLabel}>Content</span>
          <code className={styles.fpVal}>{stamp.contentHash.slice(0, 12)}…{stamp.contentHash.slice(-6)}</code>
        </div>
        <div className={styles.fp}>
          <span className={styles.fpLabel}>DNA</span>
          <code className={styles.fpVal}>{stamp.dnaHash.slice(0, 12)}…{stamp.dnaHash.slice(-6)}</code>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={copyJson}>
          Copy stamp JSON
        </button>
        <button type="button" className={styles.btnGhost} onClick={copyBlock}>
          Copy text block
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => setShowVerify((v) => !v)}
        >
          {showVerify ? 'Hide verify' : 'Verify a stamp'}
        </button>
      </div>

      {showVerify && (
        <div className={styles.verify}>
          <label className={styles.verifyLabel}>Paste exact generated text</label>
          <textarea
            className={styles.verifyTa}
            rows={4}
            value={pasteText}
            onChange={(e) => { setPasteText(e.target.value); setVerifyResult('idle') }}
            placeholder="Full text as generated (whitespace at end is normalized)"
          />
          <label className={styles.verifyLabel}>Paste stamp JSON</label>
          <textarea
            className={styles.verifyTa}
            rows={6}
            value={pasteStamp}
            onChange={(e) => { setPasteStamp(e.target.value); setVerifyResult('idle') }}
            placeholder='{ "v": 1, "app": "ghostwriter", ... }'
          />
          <label className={styles.verifyCheck}>
            <input
              type="checkbox"
              checked={verifyDnaToo}
              onChange={(e) => { setVerifyDnaToo(e.target.checked); setVerifyResult('idle') }}
            />
            Also require match to my current Writing DNA
          </label>
          <button type="button" className={styles.btnPrimary} onClick={runVerify}>
            Verify
          </button>
          {verifyResult === 'ok' && <p className={styles.ok}>{verifyDetail}</p>}
          {verifyResult === 'fail' && <p className={styles.bad}>{verifyDetail}</p>}
        </div>
      )}
    </div>
  )
}
