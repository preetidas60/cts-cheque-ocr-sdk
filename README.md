# CTS Cheque OCR — Web Application & Batch Processor

Local and production-ready web application for **CTS Cheque OCR Verification** built with **Express.js (Node.js)**, **SQLite**, **React 19 (Vite)**, and **FastAPI / PaddleOCR Engine**.

---

## 🌟 Key Features

- ⚡ **Realtime NDJSON Streaming Batch Processor**: Upload multiple cheque files (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.bmp`) or specify a server folder path (`folderPath`) to automatically index and process batches.
- ⚙️ **Configurable OCR Service Endpoint**:
  - **Default Endpoint**: `http://localhost:8000`
  - **Environment Override**: Set `OCR_SERVICE_URL=https://your-deployed-ocr-service.com` in environment variables.
  - **In-UI Control**: Configure or switch to a deployed remote OCR model endpoint directly inside the UI dashboard or via `POST /api/cheques/config`.
- 🗄️ **Zero-Config SQLite Database**: Uses an embedded SQLite 3 database (`./data/cts_cheques.db`). Automatically initializes tables (`batches`, `cheque_records`) on server launch. Local runtime data is isolated and ignored by git (`.gitignore`).
- 🚀 **Parallel Worker Threads**: Concurrently process multiple cheques (1 to 8 threads) powered by Python multi-process pools.
- 📁 **Automated Storage Management**: Uploaded files and server folder items are automatically organized into batch directories (`./storage/BATCH-XXX/`).
- 📊 **Interactive Results & Export**: Color-coded confidence metrics (High / Medium / Low), interactive JSON viewer modal, and 1-click CSV/JSON data export.

---

## 🏗️ System Architecture & Layout

```
cts-cheque-ocr-sdk/
├── package.json              ← Root scripts (npm run dev, server, client:dev, client:build)
├── .env.example              ← Template environment configuration file
├── .env                      ← Local environment configuration file (PORT, OCR_SERVICE_URL)
├── README.md                 ← Overview and quick start guide
├── SETUP.md                  ← Comprehensive setup, architecture, and API documentation
│
├── server/                   ← Express Backend API (Node.js @ port 3000)
│   ├── index.js              → Express server entry point & disk auto-sync
│   ├── routes.js             → REST API endpoints (/api/cheques/process/stream, /batches, /config)
│   ├── db.js                 → SQLite database manager (data/cts_cheques.db)
│   ├── ocrWorker.js          → Background worker for OCR execution
│   ├── ocrServiceClient.js    → Outbound REST client to Python PaddleOCR engine
│   └── amountParser.js       → Indian currency format parser (Rs. 4,500/-)
│
├── client/                   ← React 19 + TypeScript UI (Vite @ port 5173/5174)
│   ├── components/
│   │   └── Workspace/
│   │       ├── BatchProcessorView.tsx → Realtime Batch Processor & Stream Dashboard
│   │       ├── Workspace.tsx          → Cheque Verification & Zoom Viewer
│   │       └── BatchListView.tsx      → Batch Overview & Stats
│   ├── styles/               → Modern dark-mode & glassmorphic custom CSS design system
│   └── batch_processor.html  → Standalone HTML version of Batch Processor Dashboard
│
├── data/                     ← Local SQLite database storage (cts_cheques.db)
├── storage/                  ← Automated batch directory storage (storage/BATCH-XXX)
└── ocr-service/              ← Python PaddleOCR Engine Service (FastAPI @ port 8000)
```

---

## ⚡ How to Run Locally

### 1. Start the Python OCR Service (Port 8000)
```bash
cd ocr-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start Backend & Frontend (Port 3000 & Port 5173)
In the project root directory:
```bash
npm install
npm run dev
```
- **React Frontend**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:5174`)
- **Express Backend API**: [http://localhost:3000/api/cheques](http://localhost:3000/api/cheques)
- **Standalone Dashboard HTML**: `client/batch_processor.html`

---

## 🌐 Configuring Deployed / Remote OCR Service URLs

By default, the application connects to the local OCR model engine running at `http://localhost:8000`. You can change this to point to a deployed/remote OCR engine in three ways:

### Option A: In the Frontend UI
Open the **Batch Upload & Realtime OCR** page in the web app. Under the **OCR Model Engine Endpoint (FastAPI / PaddleOCR)** input box, change `http://localhost:8000` to your remote URL (e.g. `https://ocr-api.yourdomain.com`).

### Option B: `.env` Environment File or Shell Variables
Copy `.env.example` to `.env` in the root directory and set your custom OCR Service URL:
```env
PORT=3000
OCR_SERVICE_URL=https://ocr-api.yourdomain.com
```
Or set `OCR_SERVICE_URL` in your shell environment:
```bash
export OCR_SERVICE_URL="https://ocr-api.yourdomain.com"
npm run server
```

### Option C: API Configuration Endpoint
Send a POST request to update the active OCR service URL dynamically:
```bash
curl -X POST http://localhost:3000/api/cheques/config \
  -H "Content-Type: application/json" \
  -d '{"ocrServiceUrl": "https://ocr-api.yourdomain.com"}'
```

---

## 🗄️ Database Architecture & Version Control

### What Database is Used?
The application uses **SQLite 3** (`sqlite3`), an embedded, serverless, file-based relational database.

### How It Works:
- **Zero Installation / Zero Setup**: SQLite requires no separate server process, username, password, or daemon to install.
- **Auto-Initialization**: On server launch (`npm run dev` or `npm run server`), [server/db.js](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/server/db.js) automatically creates the `./data/` directory and initializes `./data/cts_cheques.db`.
- **Database Schema**:
  - `batches`: Tracks batch ID, storage path, status, progress counters, processing times, and total amounts.
  - `cheque_records`: Tracks individual cheque OCR results (account number, holder name, date, amounts, confidence scores, verification status, worker duration).

### Do I Have to Push the `data/` Folder to Git?
**NO.** You do **not** need to push the `data/` folder or `.env` to Git:
- `./data/` and `./data/cts_cheques.db` are **gitignored** in `.gitignore` because they contain local runtime state generated during testing/operation.
- When another developer clones the repository and runs `npm run dev`, SQLite will automatically create a fresh `./data/cts_cheques.db` database on their machine.

---

Refer to [SETUP.md](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/SETUP.md) for full setup instructions, API specs, and technical details.
