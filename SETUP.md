# SETUP.md — ServiceNow SDK & Standalone Setup Guide

This guide covers running and deploying the **CTS Cheque OCR Verification System** using the **ServiceNow SDK (Fluent)** architecture.

---

## 1. System Architecture & ServiceNow SDK Organization

The system is organized into a clean **ServiceNow SDK Compliant Structure**:

```
                               ┌─────────────────────────────────────────┐
                               │             now.config.json             │
                               │        (Scope: x_snc_cheque_ocr)        │
                               └────────────────────┬────────────────────┘
                                                    │
        ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
        ▼                                           ▼                                           ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐       ┌───────────────────────────────┐
│          src/client/          │       │          src/fluent/          │       │          src/server/          │
│   (Next Experience / React)   │       │   (ServiceNow Fluent DSL)     │       │    (Modular Backend Logic)    │
│                               │       │                               │       │                               │
│  - BatchProcessorView.tsx     │       │  - cheque_batch.now.ts        │       │  - index.js (Express API)     │
│  - Workspace / Cheque Viewer  │       │  - cheque_record.now.ts       │       │  - routes.js (REST Stream)    │
│  - Dark CSS & Styling         │       │  - cheque_verification.now.ts │       │  - ocrServiceClient.js        │
└───────────────────────────────┘       └───────────────────────────────┘       └───────────────────────────────┘
```

### Layer Roles:
1. **ServiceNow Manifest (`now.config.json`)**: Configures application metadata scope (`x_snc_cheque_ocr`), version, and directory pointers for `fluentDir` (`src/fluent`), `serverModulesDir` (`src/server`), and `clientDir` (`src/client`).
2. **Fluent Layer (`src/fluent/`)**: Uses ServiceNow Fluent TypeScript (`.now.ts`) to declaratively define application metadata (tables `x_snc_cheque_ocr_batch` & `x_snc_cheque_ocr_record`, Business Rules, Forms, ACLs).
3. **Client Layer (`src/client/`)**: Holds front-end UI views, React 19 components, dark-mode CSS styling, interactive NDJSON stream readers, and cheque image viewers.
4. **Server Layer (`src/server/`)**: Houses modular server-side logic, Express.js REST API routes, background OCR queue worker pool, and dynamic OCR service integrations.

---

## 2. Environment Requirements

| Requirement | Purpose | Command to Check |
|---|---|---|
| **ServiceNow SDK (`@servicenow/sdk`)** | ServiceNow Fluent compilation & platform deployment | `now-sdk --version` |
| **Node.js 18+ & npm** | Express backend server and React Vite frontend | `node -v` |
| **Python 3.10 / 3.11** | Python PaddleOCR Service | `python3 --version` |

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
- **Express Backend**: `http://localhost:3000`
- **React Dev Server**: `http://localhost:5173`

---

## 4. Deploying / Building with ServiceNow SDK

To build and validate ServiceNow Fluent metadata using the ServiceNow SDK CLI:

```bash
# Build ServiceNow Fluent metadata (.now.ts -> XML app package)
npx now-sdk build

# Deploy package directly to ServiceNow Instance
npx now-sdk deploy
```

---

## 5. Configuring the OCR Model Service URL

By default, the backend connects to the local OCR model service at `http://localhost:8000`. You can configure it to point to a deployed/remote instance (e.g. `https://ocr-engine.yourdomain.com`):

### Option A: In the Frontend UI
1. Open the web app and click **Batch Upload & Realtime OCR** in the sidebar.
2. Locate the **OCR Model Engine Endpoint (FastAPI / PaddleOCR)** input box.
3. Enter your remote service URL (e.g. `https://ocr-engine.yourdomain.com`).
4. Click **Process Cheques**.

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

---

## 6. Directory Structure & Key Files

```
cts-cheque-ocr-sdk/
├── now.config.json           ← ServiceNow SDK Manifest
├── package.json              ← Unified dependencies & scripts
├── .env.example              ← Template environment configuration file
├── .env                      ← Local environment configuration file
├── README.md                 ← Project overview & ServiceNow setup
├── SETUP.md                  ← This setup & architecture guide
│
├── src/
│   ├── fluent/               ← ServiceNow Fluent (.now.ts) Metadata & UX Definitions
│   │   ├── index.now.ts      → Main Fluent export
│   │   ├── tables/
│   │   │   ├── cheque_batch.now.ts  → x_snc_cheque_ocr_batch definition
│   │   │   └── cheque_record.now.ts → x_snc_cheque_ocr_record definition
│   │   └── business-rules/
│   │       └── cheque_verification.now.ts → Verification Business Rule
│   │
│   ├── client/               ← React 19 + TypeScript UI (Vite)
│   │   ├── index.html        → Main React entry point
│   │   ├── batch_processor.html → Standalone HTML Batch Processor Dashboard
│   │   ├── components/       → Workspace, BatchProcessorView, Sidebar, TopBar
│   │   ├── styles/           → Dark-mode custom CSS system
│   │   ├── dist/             → Compiled client bundle (tracked by Git)
│   │   └── data/             → Frontend source data (tracked by Git)
│   │
│   └── server/               ← Express Backend Server (Node.js)
│       ├── index.js          → Express server entry point & storage auto-sync
│       ├── routes.js         → API endpoints (/process/stream, /batches, /config)
│       ├── db.js             → SQLite database setup & queries (data/cts_cheques.db)
│       ├── ocrWorker.js      → Background worker pool
│       └── ocrServiceClient.js → Dynamic REST client connecting to OCR Engine
│
├── data/                     ← Local SQLite database storage (gitignored)
├── storage/                  ← Automated batch directory storage (gitignored)
└── ocr-service/              ← Python PaddleOCR Engine Service (FastAPI)
```

---

## 7. Version Control (Git Rules)

- **Root Database (`/data/`)**: **Ignored.** The root `./data/` directory and `.env` file are gitignored because they contain local runtime state (`cts_cheques.db`).
- **Frontend Source Data (`src/client/data/`)**: **Tracked.** Contains critical source files (`menuTree.ts`, `messages.ts`, `chequeBatches.ts`) and is explicitly tracked (`!src/client/data/`).
- **Frontend Distribution (`src/client/dist/`)**: **Tracked.** Compiled assets in `src/client/dist/` are explicitly tracked (`!src/client/dist/`).
- **Uploaded Cheques (`storage/`)**: Ignored except `storage/.gitkeep` to preserve directory structure.
