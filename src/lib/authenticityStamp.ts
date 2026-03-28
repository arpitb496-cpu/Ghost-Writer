import { keccak256, stringToBytes } from 'viem'
import { hashWritingDNA, type WritingDNA } from './writingDNA'

export const STAMP_APP = 'ghostwriter' as const
export const STAMP_VERSION = 1 as const

export type StampMode = 'email' | 'message' | 'content'

/** Canonical on-disk / shareable authenticity record */
export interface AuthenticityStampV1 {
  v: typeof STAMP_VERSION
  app: typeof STAMP_APP
  /** ms since epoch when stamp was issued */
  issuedAt: number
  mode: StampMode
  /** keccak256(utf8, normalized content) */
  contentHash: `0x${string}`
  /** keccak256(canonical Writing DNA) — same as soulbound commitment */
  dnaHash: `0x${string}`
}

/** Normalize line endings and trim for stable hashing */
export function normalizeContentForStamp(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
}

export function hashContent(text: string): `0x${string}` {
  return keccak256(stringToBytes(normalizeContentForStamp(text)))
}

export function createAuthenticityStamp(
  content: string,
  dna: WritingDNA,
  mode: StampMode,
  issuedAt: number = Date.now()
): AuthenticityStampV1 {
  return {
    v: STAMP_VERSION,
    app: STAMP_APP,
    issuedAt,
    mode,
    contentHash: hashContent(content),
    dnaHash: hashWritingDNA(dna),
  }
}

export function serializeStamp(stamp: AuthenticityStampV1): string {
  return JSON.stringify(stamp, null, 2)
}

export function parseStampJson(raw: string): AuthenticityStampV1 | null {
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const s = o as Partial<AuthenticityStampV1>
    if (s.v !== 1 || s.app !== STAMP_APP) return null
    if (typeof s.issuedAt !== 'number') return null
    if (!['email', 'message', 'content'].includes(s.mode as string)) return null
    if (typeof s.contentHash !== 'string' || !s.contentHash.startsWith('0x')) return null
    if (typeof s.dnaHash !== 'string' || !s.dnaHash.startsWith('0x')) return null
    return s as AuthenticityStampV1
  } catch {
    return null
  }
}

export type VerifyFailReason = 'invalidStamp' | 'contentMismatch' | 'dnaMismatch'

export function verifyAuthenticityStamp(
  content: string,
  stamp: AuthenticityStampV1,
  dna?: WritingDNA
): { ok: true } | { ok: false; reason: VerifyFailReason } {
  if (stamp.v !== STAMP_VERSION || stamp.app !== STAMP_APP) {
    return { ok: false, reason: 'invalidStamp' }
  }
  const h = hashContent(content)
  if (h.toLowerCase() !== stamp.contentHash.toLowerCase()) {
    return { ok: false, reason: 'contentMismatch' }
  }
  if (dna) {
    const dh = hashWritingDNA(dna)
    if (dh.toLowerCase() !== stamp.dnaHash.toLowerCase()) {
      return { ok: false, reason: 'dnaMismatch' }
    }
  }
  return { ok: true }
}

/** Short human-readable block for email footers / posts */
export function formatStampBlock(stamp: AuthenticityStampV1): string {
  const t = new Date(stamp.issuedAt).toISOString()
  return [
    '— — —',
    'GhostWriter · Content Authenticity Stamp',
    `Issued: ${t}`,
    `Mode: ${stamp.mode}`,
    `Content hash: ${stamp.contentHash}`,
    `Writing DNA hash: ${stamp.dnaHash}`,
    `Verify: ghostwriter (stamp v${stamp.v})`,
  ].join('\n')
}
