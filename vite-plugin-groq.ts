/**
 * Proxies POST /api/chat → Groq in the Vite dev/preview process.
 * Uses loadEnv() so VITE_GROQ_API_KEY / GROQ_API_KEY from project .env work without npm start.
 */

import type { Connect, PreviewServer, ViteDevServer } from 'vite'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { Readable } from 'stream'

function getGroqKey(mode: string, envDir: string): string {
  const e = loadEnv(mode, envDir, '')
  const strip = (v: string | undefined) => {
    if (v == null) return ''
    let s = v.trim()
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim()
    }
    return s
  }
  const k = strip(e.GROQ_API_KEY) || strip(e.VITE_GROQ_API_KEY)
  if (!k || k.startsWith('your_') || k === 'your_groq_api_key_here') return ''
  return k
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function installGroqMiddleware(
  middlewares: Connect.Server,
  mode: string,
  envDir: string
) {
  middlewares.use(async (req, res, next) => {
    const pathOnly = req.url?.split('?')[0] ?? ''
    if (pathOnly !== '/api/chat' || req.method !== 'POST') {
      return next()
    }

    const key = getGroqKey(mode, envDir)
    if (!key) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error:
            'Missing GROQ_API_KEY or VITE_GROQ_API_KEY in .env (project root). Get a key at https://console.groq.com — restart Vite after saving.',
        })
      )
      return
    }

    try {
      const body = await readBody(req)
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body,
      })

      const ct = groqRes.headers.get('content-type')
      if (ct) res.setHeader('Content-Type', ct)

      if (!groqRes.ok) {
        const text = await groqRes.text()
        res.statusCode = groqRes.status
        res.end(text)
        return
      }

      if (!groqRes.body) {
        res.statusCode = 500
        res.end('No response body from Groq')
        return
      }

      res.statusCode = groqRes.status
      Readable.fromWeb(groqRes.body as import('stream/web').ReadableStream).pipe(res)
    } catch (err) {
      console.error('[groq proxy]', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Groq proxy error' }))
      }
    }
  })
}

export function groqApiPlugin(): Plugin {
  return {
    name: 'groq-api-chat',
    configureServer(server: ViteDevServer) {
      const envDir = server.config.envDir
      installGroqMiddleware(server.middlewares, server.config.mode, envDir)
    },
    configurePreviewServer(server: PreviewServer) {
      const envDir = server.config.envDir
      installGroqMiddleware(server.middlewares, server.config.mode, envDir)
    },
  }
}
