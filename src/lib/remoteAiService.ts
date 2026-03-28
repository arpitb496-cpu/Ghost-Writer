/**
 * remoteAiService.ts
 * Groq API — free, browser CORS supported, clean output, fast.
 */

import { type WritingDNA, dnaToSystemPrompt } from './writingDNA'

const GROQ_MODEL    = 'llama-3.1-8b-instant'
const GROQ_URL      = '/api/chat'

async function streamChat(
  systemPrompt: string,
  userMessage: string,
  onToken: (token: string) => void
): Promise<void> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      max_tokens: 700,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    if (response.status === 401) throw new Error('Invalid Groq API key.')
    if (response.status === 429) throw new Error('Rate limit hit. Wait 10 seconds and retry.')
    throw new Error(`Groq error ${response.status}: ${text.slice(0, 150)}`)
  }

  const reader  = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) onToken(delta)
      } catch { /* skip */ }
    }
  }
}

export async function extractWritingDNARemote(
  textSamples: string[],
  onProgress?: (msg: string) => void
): Promise<WritingDNA> {
  onProgress?.('Analyzing your writing style via Groq…')

  const combinedText = textSamples
    .map((t, i) => `[SAMPLE ${i + 1}]\n${t.slice(0, 700)}`)
    .join('\n\n')

  const userMessage = `Analyze these writing samples. Return ONLY a JSON object, nothing else.

WRITING SAMPLES:
${combinedText}

JSON structure to return:
{"formality":"casual","sentenceLength":"medium","punctuationStyle":"uses commas often","signatureWords":["word1","word2"],"usesContractions":true,"usesEmoji":false,"openingStyle":"Hey","closingStyle":"Thanks","toneDescriptors":["warm","direct"],"structureLevel":"flowing","summary":"Two sentence summary."}`

  let rawOutput = ''
  await streamChat(
    'You are a writing style analyst. Output ONLY a raw JSON object. No markdown, no backticks, no explanation whatsoever.',
    userMessage,
    (token) => { rawOutput += token }
  )

  onProgress?.('Parsing style profile…')

  const clean = rawOutput.replace(/```json|```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse style profile. Please retry.')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    const fixed = match[0].replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"')
    try { parsed = JSON.parse(fixed) }
    catch { throw new Error('Could not parse style profile. Please retry.') }
  }

  return {
    formality:        (parsed.formality        as WritingDNA['formality']) ?? 'professional',
    sentenceLength:   (parsed.sentenceLength   as WritingDNA['sentenceLength']) ?? 'medium',
    punctuationStyle: (parsed.punctuationStyle as string) ?? 'standard punctuation',
    signatureWords:   Array.isArray(parsed.signatureWords) ? parsed.signatureWords : [],
    usesContractions: Boolean(parsed.usesContractions),
    usesEmoji:        Boolean(parsed.usesEmoji),
    openingStyle:     (parsed.openingStyle     as string) ?? 'Hi',
    closingStyle:     (parsed.closingStyle     as string) ?? 'Thanks',
    toneDescriptors:  Array.isArray(parsed.toneDescriptors) ? parsed.toneDescriptors : [],
    structureLevel:   (parsed.structureLevel   as WritingDNA['structureLevel']) ?? 'flowing',
    summary:          (parsed.summary          as string) ?? 'Professional writing style',
    createdAt:        Date.now(),
    documentCount:    textSamples.length,
    wordCount:        textSamples.join(' ').split(/\s+/).length,
  }
}

export async function generateWithStyleRemote(
  prompt: string,
  mode: 'email' | 'message' | 'content',
  dna: WritingDNA,
  onToken: (token: string) => void,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Writing in your voice…')
  const modePrefix = {
    email:   'Write a complete email (subject line + body) that:\n',
    message: 'Write a short message (1-3 sentences) that:\n',
    content: 'Write content (paragraph or more) that:\n',
  }[mode]
  await streamChat(dnaToSystemPrompt(dna), `${modePrefix}${prompt}`, onToken)
}

export async function generateGenericRemote(
  prompt: string,
  mode: 'email' | 'message' | 'content',
  onToken: (token: string) => void,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Generating generic version…')
  const modePrefix = {
    email:   'Write a professional email (subject line + body) for:\n',
    message: 'Write a professional message for:\n',
    content: 'Write professional content for:\n',
  }[mode]
  await streamChat(
    'You are a professional writing assistant. Write clear, polished content.',
    `${modePrefix}${prompt}`,
    onToken
  )
}

export type FreeModelId = string
export const FREE_MODELS          = [{ id: GROQ_MODEL, label: 'Llama 3.1 8B (Groq)', badge: '⚡' }] as const
const DEFAULT_REMOTE_MODEL: FreeModelId = GROQ_MODEL
export const saveApiKey           = (_k: string) => {}
export const loadApiKey           = () => ''
export const saveRemoteModel      = (_m: string) => {}
export const loadRemoteModel      = () => DEFAULT_REMOTE_MODEL
export const isValidApiKey        = (_k: string) => true
