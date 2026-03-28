import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Secure API Route to proxy requests to Groq
app.post('/api/chat', async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY is not set.' });
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
});
