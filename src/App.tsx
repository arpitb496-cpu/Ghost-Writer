/**
 * App.tsx - updated with remote LLM backend support
 */

import { useState, useCallback } from 'react'
import { useSDK } from './hooks/useSDK'
import { FileDropZone } from './components/FileDropZone'
import { DNACard } from './components/DNACard'
import { WriterPanel } from './components/WriterPanel'
import { ModelLoader } from './components/ModelLoader'

import { BackendToggle, type Backend } from './components/BackendToggle'
import { extractTextFromFile, truncateForContext } from './lib/fileParser'
import { extractWritingDNA } from './lib/aiService'
import {
  extractWritingDNARemote,
  loadApiKey,
  loadRemoteModel,
  isValidApiKey,
  type FreeModelId,
} from './lib/remoteAiService'
import { saveDNA, loadDNA, clearDNA, type WritingDNA } from './lib/writingDNA'
import styles from './App.module.css'
import { DynamicBackground } from './components/DynamicBackground'

export default function App() {
  const { ready: sdkReady, error: sdkError } = useSDK()

  const [dna, setDna] = useState<WritingDNA | null>(() => loadDNA())
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractStatus, setExtractStatus] = useState('')
  const [extractError, setExtractError] = useState('')
  const [loadedFileCount, setLoadedFileCount] = useState(0)

  const [backend, setBackend] = useState<Backend>(() =>
    isValidApiKey(loadApiKey()) ? 'remote' : 'local'
  )
  const [apiKey] = useState<string>(loadApiKey)
  const [remoteModel] = useState<FreeModelId>(loadRemoteModel)

  const remoteConfigured = true // HF key is hardcoded, always ready
  const isReady = backend === 'local' ? sdkReady : remoteConfigured

  const handleFilesLoaded = useCallback(
    async (files: File[]) => {
      if (backend === 'local' && !sdkReady) {
        setExtractError('On-device AI not ready yet — please wait')
        return
      }
      if (backend === 'remote' && !remoteConfigured) {
        setExtractError('Please configure your free OpenRouter API key below first')
        return
      }

      setIsExtracting(true)
      setExtractError('')
      setExtractStatus('Reading files...')

      try {
        const texts: string[] = []
        for (const file of files) {
          setExtractStatus(`Reading ${file.name}...`)
          const text = await extractTextFromFile(file)
          const trimmed = truncateForContext(text, 2000)
          if (trimmed.trim().length > 50) texts.push(trimmed)
        }

        if (texts.length === 0) {
          throw new Error('No readable text found. Try .txt or .md files.')
        }

        setLoadedFileCount((prev) => prev + files.length)
        setExtractStatus('Analyzing your writing style...')

        const extracted =
          backend === 'remote'
            ? await extractWritingDNARemote(texts, setExtractStatus)
            : await extractWritingDNA(texts, setExtractStatus)

        saveDNA(extracted)
        setDna(extracted)
        setExtractStatus('')
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : 'Failed to process files')
        setExtractStatus('')
      } finally {
        setIsExtracting(false)
      }
    },
    [backend, sdkReady, remoteConfigured, apiKey, remoteModel]
  )

  const handleClearDNA = useCallback(() => {
    clearDNA()
    setDna(null)
    setLoadedFileCount(0)
    setExtractError('')
  }, [])



  return (
    <div className={styles.app}>
      <DynamicBackground />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <img src="/ghost.jpeg" alt="GhostWriter Logo" className={styles.logoIcon} />

            <span className={styles.logoTagline}>Your voice. Your style. Your words.</span>

          </div>
          <div className={styles.headerBadges}>
            <span className={`${styles.badge} ${isReady ? styles.badgeGreen : styles.badgeOrange}`}>
              {backend === 'local'
                ? sdkReady ? '🟢 On-Device Ready' : '⏳ Loading AI...'
                : remoteConfigured ? '🟢 Remote AI Ready' : '🔑 Key Needed'}
            </span>
            <span className={`${styles.badge} ${styles.badgePrivate}`}>
              {backend === 'local' ? '🔒 Zero Cloud' : '🌐 OpenRouter Free'}
            </span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>

            <div className={styles.sidebarSection}>
              <h2 className={styles.sectionTitle}><span>⚙️</span> AI Backend</h2>
              <BackendToggle
                backend={backend}
                onChange={setBackend}
                localReady={sdkReady}
                remoteConfigured={remoteConfigured}
              />
            </div>

            {backend === 'remote' && (
              <div className={styles.sidebarSection}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                  ⚡ <strong style={{ color: 'var(--text-primary)' }}>Groq · Llama 3.1 8B</strong><br />
                  <span>Free · No credits needed · Browser ready</span>
                </div>
              </div>
            )}

            <div className={styles.sidebarSection}>
              <h2 className={styles.sectionTitle}><span>🧬</span> Your Writing DNA</h2>
              <p className={styles.sectionDesc}>
                Drop 2–3 samples of your writing — emails, notes, messages.
                {backend === 'local' && <> The AI learns your style <em>locally</em>. Nothing is uploaded.</>}
              </p>

              {backend === 'local' && !sdkReady && !sdkError && (
                <div className={styles.sdkLoading}>
                  <div className={styles.sdkSpinner} />
                  <span>Initializing on-device AI engine...</span>
                </div>
              )}

              {backend === 'local' && sdkError && (
                <div className={styles.errorBox}>
                  <strong>SDK Error:</strong> {sdkError}<br />
                  <small>Try Chrome/Edge with WebGPU, or switch to Remote AI.</small>
                </div>
              )}

              {backend === 'remote' && !remoteConfigured && (
                <div className={styles.errorBox}>Configure your free API key above to get started.</div>
              )}

              {(backend === 'remote' ? remoteConfigured : sdkReady) && (
                <>
                  <FileDropZone
                    onFilesLoaded={handleFilesLoaded}
                    isProcessing={isExtracting}
                    existingCount={loadedFileCount}
                  />
                  {extractStatus && (
                    <div className={styles.statusRow}>
                      <div className={styles.miniSpinner} />
                      <span>{extractStatus}</span>
                    </div>
                  )}
                  {extractError && <div className={styles.errorBox}>{extractError}</div>}
                </>
              )}
            </div>

            {dna && (
              <div className={styles.sidebarSection}>
                <DNACard dna={dna} onClear={handleClearDNA} />
              </div>
            )}

            {backend === 'local' && <ModelLoader />}

            <div className={styles.privacyCard}>
              {backend === 'local' ? (
                <>
                  <h4 className={styles.privacyTitle}>🔒 Privacy by Architecture</h4>
                  <ul className={styles.privacyList}>
                    <li>AI runs via WebAssembly in your browser</li>
                    <li>Your documents never leave this tab</li>
                    <li>Models cached locally after first download</li>
                    <li>Works 100% offline after setup</li>
                    <li>No API keys. No servers. No bills.</li>
                  </ul>
                </>
              ) : (
                <>
                  <h4 className={styles.privacyTitle}>⚡ Groq Info</h4>
                  <ul className={styles.privacyList}>
                    <li>Powered by Groq's free inference API</li>
                    <li>Llama 3.1 8B — fast &amp; high quality</li>
                    <li>No credit card required</li>
                    <li>14,400 free requests per day</li>
                    <li>Text is sent to Groq's servers</li>
                  </ul>
                </>
              )}
            </div>
          </aside>

          <section className={styles.writerSection}>
            {!dna ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✍️</div>
                <h2 className={styles.emptyTitle}>Drop your writing to get started</h2>
                <p className={styles.emptyDesc}>
                  GhostWriter needs to learn your style first.<br />
                  Add 2–3 samples on the left — emails, messages, anything you wrote.
                </p>
                <div className={styles.emptyExamples}>
                  <span>📧 Old emails</span>
                  <span>💬 WhatsApp exports</span>
                  <span>📝 Notes or journal</span>
                  <span>📄 LinkedIn posts</span>
                </div>
                <div className={styles.demoHint}>
                  <strong>No samples?</strong> Create a quick .txt file with a few sentences you'd normally write and drop it in.
                </div>
              </div>
            ) : (
              <div className={styles.writerWrapper}>
                <div className={styles.writerHeader}>
                  <h2 className={styles.writerTitle}>Write as Yourself</h2>
                  <p className={styles.writerSubtitle}>
                    Tell me what to write — I'll sound exactly like you.
                    {backend === 'remote' && <span style={{ color: 'var(--accent)' }}> · 🌐 Remote AI</span>}
                  </p>
                </div>
                <WriterPanel
                  dna={dna}
                  sdkReady={isReady}
                  backend={backend}
                  apiKey={apiKey}
                  remoteModel={remoteModel}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>GhostWriter · {backend === 'local' ? 'On-Device AI' : 'Remote Free LLM via OpenRouter'} · </span>
        <span className={styles.footerAccent}>Monad Blitz 2026</span>
      </footer>
    </div>
  )
}
