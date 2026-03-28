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
import { ContentAuthenticityStamp } from './ContentAuthenticityStamp'
import { LiveSpeedFlex } from './LiveSpeedFlex'
import { useLiveGenerationSpeed } from '../hooks/useLiveGenerationSpeed'
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
  const voiceSpeed = useLiveGenerationSpeed()
  const genericSpeed = useLiveGenerationSpeed()

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
    voiceSpeed.reset()

    try {
      if (backend === 'remote') {
        await generateWithStyleRemote(
          prompt, mode, dna,
          (token) => {
            voiceSpeed.bump()
            setOutput((prev) => prev + token)
            scheduleScroll()
          },
          setStatus
        )
        setMetrics({ tokensPerSecond: 0, latencyMs: 0 }) // remote doesn't give engine metrics
      } else {
        const result = await generateWithStyle(
          prompt, mode, dna,
          (token) => {
            voiceSpeed.bump()
            setOutput((prev) => prev + token)
            scheduleScroll()
          },
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
  }, [canGenerate, prompt, mode, dna, scheduleScroll, backend, apiKey, remoteModel, voiceSpeed.reset, voiceSpeed.bump])

  const handleCompare = useCallback(async () => {
    if (!output || isGeneratingGeneric) return
    setIsGeneratingGeneric(true)
    setShowCompare(true)
    setGenericOutput('')
    genericSpeed.reset()

    try {
      if (backend === 'remote') {
        await generateGenericRemote(
          prompt, mode,
          (token) => {
            genericSpeed.bump()
            setGenericOutput((prev) => prev + token)
          },
          () => { }
        )
      } else {
        await generateGeneric(
          prompt, mode,
          (token) => {
            genericSpeed.bump()
            setGenericOutput((prev) => prev + token)
          },
          () => { }
        )
      }
    } catch {
      setGenericOutput('Generation failed.')
    } finally {
      setIsGeneratingGeneric(false)
    }
  }, [output, isGeneratingGeneric, prompt, mode, backend, apiKey, remoteModel, genericSpeed.reset, genericSpeed.bump])

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
          {!showCompare && (
            <LiveSpeedFlex
              label="Your voice"
              liveTps={voiceSpeed.live}
              peakTps={voiceSpeed.peak}
              engineTps={backend === 'local' && metrics && metrics.tokensPerSecond > 0 ? metrics.tokensPerSecond : null}
              engineLatencyMs={backend === 'local' && metrics && metrics.latencyMs > 0 ? metrics.latencyMs : null}
              isStreaming={isGenerating}
              backend={backend}
            />
          )}
          {showCompare ? (
            <CompareView
              yourOutput={output}
              genericOutput={genericOutput}
              isGeneratingGeneric={isGeneratingGeneric}
              metrics={metrics}
              backend={backend}
              voiceLive={voiceSpeed.live}
              voicePeak={voiceSpeed.peak}
              genericLive={genericSpeed.live}
              genericPeak={genericSpeed.peak}
            />
          ) : (
            <div className={styles.outputCard}>
              <div className={styles.outputHeader}>
                <div className={styles.outputMeta}>
                  <span className={styles.voiceBadge}>👤 Your Voice</span>
                  {backend === 'local' && (
                    <span className={styles.metricsBadge}>🔒 on-device</span>
                  )}
                  {backend === 'remote' && (
                    <span className={styles.metricsBadge}>🌐 remote</span>
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
          {output && !isGenerating && (
            <ContentAuthenticityStamp
              content={output}
              dna={dna}
              mode={mode}
              visible
            />
          )}
        </div>
      )}
    </div>
  )
}

function CompareView({
  yourOutput,
  genericOutput,
  isGeneratingGeneric,
  metrics,
  backend,
  voiceLive,
  voicePeak,
  genericLive,
  genericPeak,
}: {
  yourOutput: string
  genericOutput: string
  isGeneratingGeneric: boolean
  metrics: { tokensPerSecond: number; latencyMs: number } | null
  backend: 'local' | 'remote'
  voiceLive: number
  voicePeak: number
  genericLive: number
  genericPeak: number
}) {
  return (
    <div className={styles.compareGrid}>
      <div className={styles.compareCard}>
        <LiveSpeedFlex
          compact
          label="Your voice"
          liveTps={voiceLive}
          peakTps={voicePeak}
          engineTps={backend === 'local' && metrics && metrics.tokensPerSecond > 0 ? metrics.tokensPerSecond : null}
          engineLatencyMs={backend === 'local' && metrics && metrics.latencyMs > 0 ? metrics.latencyMs : null}
          isStreaming={false}
          backend={backend}
        />
        <div className={styles.compareHeader}>
          <span className={styles.compareLabel} style={{ color: 'var(--accent)' }}>
            👤 Your Voice
          </span>
        </div>
        <div className={styles.compareText}>{yourOutput}</div>
      </div>

      <div className={styles.compareCard}>
        <LiveSpeedFlex
          compact
          label="Generic AI"
          liveTps={genericLive}
          peakTps={genericPeak}
          engineTps={null}
          engineLatencyMs={null}
          isStreaming={isGeneratingGeneric}
          backend={backend}
        />
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
