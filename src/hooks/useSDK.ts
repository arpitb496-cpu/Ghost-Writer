/**
 * useSDK.ts
 *
 * React hook that manages the RunAnywhere SDK lifecycle.
 *
 * Why a hook? We need to track loading state (for UI feedback)
 * and errors (for graceful error display) — that's exactly what
 * React state is designed for.
 */

import { useState, useEffect } from 'react'
import { initSDK } from '../lib/runanywhere'

interface SDKState {
  /** True when SDK is fully initialized and ready to use */
  ready: boolean
  /** Error message if initialization failed */
  error: string | null
  /** Status message during initialization */
  status: string
}

export function useSDK(): SDKState {
  const [state, setState] = useState<SDKState>({
    ready: false,
    error: null,
    status: 'Initializing...',
  })

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        setState((s) => ({ ...s, status: 'Loading WASM engine...' }))
        await initSDK()

        if (!cancelled) {
          setState({ ready: true, error: null, status: 'Ready' })
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'SDK initialization failed'
          setState({ ready: false, error: msg, status: 'Failed' })
          console.error('SDK init error:', e)
        }
      }
    }

    init()

    // Cleanup: if component unmounts during init, don't update state
    return () => { cancelled = true }
  }, [])

  return state
}
