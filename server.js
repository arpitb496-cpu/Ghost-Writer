import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env next to server.js (cwd can differ when started via IDE / PM2 / another drive)
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });
if (existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });

/** Groq key: GROQ_API_KEY or VITE_GROQ_API_KEY (same file many editors use for Vite). */
function getGroqApiKey() {
  const strip = (v) => {
    if (v == null) return '';
    let s = String(v).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
    return s;
  };
  const k = strip(process.env.GROQ_API_KEY) || strip(process.env.VITE_GROQ_API_KEY);
  if (!k || k.startsWith('your_') || k === 'your_groq_api_key_here') return '';
  return k;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Secure API Route to proxy requests to Groq
app.post('/api/chat', async (req, res) => {
  try {
    const GROQ_API_KEY = getGroqApiKey();

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error:
          'Server configuration error: add GROQ_API_KEY or VITE_GROQ_API_KEY to .env in the project root (same folder as server.js), then restart: npm start',
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    // Stream the response back to the client
    import('stream').then(({ Readable }) => {
      // In native Node fetch, response.body is a Web ReadableStream not a Node stream
      Readable.fromWeb(response.body).pipe(res);
    });
  } catch (error) {
    console.error('Error proxying request to Groq:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve frontend build files in production
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback for React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  const ok = getGroqApiKey();
  console.log(`[groq] API key loaded: ${ok ? 'yes' : 'no'} (from ${existsSync(envPath) ? '.env' : 'no .env file'} at ${envPath})`);
  if (!ok) {
    console.warn('[groq] Add GROQ_API_KEY or VITE_GROQ_API_KEY to .env — https://console.groq.com');
  }
});
