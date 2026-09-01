# CTS Cheque OCR — ServiceNow SDK & Standalone Web Application

Unified ServiceNow SDK & Standalone Web Application for **CTS Cheque OCR Verification** built with **ServiceNow SDK / Fluent**, **Express.js (Node.js)**, **SQLite**, **React 19 (Vite)**, and **FastAPI / PaddleOCR Engine**.

---

## 🌟 ServiceNow SDK Compatibility

This project is fully structured according to **ServiceNow SDK (Fluent)** standards:
- **`now.config.json`**: Central manifest defining scope (`x_snc_cheque_ocr`), version, and directory mappings (`fluentDir`, `serverModulesDir`, `clientDir`).
- **`src/fluent/`**: Contains ServiceNow Fluent `.now.ts` metadata files defining application tables (`x_snc_cheque_ocr_batch`, `x_snc_cheque_ocr_record`), Business Rules, and Form UX definitions.
- **`src/client/`**: Contains Next Experience / React 19 UI components, stylesheets, and standalone dashboards.
- **`src/server/`**: Contains modular Node.js backend logic, REST controllers, database abstractions, and OCR worker services.

---

## 🏗️ System Architecture & Folder Layout

```
cts-cheque-ocr-sdk/
├── now.config.json           ← ServiceNow SDK Manifest (scope: x_snc_cheque_ocr)
├── package.json              ← Unified scripts & dependencies
├── .env.example              ← Environment configuration template
├── .env                      ← Local environment variables (PORT, OCR_SERVICE_URL)
├── README.md                 ← Project overview & ServiceNow setup
├── SETUP.md                  ← Detailed setup & architectural guide
│
├── src/
│   ├── fluent/               ← ServiceNow Fluent (.now.ts) Metadata & UX Definitions
│   │   ├── index.now.ts      → Main Fluent export
│   │   ├── tables/
│   │   │   ├── cheque_batch.now.ts  → x_snc_cheque_ocr_batch table definition
│   │   │   └── cheque_record.now.ts → x_snc_cheque_ocr_record table definition
│   │   └── business-rules/
│   │       └── cheque_verification.now.ts → Verification Business Rule
│   │
│   ├── client/               ← React 19 + TypeScript UI (Vite @ port 5173)
│   │   ├── index.html        → Main React entry point
│   │   ├── batch_processor.html → Standalone HTML Batch Processor Dashboard
│   │   ├── components/       → Workspace, BatchProcessorView, Sidebar, TopBar
│   │   ├── styles/           → Dark-mode & glassmorphic custom CSS system
│   │   ├── dist/             → Compiled client bundle (tracked by Git)
│   │   └── data/             → Frontend source data (tracked by Git)
│   │
│   └── server/               ← Express Backend API (Node.js @ port 3000)
│       ├── index.js          → Express server entry point & storage auto-sync
│       ├── routes.js         → REST API endpoints (/api/cheques/process/stream, /config)
│       ├── db.js             → SQLite database manager (data/cts_cheques.db)
│       ├── ocrWorker.js      → Parallel background worker pool
│       └── ocrServiceClient.js → Dynamic REST client connecting to OCR Engine
│
├── data/                     ← Local SQLite runtime database (gitignored)
├── storage/                  ← Automated batch directory storage (gitignored)
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
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend API**: [http://localhost:3000/api/cheques](http://localhost:3000/api/cheques)
- **Standalone Dashboard HTML**: `src/client/batch_processor.html`

---

## 🌐 Configuring Deployed / Remote OCR Service URLs

The backend server **dynamically reads `OCR_SERVICE_URL` from your `.env` file** on every request.

### Setting Up Your Hosted OCR Endpoint in `.env`:
Edit your `.env` file in the root project folder:
```env
PORT=3000
OCR_SERVICE_URL=https://your-hosted-ocr-domain.com
```

### How It Works:
1. **Automatic UI Synchronization**: The UI automatically fetches the active engine link from `.env` via `GET /api/cheques/config` and displays the active endpoint badge (`Active OCR Engine: <link-from-env>`). No manual typing or UI link input is required.
2. **Remote / Hosted Base64 Payload Delivery**: When pointing to a remote server or ngrok URL, [src/server/ocrServiceClient.js](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/src/server/ocrServiceClient.js) automatically transmits the file's **Base64 encoded bytes** (`fileContentBase64`) alongside `pdfPath` so remote OCR servers can process files even if local disk paths do not exist on the remote host.
3. **Proxy & Ngrok Bypass Headers**: Automatic headers (`ngrok-skip-browser-warning: true`) are included on all requests so ngrok tunnels and cloud proxies don't block API calls.

---

## 🗄️ Database Architecture & Version Control

### What Database is Used?
The application uses **SQLite 3** (`sqlite3`), an embedded, serverless, file-based relational database.

### How It Works:
- **Zero Installation / Zero Setup**: SQLite requires no separate server process, username, password, or daemon to install.
- **Auto-Initialization**: On server launch (`npm run dev` or `npm run server`), [src/server/db.js](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/src/server/db.js) automatically creates the `./data/` directory and initializes `./data/cts_cheques.db`.

### Do I Have to Push the `data/` Folder to Git?
- **Root Runtime Database (`/data/cts_cheques.db`)**: **NO.** Root `/data/` is gitignored in `.gitignore` because it contains local runtime database state.
- **Frontend Source Data (`src/client/data/`)**: **YES.** `src/client/data/` contains essential source files (`menuTree.ts`, `messages.ts`, `chequeBatches.ts`) and is **tracked by Git** (`!src/client/data/`).
- **Frontend Distribution (`src/client/dist/`)**: **YES.** `src/client/dist/` is explicitly **tracked by Git** (`!src/client/dist/`).

---

Refer to [SETUP.md](file:///home/atomic-shadow/development/cts-cheque-ocr-sdk/SETUP.md) for full setup instructions, API specs, and technical details.
