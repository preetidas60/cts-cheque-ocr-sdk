/**
 * db.js
 * -----
 * Local SQLite database wrapper for CTS Cheque OCR SDK (Local Server).
 * Stores batches and cheque_records in local SQLite file `./data/cts_cheques.db`.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cts_cheques.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT UNIQUE NOT NULL,
      source_file_name TEXT,
      storage_path TEXT,
      total_files INTEGER DEFAULT 0,
      total_cheques INTEGER DEFAULT 0,
      worker_threads INTEGER DEFAULT 4,
      processed_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PROCESSING',
      submitted_at TEXT,
      completed_at TEXT,
      processing_time_seconds REAL,
      total_amount_in_figures REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cheque_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      cheque_id TEXT NOT NULL,
      source_file_name TEXT,
      file_path TEXT,
      page_number INTEGER DEFAULT 1,
      status TEXT DEFAULT 'PENDING',
      account_number TEXT,
      account_number_confidence_percent REAL,
      account_holder_name TEXT,
      account_holder_confidence_percent REAL,
      cheque_date TEXT,
      cheque_date_confidence_percent REAL,
      amount_in_words TEXT,
      amount_in_words_confidence_percent REAL,
      amount_in_figures TEXT,
      amount_in_figures_confidence_percent REAL,
      needs_review INTEGER DEFAULT 0,
      review_reasons TEXT,
      error_message TEXT,
      verified_account_number TEXT,
      verified_by TEXT,
      verified_at TEXT,
      worker_thread_name TEXT,
      ocr_start_time TEXT,
      ocr_end_time TEXT,
      ocr_duration_ms INTEGER,
      UNIQUE(batch_id, cheque_id)
    )
  `);
});

// Promise-based helper functions
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
};
