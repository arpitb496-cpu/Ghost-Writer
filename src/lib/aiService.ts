/**
 * aiService.ts  (OPTIMIZED)
 *
 * Performance improvements:
 *  1. Warm model cache (_loadedModels Set) — skips repeated ModelManager scans
 *  2. prewarmModels() — downloads both models in parallel after SDK init
 *  3. generateGeneric() fast-paths through already-loaded model
 *  4. Smaller per-sample text cap (600 vs 800 chars) for faster DNA extraction
 *  5. Reduced maxTokens for DNA extraction (350 vs 400)
 */

import { ModelManager } from '@runanywhere/web'
import { TextGeneration } from '@runanywhere/web-llamacpp'
import { type WritingDNA, dnaToSystemPrompt } from './writingDNA'

const DNA_MODEL_ID = 'smollm2-135m-q4_k_m'
const GEN_MODEL_ID = 'lfm2-350m-q4_k_m'

// In-process cache: avoids ModelManager.getModels() on every generation call
const _loadedModels = new Set<string>()

async function ensureModelReady(
  modelId: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  if (_loadedModels.has(modelId)) return  // fast-path

  const models = ModelManager.getModels()
  const model = models.find((m) => m.id === modelId)

  if (!model) throw new Error(`Model ${modelId} not found in registry`)

  if (model.status !== 'downloaded' && model.status !== 'loaded') {
    onProgress?.(`Downloading ${model.name}… (first time only, cached after)`)
    await ModelManager.downloadModel(modelId)
  }

  if (model.status !== 'loaded') {
    onProgress?.(`Loading ${model.name} into memory…`)
    await ModelManager.loadModel(modelId)
  }

  _loadedModels.add(modelId)
}

/** Kick off both model downloads in parallel right after SDK init. */
export async function prewarmModels(onProgress?: (msg: string) => void): Promise<void> {
  await Promise.allSettled([
    ensureModelReady(DNA_MODEL_ID, onProgress),
    ensureModelReady(GEN_MODEL_ID, onProgress),
  ])
}

export async function extractWritingDNA(
  textSamples: string[],
  onProgress?: (msg: string) => void
): Promise<WritingDNA> {
  onProgress?.('Preparing model…')
  await ensureModelReady(DNA_MODEL_ID, onProgress)
  onProgress?.('Analyzing your writing style…')

  // 600 chars/sample (was 800) — saves ~50 tokens, meaningfully faster on 135M
  const combinedText = textSamples
    .map((t, i) => `[SAMPLE ${i + 1}]\n${t.slice(0, 600)}`)
    .join('\n\n')

  const prompt = `Analyze these writing samples and extract the author's style. Return ONLY valid JSON, no other text.

WRITING SAMPLES:
${combinedText}

Return this exact JSON structure filled in:
{
  "formality": "casual",
  "sentenceLength": "medium",
  "punctuationStyle": "description here",
  "signatureWords": ["word1", "word2", "word3"],
  "usesContractions": true,
  "usesEmoji": false,
  "openingStyle": "typical opening phrase",
  "closingStyle": "typical closing phrase",
  "toneDescriptors": ["descriptor1", "descriptor2"],
  "structureLevel": "flowing",
  "summary": "2-sentence style summary"
}`

  let rawOutput = ''

  try {
    const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
      maxTokens: 350,  // was 400 — JSON template rarely needs more
      temperature: 0.1,
      systemPrompt: 'You are a writing style analyst. Output only valid JSON. No markdown, no explanation.',
    })

    for await (const token of stream) rawOutput += token
    await resultPromise

    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Model did not return valid JSON')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      formality: parsed.formality || 'professional',
      sentenceLength: parsed.sentenceLength || 'medium',
      punctuationStyle: parsed.punctuationStyle || 'standard punctuation',
      signatureWords: Array.isArray(parsed.signatureWords) ? parsed.signatureWords : [],
      usesContractions: Boolean(parsed.usesContractions),
      usesEmoji: Boolean(parsed.usesEmoji),
      openingStyle: parsed.openingStyle || 'Hi',
      closingStyle: parsed.closingStyle || 'Thanks',
      toneDescriptors: Array.isArray(parsed.toneDescriptors) ? parsed.toneDescriptors : [],
      structureLevel: parsed.structureLevel || 'flowing',
      summary: parsed.summary || 'Professional writing style',
      createdAt: Date.now(),
      documentCount: textSamples.length,
      wordCount: textSamples.join(' ').split(/\s+/).length,
    }
  } catch (e) {
    console.error('DNA extraction failed, using fallback:', e)
    return buildFallbackDNA(textSamples)
  }
}

export async function generateWithStyle(
  prompt: string,
  mode: 'email' | 'message' | 'content',
  dna: WritingDNA,
  onToken: (token: string) => void,
  onProgress?: (msg: string) => void
): Promise<{ tokensPerSecond: number; latencyMs: number }> {
  onProgress?.('Preparing writer…')
  await ensureModelReady(GEN_MODEL_ID, onProgress)
  onProgress?.('Writing in your voice…')

  const modePrefix = {
    email: 'Write a complete email (subject line + body) that:\n',
    message: 'Write a short message (1-3 sentences) that:\n',
    content: 'Write content (paragraph or more) that:\n',
  }[mode]

  const { stream, result: resultPromise } = await TextGeneration.generateStream(
    `${modePrefix}${prompt}`,
    { maxTokens: 600, temperature: 0.75, systemPrompt: dnaToSystemPrompt(dna) }
  )

  for await (const token of stream) onToken(token)

  const metrics = await resultPromise
  return { tokensPerSecond: metrics.tokensPerSecond, latencyMs: metrics.latencyMs }
}

/** Fast-path: GEN_MODEL_ID is guaranteed loaded by generateWithStyle above. */
export async function generateGeneric(
  prompt: string,
  mode: 'email' | 'message' | 'content',
  onToken: (token: string) => void,
  onProgress?: (msg: string) => void
): Promise<void> {
  await ensureModelReady(GEN_MODEL_ID, onProgress)  // instant via _loadedModels cache

  const modePrefix = {
    email: 'Write a professional email (subject line + body) for:\n',
    message: 'Write a professional message for:\n',
    content: 'Write professional content for:\n',
  }[mode]

  const { stream } = await TextGeneration.generateStream(`${modePrefix}${prompt}`, {
    maxTokens: 600,
    temperature: 0.5,
    systemPrompt: 'You are a professional writing assistant. Write clear, polished content.',
  })

  for await (const token of stream) onToken(token)
}

function buildFallbackDNA(samples: string[]): WritingDNA {
  const combined = samples.join(' ')
  const words = combined.split(/\s+/)
  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const avgLen = sentences.length > 0 ? words.length / sentences.length : 15

  return {
    formality: combined === combined.toLowerCase() ? 'casual' : 'professional',
    sentenceLength: avgLen < 10 ? 'short' : avgLen > 20 ? 'long' : 'medium',
    punctuationStyle: 'standard punctuation with occasional emphasis',
    signatureWords: [],
    usesContractions: /\b(don't|can't|won't|I'm|you're|it's|we're)\b/i.test(combined),
    usesEmoji: /[\u{1F600}-\u{1F64F}]/u.test(combined),
    openingStyle: 'Hey',
    closingStyle: 'Thanks',
    toneDescriptors: ['direct', 'clear'],
    structureLevel: 'flowing',
    summary: 'Extracted from writing samples using heuristic analysis.',
    createdAt: Date.now(),
    documentCount: samples.length,
    wordCount: words.length,
  }
}
