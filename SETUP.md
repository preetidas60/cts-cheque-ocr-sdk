# SETUP.md — Full Setup, Architecture, and Configuration Guide

This guide covers running the **CTS Cheque OCR Verification System** locally and in production environments (Node.js/Express backend, SQLite database, React 19 frontend, and Python PaddleOCR service).

---

## 1. System Architecture Overview

The system consists of four decoupled layers:

```
┌────────────────────────────────┐       HTTP / REST API       ┌────────────────────────────────┐
│       React 19 Frontend        ├────────────────────────────►│       Node.js Express API      │
│  (Vite @ localhost:5173/5174)  │◄────────────────────────────┤    (Server @ localhost:3000)   │
└────────────────────────────────┘     NDJSON / JSON Stream    └───────────────┬────────────────┘
                                                                               │
                                                    SQLite Storage             │  REST Calls
                                                   (data/cts_cheques.db)       │  OCR_SERVICE_URL
                                                                               ▼
                                                               ┌────────────────────────────────┐
                                                               │       Python OCR Service       │
                                                               │  (FastAPI @ localhost:8000 or  │
                                                               │   remote deployed URL endpoint)│
                                                               └────────────────────────────────┘
```

### Component Roles:
1. **Frontend (`client/`)**: Modern React 19 + TypeScript UI built with Vite. Provides live NDJSON batch streaming, cheque list tree view, high-resolution cheque image viewer with zoom/pan, confidence metrics, OCR model endpoint configuration, and account number verification.
2. **Backend Server (`server/`)**: Express.js REST API server. Handles batch ingestion, NDJSON streaming, storage directory management (`storage/BATCH-XXX`), SQLite persistence, account verification, and background worker thread execution.
3. **Database (`data/cts_cheques.db`)**: Local SQLite database storing `batches` and `cheque_records`.
4. **Python OCR Service (`ocr-service/`)**: FastAPI + PaddleOCR engine service that accepts cheque files, pre-warms worker engine pools (`POST /pool/ensure`), extracts text fields (Account Number, Holder Name, Date, Amounts), calculates confidences, and returns structured OCR data.

---

## 2. Environment Requirements

| Requirement | Purpose | Command to Check |
|---|---|---|
| **Node.js 18+ & npm** | Express backend server and React Vite frontend | `node -v` |
| **Python 3.10 / 3.11** | Python PaddleOCR Service | `python3 --version` |
| **PaddleOCR & PyMuPDF** | OCR text extraction and PDF rendering engine | Installed in virtualenv |

---

## 3. Quick Start (Running Everything)

### Step 1: Start the Python OCR Service
In terminal 1:
```bash
cd ocr-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
*(The local OCR service will be live at `http://localhost:8000`)*

### Step 2: Install Node Dependencies
In terminal 2 (at project root):
```bash
npm install
```

### Step 3: Start Backend & Frontend Together
In terminal 2 (at project root):
```bash
npm run dev
```
This runs `concurrently` to start:
- **Express Backend**: `http://localhost:3000`
- **React Dev Server**: `http://localhost:5173` (or `http://localhost:5174`)

Open **`http://localhost:5173`** in your browser!

---

## 4. Configuring the OCR Model Service URL

By default, the backend connects to the local OCR model service at `http://localhost:8000`. You can configure it to point to a deployed/remote instance (e.g. `https://ocr-engine.yourdomain.com`):

### Option A: In the Frontend UI
1. Open the web app and click **Batch Upload & Realtime OCR** in the sidebar.
2. Locate the **OCR Model Engine Endpoint (FastAPI / PaddleOCR)** input box.
3. Enter your remote service URL (e.g. `https://ocr-engine.yourdomain.com`).
4. Click **Process Cheques**. The backend will automatically send all OCR requests for that batch to your specified service URL.

### Option B: Environment File (`.env`) & Variables (`OCR_SERVICE_URL`)
Copy `.env.example` to `.env` in the root project folder:
```bash
cp .env.example .env
```
Edit `.env` and set `OCR_SERVICE_URL`:
```env
PORT=3000
OCR_SERVICE_URL=https://ocr-engine.yourdomain.com
```
Or set `OCR_SERVICE_URL` in your shell before launching the server:
```bash
export OCR_SERVICE_URL="https://ocr-engine.yourdomain.com"
npm run dev
```

### Option C: API Endpoint (`POST /api/cheques/config`)
Update the default OCR model URL globally on the Express backend via REST:
```bash
curl -X POST http://localhost:3000/api/cheques/config \
  -H "Content-Type: application/json" \
  -d '{"ocrServiceUrl": "https://ocr-engine.yourdomain.com"}'
```

---

## 5. Parallel Processing & Worker Threads

The application includes a **Parallel Files / Worker Threads** slider (1 to 8 threads).

### How it Works:
1. **Engine Pool Pre-warming**: When a batch begins, the backend sends a request to `${OCR_SERVICE_URL}/pool/ensure` to pre-warm a Python process pool of size `workerThreads`.
2. **Concurrent Chunking**: Cheques in the batch queue are chunked and executed concurrently up to `workerThreads` in parallel.
3. **Speedup**: Processing 5 cheques drops from ~11s (sequential 1 thread) to ~3.5s (parallel 4 threads).

---

## 6. Available NPM Scripts

| Command | Action |
|---|---|
| `npm run dev` | **Runs Express Server (:3000) + React Vite Dev Server (:5173) concurrently** |
| `npm run server` | Starts only the Express Backend API (`node server/index.js`) |
| `npm run client:dev` | Starts only the React Vite dev server (`http://localhost:5173`) |
| `npm run client:build` | Compiles production bundle of React frontend into `client/dist/` |
| `npm start` | Alias for `npm run server` |

---

## 7. Directory Structure & Key Files

```
cts-cheque-ocr-sdk/
├── package.json              ← Unified dependencies & scripts for backend & frontend
├── .env.example              ← Template environment configuration file
├── .env                      ← Local environment configuration file (PORT, OCR_SERVICE_URL)
├── README.md                 ← Project overview and specification summary
├── SETUP.md                  ← This setup, architecture, and run guide
│
├── server/                   ← Express Backend Server (Node.js)
│   ├── index.js              → Express server entry point & disk auto-sync
│   ├── routes.js             → API endpoints (/process/stream, /batches, /config, /verify)
│   ├── db.js                 → SQLite database setup & queries (data/cts_cheques.db)
│   ├── ocrWorker.js          → Background worker picking up PENDING cheques for OCR
│   ├── ocrServiceClient.js    → Outbound REST client supporting dynamic OCR service URLs
│   └── amountParser.js       → Safe amount parsing for Indian currency formats
│
├── client/                   ← React 19 + TypeScript Frontend (Vite)
│   ├── index.html            → Main HTML entry point
│   ├── batch_processor.html  → Standalone HTML dashboard page
│   ├── components/
│   │   └── Workspace/
│   │       ├── BatchProcessorView.tsx → Realtime Batch Processor & Stream Dashboard
│   │       ├── Workspace.tsx          → Cheque Verification & Zoom Viewer
│   │       └── BatchListView.tsx      → Batch Overview & Stats
│   ├── styles/               → Modern dark-mode custom CSS design system
│   └── hooks/                → Polling & verification hooks
│
├── data/                     ← Local SQLite database storage (cts_cheques.db)
├── storage/                  ← Automated batch directory storage (storage/BATCH-XXX)
└── ocr-service/              ← Python PaddleOCR Engine Service (FastAPI)
```

---

## 9. Database Architecture & Git Rules

### Database Engine: SQLite 3
The backend relies on **SQLite 3** (`sqlite3` npm package) to persist batch state and extracted cheque metadata into `./data/cts_cheques.db`.

### Automatic Schema Management:
- No migration scripts or database installation required.
- On startup, [server/db.js](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/server/db.js) ensures `./data/` exists and runs `CREATE TABLE IF NOT EXISTS batches` and `CREATE TABLE IF NOT EXISTS cheque_records`.

### Version Control (Git Rules):
- **Should `data/` be pushed to Git?**: **NO.** The `./data/` directory and `.env` file are explicitly listed in `.gitignore`.
- Every developer or server environment auto-generates its own local `data/cts_cheques.db` file upon starting the application.
- Uploaded files in `storage/` are also gitignored (except `storage/.gitkeep` to preserve the folder structure).

