import { keccak256, stringToBytes } from 'viem'

/**
 * writingDNA.ts
 *
 * Defines the "Writing DNA" concept — a structured profile extracted
 * from the user's own documents that captures their unique writing style.
 *
 * This is the core innovation of GhostWriter. Instead of a generic AI,
 * we inject this profile into every generation prompt so the output
 * sounds like the USER, not like ChatGPT.
 *
 * Data never leaves the device — stored in localStorage.
 */

export interface WritingDNA {
  /** Overall formality: "casual" | "professional" | "academic" */
  formality: 'casual' | 'professional' | 'academic'
  /** Average sentence length: "short" | "medium" | "long" */
  sentenceLength: 'short' | 'medium' | 'long'
  /** Punctuation personality */
  punctuationStyle: string
  /** Signature vocabulary (3-5 words the user tends to use) */
  signatureWords: string[]
  /** Whether the user uses contractions (don't vs do not) */
  usesContractions: boolean
  /** Whether the user uses emoji */
  usesEmoji: boolean
  /** Opening style for messages */
  openingStyle: string
  /** Closing style for messages */
  closingStyle: string
  /** Tone descriptors: e.g. "warm", "direct", "enthusiastic" */
  toneDescriptors: string[]
  /** How much structure/bullets/headers the user uses */
  structureLevel: 'flowing' | 'structured' | 'heavily-structured'
  /** Raw analysis summary for the system prompt */
  summary: string
  /** Timestamp when this was generated */
  createdAt: number
  /** Number of documents this was trained on */
  documentCount: number
  /** Total words analyzed */
  wordCount: number
}

const STORAGE_KEY = 'ghostwriter_dna_v1'

/** Save Writing DNA to localStorage */
export function saveDNA(dna: WritingDNA): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dna))
  } catch (e) {
    console.warn('Could not save Writing DNA to localStorage:', e)
  }
}

/** Load Writing DNA from localStorage */
export function loadDNA(): WritingDNA | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WritingDNA
  } catch (e) {
    console.warn('Could not load Writing DNA from localStorage:', e)
    return null
  }
}

/** Clear Writing DNA (reset / start fresh) */
export function clearDNA(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Deterministic JSON for hashing (sorted keys / arrays for stable commitments). */
export function canonicalWritingDNAJson(dna: WritingDNA): string {
  const sorted = {
    closingStyle: dna.closingStyle,
    createdAt: dna.createdAt,
    documentCount: dna.documentCount,
    formality: dna.formality,
    openingStyle: dna.openingStyle,
    punctuationStyle: dna.punctuationStyle,
    sentenceLength: dna.sentenceLength,
    signatureWords: [...dna.signatureWords].sort((a, b) => a.localeCompare(b)),
    structureLevel: dna.structureLevel,
    summary: dna.summary,
    toneDescriptors: [...dna.toneDescriptors].sort((a, b) => a.localeCompare(b)),
    usesContractions: dna.usesContractions,
    usesEmoji: dna.usesEmoji,
    wordCount: dna.wordCount,
  }
  return JSON.stringify(sorted)
}

/** Keccak256 hash of the canonical profile — used for on-chain soulbound commitments. */
export function hashWritingDNA(dna: WritingDNA): `0x${string}` {
  return keccak256(stringToBytes(canonicalWritingDNAJson(dna)))
}

/**
 * Convert WritingDNA into a system prompt injection.
 *
 * This is injected as context into every generation request.
 * Think of it as giving the AI a "character sheet" to play.
 */
export function dnaToSystemPrompt(dna: WritingDNA): string {
  return `You are a writing assistant that mimics the user's personal writing style EXACTLY.

WRITING DNA PROFILE:
- Formality level: ${dna.formality}
- Sentence length: ${dna.sentenceLength} sentences
- Uses contractions: ${dna.usesContractions ? 'YES (use "don\'t", "can\'t", "I\'m" etc.)' : 'NO (write "do not", "cannot", "I am" etc.)'}
- Uses emoji: ${dna.usesEmoji ? 'YES (use them naturally)' : 'NO (never use emoji)'}
- Tone: ${dna.toneDescriptors.join(', ')}
- Structure preference: ${dna.structureLevel}
- Opening style: "${dna.openingStyle}"
- Closing style: "${dna.closingStyle}"
- Signature vocabulary (sprinkle these in naturally): ${dna.signatureWords.join(', ')}
- Punctuation notes: ${dna.punctuationStyle}

STYLE SUMMARY: ${dna.summary}

CRITICAL RULES:
1. NEVER sound like generic AI. Sound like this specific human.
2. Match formality, sentence rhythm, and vocabulary exactly.
3. If their style is casual, be casual. If professional, be professional.
4. Do not add disclaimers, preambles, or meta-commentary.
5. Just write the content in their voice. Nothing else.`
}
