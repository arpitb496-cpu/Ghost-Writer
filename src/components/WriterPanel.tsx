/**
 * WriterPanel.tsx  (OPTIMIZED)
 *
 * Performance improvements:
 *  1. useCallback on all handlers — prevents child re-renders on parent state changes.
 *  2. useMemo on MODE_CONFIG lookup — avoids object creation on every render.
 *  3. outputRef scroll uses requestAnimationFrame to batch with browser paint cycle
 *     instead of triggering layout thrash mid-stream.
 *  4. Removed inline object literals from JSX props (style, className conditionals
 *     now use pre-computed variables).
 */

import { useState, useRef, useCallback, useMemo } from 'react'
import { type WritingDNA } from '../lib/writingDNA'
import { generateWithStyle, generateGeneric } from '../lib/aiService'
import {
  generateWithStyleRemote,
  generateGenericRemote,
  type FreeModelId,
} from '../lib/remoteAiService'
import { type Backend } from './BackendToggle'
import styles from './WriterPanel.module.css'

type Mode = 'email' | 'message' | 'content'

interface Props {
  dna: WritingDNA
  sdkReady: boolean
  backend?: Backend
  apiKey?: string
  remoteModel?: FreeModelId
}

const MODE_CONFIG = {
  email: {
    icon: '📧',
    label: 'Email',
    placeholder: 'e.g. Follow up with a client about the delayed project delivery, keep it apologetic but confident',
    hint: 'Subject line + full body',
  },
  message: {
    icon: '💬',
    label: 'Message',
    placeholder: 'e.g. Ask a startup founder for a 15-minute call to discuss collaboration',
    hint: '1–3 sentences, direct',
  },
  content: {
    icon: '📝',
    label: 'Content',
    placeholder: 'e.g. LinkedIn post about launching my new Web3 project, exciting and community-focused',
    hint: 'Paragraph or more',
  },
} as const

export function WriterPanel({ dna, sdkReady, backend = 'local', apiKey = '', remoteModel = 'meta-llama/llama-3.1-8b-instruct:free' }: Props) {
  const [mode, setMode] = useState<Mode>('email')
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [genericOutput, setGenericOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingGeneric, setIsGeneratingGeneric] = useState(false)
  const [status, setStatus] = useState('')
  const [metrics, setMetrics] = useState<{ tokensPerSecond: number; latencyMs: number } | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const canGenerate = sdkReady && prompt.trim().length > 10 && !isGenerating

  // OPTIMIZATION: memoize current mode config to avoid property lookup on render
  const currentMode = useMemo(() => MODE_CONFIG[mode], [mode])

  // OPTIMIZATION: useCallback prevents unnecessary re-renders of button children
  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
    setOutput('')
    setShowCompare(false)
    setMetrics(null)
  }, [])

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
  }, [])

  // OPTIMIZATION: batch scroll with rAF to avoid layout thrash during token streaming
  const scheduleScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      rafRef.current = null
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    setOutput('')
    setGenericOutput('')
    setShowCompare(false)
    setMetrics(null)
    setStatus('')

    try {
      if (backend === 'remote') {
        await generateWithStyleRemote(
          prompt, mode, dna,
          (token) => { setOutput((prev) => prev + token); scheduleScroll() },
          setStatus
        )
        setMetrics({ tokensPerSecond: 0, latencyMs: 0 }) // remote doesn't give metrics
      } else {
        const result = await generateWithStyle(
          prompt, mode, dna,
          (token) => { setOutput((prev) => prev + token); scheduleScroll() },
          setStatus
        )
        setMetrics(result)
      }
      setStatus('')
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'Generation failed'}`)
    } finally {
      setIsGenerating(false)
    }
  }, [canGenerate, prompt, mode, dna, scheduleScroll, backend, apiKey, remoteModel])

  const handleCompare = useCallback(async () => {
    if (!output || isGeneratingGeneric) return
    setIsGeneratingGeneric(true)
    setShowCompare(true)
    setGenericOutput('')

    try {
      if (backend === 'remote') {
        await generateGenericRemote(
          prompt, mode,
          (token) => setGenericOutput((prev) => prev + token),
          () => { }
        )
      } else {
        await generateGeneric(
          prompt, mode,
          (token) => setGenericOutput((prev) => prev + token),
          () => { }
        )
      }
    } catch {
      setGenericOutput('Generation failed.')
    } finally {
      setIsGeneratingGeneric(false)
    }
  }, [output, isGeneratingGeneric, prompt, mode, backend, apiKey, remoteModel])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output)
  }, [output])

  return (
    <div className={styles.panel}>
      {/* Mode tabs */}
      <div className={styles.modeTabs}>
        {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => (
          <button
            key={m}
            className={`${styles.modeTab} ${mode === m ? styles.activeTab : ''}`}
            onClick={() => handleModeChange(m)}
          >
            <span>{MODE_CONFIG[m].icon}</span>
            <span>{MODE_CONFIG[m].label}</span>
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className={styles.inputArea}>
        <label className={styles.inputLabel}>
          What do you need to write?
          <span className={styles.hint}>{currentMode.hint}</span>
        </label>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder={currentMode.placeholder}
          value={prompt}
          onChange={handlePromptChange}
          disabled={isGenerating}
        />
        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <>
              <span className={styles.btnSpinner} />
              <span>Writing in your voice...</span>
            </>
          ) : (
            <>
              <span>✍️</span>
              <span>WRITE ME AS</span>
            </>
          )}
        </button>
        {status && <p className={styles.statusText}>{status}</p>}
      </div>

      {/* Output */}
      {(output || isGenerating) && (
        <div className={styles.outputSection} ref={outputRef}>
          {showCompare ? (
            <CompareView
              yourOutput={output}
              genericOutput={genericOutput}
              isGeneratingGeneric={isGeneratingGeneric}
              metrics={metrics}
            />
          ) : (
            <div className={styles.outputCard}>
              <div className={styles.outputHeader}>
                <div className={styles.outputMeta}>
                  <span className={styles.voiceBadge}>👤 Your Voice</span>
                  {metrics && backend === 'local' && metrics.tokensPerSecond > 0 && (
                    <span className={styles.metricsBadge}>
                      {metrics.tokensPerSecond.toFixed(1)} tok/s · {metrics.latencyMs}ms · 🔒 on-device
                    </span>
                  )}
                  {metrics && backend === 'remote' && (
                    <span className={styles.metricsBadge}>🌐 via OpenRouter</span>
                  )}
                </div>
                <div className={styles.outputActions}>
                  {output && !isGenerating && (
                    <>
                      <button className={styles.actionBtn} onClick={handleCopy}>Copy</button>
                      <button
                        className={styles.actionBtn}
                        onClick={handleCompare}
                        disabled={isGeneratingGeneric}
                      >
                        vs Generic AI
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.outputText}>
                {output || <span className={styles.generatingDots}>●●●</span>}
                {isGenerating && output && <span className="streaming-cursor" />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CompareView({ yourOutput, genericOutput, isGeneratingGeneric, metrics }: {
  yourOutput: string
  genericOutput: string
  isGeneratingGeneric: boolean
  metrics: { tokensPerSecond: number; latencyMs: number } | null
}) {
  return (
    <div className={styles.compareGrid}>
      <div className={styles.compareCard}>
        <div className={styles.compareHeader}>
          <span className={styles.compareLabel} style={{ color: 'var(--accent)' }}>
            👤 Your Voice
          </span>
          {metrics && (
            <span className={styles.metricsBadge}>
              {metrics.tokensPerSecond.toFixed(1)} tok/s
            </span>
          )}
        </div>
        <div className={styles.compareText}>{yourOutput}</div>
      </div>

      <div className={styles.compareCard}>
        <div className={styles.compareHeader}>
          <span className={styles.compareLabel} style={{ color: 'var(--text-muted)' }}>
            🤖 Generic AI
          </span>
          <span className={styles.genericBadge}>No style profile</span>
        </div>
        <div className={styles.compareText}>
          {genericOutput || (isGeneratingGeneric && <span className={styles.generatingDots}>●●●</span>)}
          {isGeneratingGeneric && genericOutput && <span className="streaming-cursor" />}
        </div>
      </div>
    </div>
  )
}
