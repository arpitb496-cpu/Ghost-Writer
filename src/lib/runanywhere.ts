/**
 * runanywhere.ts  (OPTIMIZED)
 *
 * Performance improvements:
 *  1. Calls prewarmModels() after SDK init so both model downloads start
 *     immediately in the background — user doesn't wait on first generation.
 *  2. prewarmModels() uses Promise.allSettled so a single model failure
 *     doesn't block the other.
 */

import {
  RunAnywhere,
  SDKEnvironment,
  ModelManager,
  ModelCategory,
  LLMFramework,
  type CompactModelDef,
} from '@runanywhere/web'
import { LlamaCPP } from '@runanywhere/web-llamacpp'
import { prewarmModels } from './aiService'

const MODELS: CompactModelDef[] = [
  {
    id: 'smollm2-135m-q4_k_m',
    name: 'SmolLM2 135M (Fast)',
    repo: 'HuggingFaceTB/SmolLM2-135M-Instruct-GGUF',
    files: ['smollm2-135m-instruct-q4_k_m.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 150_000_000,
  },
  {
    id: 'lfm2-350m-q4_k_m',
    name: 'LFM2 350M (Balanced)',
    repo: 'LiquidAI/LFM2-350M-GGUF',
    files: ['LFM2-350M-Q4_K_M.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 300_000_000,
  },
]

let _initPromise: Promise<void> | null = null

export async function initSDK(): Promise<void> {
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    await RunAnywhere.initialize({
      environment: SDKEnvironment.Production,
      debug: false,
      apiKey: 'sk-AtdB22jPz_IOPJzqq32yWg',
      baseURL: 'https://api.runanywhere.ai',
    })

    await LlamaCPP.register()

    RunAnywhere.registerModels(MODELS)

    // OPTIMIZATION: kick off model pre-warming in the background.
    // We do NOT await this — it runs concurrently while the user reads the UI.
    // By the time they drop files, models are likely already downloaded/loaded.
    prewarmModels().catch((e) =>
      console.warn('Background model pre-warm failed (non-fatal):', e)
    )
  })()

  return _initPromise
}

export { ModelManager, ModelCategory }
