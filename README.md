# Deep Research Autonomous Agent

> **Production-grade autonomous AI research engine with a zero-cost architecture, local Ollama and Google Gemini fallback, multi-source web extraction, pgvector HNSW semantic retrieval, and multi-format academic reporting.**

---

## 📌 Overview

**Deep Research Autonomous Agent** is an autonomous intelligence pipeline designed to automate multi-hop information synthesis. It decomposes complex user inquiries into targeted sub-queries, crawls multiple public and academic databases, extracts and sanitizes passages, indexes text into 768-dimensional vector embeddings, and generates publication-grade intelligence reports with verified inline citations.

### Key Highlights
- **Zero Recurring API Cost**: Runs on local hardware via **Ollama** (`qwen2.5`, `llama3.1`, `nomic-embed-text`) with automatic fallback to **Google Gemini 3.8 Flash** free tier.
- **Multi-Source Ingestion**: Queries 7 data providers simultaneously—DuckDuckGo, Wikipedia, ArXiv preprints, Hacker News, Reddit, GitHub, and Tavily.
- **Real-Time Reasoning Stream**: Server-Sent Events (SSE) stream the autonomous agent's thinking timeline, sub-queries, and sources in real time.
- **Academic & Multi-Format Exports**: One-click generation of PDF reports, BibTeX (`.bib`) files, APA 7th / IEEE citations, structured JSON archives, and standalone offline HTML.

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────┐
                    │    User Research Query  │
                    └────────────┬────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │  Query Decomposition & Planning Agent │
             │   (Local Ollama / Gemini 3.8 Flash)   │
             └───────────────────┬───────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     [Academic Preprints]   [Open Web & News]    [Developer Consensus]
        ArXiv / Wikipedia    DuckDuckGo / Tavily   Reddit / HN / GitHub
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │  Cheerio HTML Sanitizer & Extractor   │
             │ (strips boilerplate, ads, navigation) │
             └───────────────────┬───────────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │    Sliding-Window Text Chunker        │
             │   (400-char overlapping passages)     │
             └───────────────────┬───────────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │    768-Dim Vector Embedding Store     │
             │    (PostgreSQL pgvector / HNSW <=>)   │
             └───────────────────┬───────────────────┘
                                 │
                                 ▼
             ┌───────────────────────────────────────┐
             │   Grounded Synthesis & Report Engine  │
             │     - Inline Citation Hover Cards     │
             │     - Comparative Trade-off Matrix    │
             │     - Fact-Checking Claim Inspector   │
             │     - Interactive Knowledge Graph     │
             └───────────────────┬───────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     [Interactive Report]   [PDF / BibTeX Export]  [Audio Briefing TTS]
```

---

## 🚀 Key Features

### 1. 📄 Interactive Synthesized Report with Citation Cards
- Verified inline citation badges (e.g., `[1]`, `[2]`).
- Hovering over any citation reveals an **unboxed provenance card** showing source title, extracted passage, domain credibility score, and original URL.
- Hydration-safe rendering adhering strictly to HTML phrasing standards.

### 2. 🕸️ Interactive Knowledge Graph & Topic Mindmap
- Visual multi-orbit SVG node-link graph mapping:
  - **Center Node**: Root research inquiry.
  - **Orbit 1**: Decomposed sub-queries and hypotheses.
  - **Orbit 2**: Discovered sources and web domains.
  - **Orbit 3**: Thematic concepts and comparative dimensions.
- Pan, zoom, entity filtering (`All`, `Sub-queries`, `Sources`, `Concepts`), and node detail inspection.

### 3. ⚖️ Trade-off Matrix & Fact-Checking Claim Inspector
- **Structured Comparative Matrix**: Side-by-side trade-off evaluations (architecture, retrieval strategy, data ingestion, operational footprint).
- **Fact-Checking Meter**: Categorizes extracted claims into:
  - 🟢 **Multi-Source Verified** (confirmed across 2+ independent search engines)
  - 🔵 **Empirical Academic** (primary research papers)
  - 🟡 **Community Consensus** (engineering discussions from Hacker News / Reddit)

### 4. 🎙️ Executive Audio Briefing (Zero-Cost Web Speech TTS)
- Native client-side speech synthesis using the browser's `window.speechSynthesis`.
- Play, pause, resume, stop, and speed toggles ($0.75\times, 1.0\times, 1.25\times, 1.5\times$).
- Real-time sentence display with animated voice wave bars.

### 5. 💬 Grounded Follow-up Q&A Chat Session
- Interrogate extracted vector passages after report synthesis.
- Conversational chat history tracking user questions, agent responses, timestamps, and citations.
- Pre-populated prompt chips for quick exploration.

### 6. 🗂️ Academic & Multi-Format Exporter
- **Publication PDF**: Clean vector layout with metadata, table of contents, and references via `jspdf`.
- **BibTeX (`.bib`)**: LaTeX-ready citations formatted for Overleaf, Zotero, and Mendeley.
- **APA 7th & IEEE**: Formatted bibliography text copied with one click.
- **Structured JSON Archive**: Complete snapshot of the inquiry, sources, chunks count, thinking steps, and Q&A history.
- **Standalone Offline HTML**: Self-contained styled report with embedded styling for offline sharing.

### 7. 📚 Research Library & Session Persistence
- Slide-over history drawer storing past investigations.
- Merges backend job records with browser `localStorage` for offline session persistence across refreshes.
- Search and filter by query keyword or depth.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript | Reactive single-page application |
| **Build & Tooling** | Vite 8, Tailwind CSS v4 | High-performance build & styling |
| **Icons & Typography** | Lucide React, Plus Jakarta Sans, JetBrains Mono | Production UI with tabular numerals |
| **Markdown & PDF** | React Markdown, jsPDF | Report rendering & publication export |
| **Backend Server** | Node.js, Express, TSX | Full-stack API & SSE streaming proxy |
| **Web Scraping** | Cheerio | Resilient DOM parsing & boilerplate stripping |
| **Vector Database** | PostgreSQL, pgvector, Drizzle ORM | 768-dim HNSW cosine distance (`<=>`) retrieval |
| **Local Inference** | Ollama (`qwen2.5`, `llama3.1`, `nomic-embed-text`) | Zero-cost local execution |
| **Cloud Fallback** | Google GenAI SDK (`gemini-3.8-flash`) | Zero-cost cloud fallback |

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- *(Optional)* **Ollama**: For 100% offline local inference

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/deep-research-agent.git
   cd deep-research-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Add your Google Gemini API key (optional if using local Ollama):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   ```

4. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🦙 (Optional) Local Ollama Setup

To run the entire pipeline locally without external API calls:

1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull the recommended reasoning and embedding models:
   ```bash
   ollama pull qwen2.5:7b
   ollama pull nomic-embed-text
   ```
3. Start the Ollama daemon:
   ```bash
   ollama serve
   ```
4. The Deep Research dashboard will automatically detect local Ollama availability on `http://127.0.0.1:11434` and display the **Online** status indicator.

---

## 📡 API Reference

### `POST /api/research/dispatch`
Dispatches a new autonomous research job.
```json
{
  "query": "PostgreSQL pgvector vs specialized vector databases",
  "depth": "standard",
  "reportStyle": "academic",
  "sourcesConfig": ["duckduckgo", "wikipedia", "arxiv", "hackernews", "reddit", "github"],
  "preferredModel": "auto"
}
```
**Response**: `{ "jobId": "job-abc123" }`

### `GET /api/research/stream/:jobId`
Server-Sent Events (SSE) connection streaming real-time pipeline events:
- `init`: Job configuration & metadata
- `thinking`: Reasoning steps and sub-query dispatches
- `source_found`: Verified web/academic sources discovered
- `progress`: Pipeline completion percentage ($0 - 100\%$)
- `complete`: Final synthesized markdown report and citation ledger

### `POST /api/research/ask`
Submits a follow-up inquiry grounded on vector-indexed passages.
```json
{
  "jobId": "job-abc123",
  "question": "What are the primary memory overhead trade-offs of HNSW indexing?"
}
```

### `GET /api/research/jobs`
Returns a list of recent research jobs stored in the database.

### `GET /api/ollama/status`
Checks connectivity to the local Ollama instance and returns installed models.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
