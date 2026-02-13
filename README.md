# Iron Man — Stark Viewer

> Upload a document. Extract its knowledge. Hold it in your hands.

Inspired by Tony Stark's holographic interface — where a physical file becomes an interactive, explorable 3D knowledge space. This system ingests documents (PDF, CSV, TXT), extracts structured knowledge using an LLM, builds a graph, and renders it as an interactive 3D visualization you can select, rotate, expand, and explode.

Long-term goal: gesture-controlled spatial computing interface powered by hand tracking.

---

## Philosophy

If a tool doesn't:
- reduce cognitive load
- make thinking faster
- feel deterministic

…it does not belong in this project.

---

## Current Status

**Version 0.2 — Research Paper Summarization Engine**

- [x] Three.js scene with lighting, camera, orbit controls
- [x] Multi-part 3D object (stacked box layers)
- [x] Raycasting-based object selection with outline highlight
- [x] Keyboard-triggered explode/collapse animation (`E` key)
- [x] Post-processing pipeline (OutlinePass)
- [x] Responsive resize handling
- [x] PDF ingestion backend (FastAPI + pdfplumber)
- [x] Section detection from research papers
- [x] Intelligent chunking for large PDFs (400+ pages)
- [x] Hierarchical summarization via Google Gemini 2.5 Flash (free)
- [x] Structured extraction: title, problem, methodology, contributions, limitations, future work
- [x] Per-section summaries with key points and key terms
- [ ] Frontend UI for upload + results display
- [ ] 2D concept graph visualization
- [ ] 3D spatial graph rendering
- [ ] Hand tracking / gesture control

---

## Architecture

```
INPUT LAYER                    INTELLIGENCE LAYER              SPATIAL ENGINE
─────────────                  ────────────────────            ──────────────
PDF / CSV / TXT                Gemini (structured JSON only)   Deterministic math
Camera → OpenCV → OCR (v0.2)   Entity extraction               Clustering rules
                                Relationship detection          Distance logic
        ↓                              ↓                       Importance weighting
   Text chunks              Knowledge Graph (nodes + edges)         ↓
                                       ↓                     3D Layout Engine
                                  Graph Builder                    ↓
                                       ↓                     Three.js Renderer
                               FastAPI REST endpoints              ↓
                                                             Interaction Layer
                                                          (mouse → gesture later)
```

### Core Principle

```
The system is NOT:  files → UI
The system IS:      knowledge → space
```

---

## Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| **Frontend** | Three.js, Vite, Vanilla JS | 3D rendering, interaction, post-processing |
| **Backend** | FastAPI, Python | REST API, file ingestion, LLM orchestration |
| **PDF Parsing** | pdfplumber | Clean text extraction from PDFs |
| **LLM** | Google Gemini 2.5 Flash (free) | Structured summarization + entity extraction (JSON only) |
| **Graph** | In-memory Python graph (Neo4j later) | Knowledge graph: nodes, edges, metadata |
| **Spatial Logic** | Pure math, graph algorithms | Layout, clustering, distance, importance |
| **Hand Tracking** | MediaPipe + OpenCV (v0.3+) | Gesture recognition for grab, rotate, explode |
| **OCR** | Tesseract / EasyOCR (v0.2+) | Camera-based document scanning |

---

## Project Structure (Target)

```
stark-viewer/
│
├── backend/
│   ├── main.py              # FastAPI server — /upload and /analyze endpoints
│   ├── pdf_extractor.py     # PDF text extraction + section detection
│   ├── summarizer.py        # Hierarchical summarization via Gemini
│   ├── requirements.txt
│   ├── .env.example          # API key template
│   └── README.md             # Backend-specific setup guide
│
├── src/
│   ├── main.js              # Three.js scene, rendering, interaction
│   └── style.css
│
├── index.html
├── package.json
└── README.md
```

---

## Roadmap

### Phase 1 — Core Pipeline (v0.1) ✅
- [x] Backend: `POST /upload` → accept PDF, return extracted text + detected sections
- [x] Chunker: split text by section headings/paragraphs (not token count)
- [x] Gemini Parser: extract structured summary → JSON
- [x] Backend: `POST /analyze` → return full structured analysis
- [ ] Frontend: upload UI + structured results display
- [ ] Frontend: fetch analysis, render as 2D concept map
- [ ] Basic interaction: click node → show metadata, drag, zoom

### Phase 2 — 3D Spatial Engine (v0.2)
- [ ] Replace 2D graph with Three.js 3D force-directed layout
- [ ] Node sizing by degree centrality
- [ ] Cluster detection and spatial grouping
- [ ] Smooth transitions and easing functions
- [ ] Camera input: OpenCV preprocessing → OCR → text pipeline
- [ ] Clipping planes / transparency for "reveal inside" mechanic

### Phase 3 — Gesture Control (v0.3)
- [ ] MediaPipe hand tracking via webcam
- [ ] Gesture mapping: pinch-to-select, spread-to-explode, rotate
- [ ] WebSocket bridge: Python gesture server → JS frontend
- [ ] Exponential smoothing, debounce, min/max clamping
- [ ] Two-hand distance → object scale factor

### Phase 4 — Polish & Expand (v1.0)
- [ ] Multi-document support
- [ ] Persistent graph storage (Neo4j)
- [ ] Time-axis (Z) for temporal data
- [ ] Uncertainty → opacity mapping
- [ ] Session history and state management

---

## LLM Output Contract

Gemini must always return structured JSON. No prose. No freeform.

**Section summary format:**
```json
{
  "summary": "...",
  "key_points": ["..."],
  "key_terms": ["..."]
}
```

**Global analysis format:**
```json
{
  "inferred_title": "...",
  "global_summary": "...",
  "problem_statement": "...",
  "methodology": "...",
  "key_contributions": ["..."],
  "limitations": ["..."],
  "future_work": ["..."],
  "all_key_terms": ["..."]
}
```

---

## Interaction Model

**v0.1 — Mouse (mandatory first)**
- Click → select object/node
- Drag → rotate view
- Scroll → zoom
- `E` key → explode/collapse

**v0.3 — Gesture (earned, not assumed)**
- Hand spread → scale/explode object
- Pinch → grab/select
- Rotate wrist → rotate object
- Hands apart distance = scaling factor

```
scale_multiplier = current_hand_distance / initial_hand_distance
object.scale.set(s, s, s)
```

---

## Performance Rules

- 60 FPS or don't ship
- Async processing for all ingestion
- Progressive rendering for large graphs
- If the system pauses to "think", the illusion breaks

---



## Getting Started

### Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Click objects to select. Press `E` to explode/collapse.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Get a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then:

```bash
copy .env.example .env
# Add your GEMINI_API_KEY to .env
uvicorn main:app --reload
```

API docs at `http://127.0.0.1:8000/docs`.

---

