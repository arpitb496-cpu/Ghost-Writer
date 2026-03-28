# 👻 GhostWriter

> **Your voice. Your device. Forever private.**

GhostWriter is a local-first AI writing assistant that learns your personal writing style from your own documents — then writes emails, messages, and content that sounds like **you**, not like ChatGPT.

**Built for Monad Blitz 2026 · Problem Statement #1 (Web App)**

---

## ✨ What Makes It Special

- **Writing DNA** — Drop your old emails/notes and the AI extracts your unique style fingerprint
- **100% On-Device** — All AI inference via WebAssembly. Zero cloud. Zero uploads.
- **Style Mirror** — Side-by-side comparison: "Your Voice" vs "Generic AI"
- **Instant & Private** — Sub-100ms responses after first load. Your data never leaves your browser.
- **Offline Ready** — Works with no internet after models are cached

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your Groq API key
cp .env.example .env
# Edit .env and supply your API key

# 3. Run dev server (Frontend + Backend proxy)
npm run dev

# 4. Open http://localhost:5173
```

### 🐳 Running with Docker

```bash
# 1. Build the image
docker build -t ghostwriter .

# 2. Run the container
docker run -p 3000:3000 --env GROQ_API_KEY=your_key_here ghostwriter

# 3. Open http://localhost:3000
```

> **Note:** Requires Chrome or Edge (WebGPU/WASM support). Firefox coming soon.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Local AI | RunAnywhere Web SDK (`@runanywhere/web-llamacpp`) |
| Models | SmolLM2-135M (style extraction) + LFM2-350M (generation) |
| Framework | React 18 + Vite 5 |
| Language | TypeScript |
| PDF Parsing | pdfjs-dist (browser WASM) |
| Storage | localStorage + OPFS (Origin Private File System) |
| Backend API Security | Node.js (Express) Proxy |
| Deployment | Containerized (Docker) |

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── runanywhere.ts   # SDK init + model catalog
│   ├── writingDNA.ts    # Style profile type + persistence
│   ├── fileParser.ts    # Client-side PDF/TXT extraction
│   └── aiService.ts     # DNA extraction + generation
├── hooks/
│   └── useSDK.ts        # SDK state React hook
├── components/
│   ├── FileDropZone     # Drag-drop file input
│   ├── DNACard          # Writing DNA visualization
│   ├── WriterPanel      # 3-mode writing interface
│   └── ModelLoader      # Download progress display
└── App.tsx              # Main layout
```

---

## 🔒 Privacy

- All file reading uses browser FileReader API — no uploads
- AI models run via WebAssembly (compiled C++ llama.cpp)
- Writing DNA stored in `localStorage` on your device only
- Models cached in OPFS (browser's private file system)
- **Zero network requests during inference**

---


Built by **Hrithik** for Monad Blitz 2026  
Category: Web App · Problem #1 (AI-Powered Productivity Tools)  
SDK: [RunAnywhere](https://runanywhere.ai)
