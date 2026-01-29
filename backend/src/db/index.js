const initSqlJs = require('sql.js');
const fs = require('fs');
const { DB_PATH } = require('../config');

let db;
let sea = null;

try {
  const seaModule = require('node:sea');
  if (seaModule.isSea()) sea = seaModule;
} catch {}

async function initDatabase() {
  const sqlConfig = {};
  if (sea) {
    sqlConfig.wasmBinary = sea.getAssetAsBlob('sql-wasm.wasm').arrayBuffer
      ? await sea.getAssetAsBlob('sql-wasm.wasm').arrayBuffer()
      : sea.getAsset('sql-wasm.wasm');
  }
  const SQL = await initSqlJs(sqlConfig);

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      preset TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      system_prompt TEXT,
      suffix TEXT,
      model TEXT,
      naming_model TEXT DEFAULT NULL,
      backend_url TEXT DEFAULT NULL,
      api_key TEXT DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      system_prompt TEXT,
      suffix TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_prompt_settings (
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      prompt_id INTEGER,
      is_global INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, model),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prompt_id) REFERENCES custom_prompts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS global_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      system_prompt TEXT,
      suffix TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL,
      max_uses INTEGER DEFAULT 1,
      uses INTEGER DEFAULT 0,
      expires_at INTEGER DEFAULT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
  `);

  // Migrations
  const cols = db.exec("PRAGMA table_info(user_settings)")[0]?.values.map(r => r[1]) || [];
  if (!cols.includes('naming_model')) db.run('ALTER TABLE user_settings ADD COLUMN naming_model TEXT DEFAULT NULL');
  if (!cols.includes('backend_url')) db.run('ALTER TABLE user_settings ADD COLUMN backend_url TEXT DEFAULT NULL');
  if (!cols.includes('api_key')) db.run('ALTER TABLE user_settings ADD COLUMN api_key TEXT DEFAULT NULL');

  const msgCols = db.exec("PRAGMA table_info(messages)")[0]?.values.map(r => r[1]) || [];
  if (!msgCols.includes('model')) db.run('ALTER TABLE messages ADD COLUMN model TEXT');
  if (!msgCols.includes('preset')) db.run('ALTER TABLE messages ADD COLUMN preset TEXT');

  // Migration: add is_global column to model_prompt_settings
  const mpsCols = db.exec("PRAGMA table_info(model_prompt_settings)")[0]?.values.map(r => r[1]) || [];
  if (!mpsCols.includes('is_global')) db.run('ALTER TABLE model_prompt_settings ADD COLUMN is_global INTEGER DEFAULT 0');

  // Migration: add is_admin column to users table
  const userCols = db.exec("PRAGMA table_info(users)")[0]?.values.map(r => r[1]) || [];
  if (!userCols.includes('is_admin')) {
    db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
    // Make the first user an admin if any users exist
    const firstUser = db.exec("SELECT id FROM users ORDER BY id LIMIT 1");
    if (firstUser.length > 0 && firstUser[0]?.values.length > 0) {
      db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [firstUser[0].values[0][0]]);
    }
  }

  // Seed default app settings if not exist
  const regSetting = db.exec("SELECT value FROM app_settings WHERE key = 'registration_enabled'");
  if (regSetting.length === 0 || regSetting[0]?.values.length === 0) {
    db.run("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registration_enabled', 'true')");
    db.run("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('invite_only', 'false')");
  }

  // Seed global prompts from prompt.json if not exists
  const { prompts } = require('../config');
  const systemPrompt = db.exec("SELECT id FROM global_prompts WHERE name = 'system-default'");
  if (systemPrompt.length === 0 || systemPrompt[0]?.values.length === 0) {
    if (prompts.system_prompt || prompts.suffix_thinking) {
      db.run(
        'INSERT OR IGNORE INTO global_prompts (name, system_prompt, suffix) VALUES (?, ?, ?)',
        ['system-default', prompts.system_prompt || '', prompts.suffix_thinking || '']
      );
    }
  }

  saveDatabase();
}

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() {
  return db;
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] };
}

function startAutoSave() {
  setInterval(() => { if (db) saveDatabase(); }, 30000);
}

function startSessionCleanup() {
  setInterval(() => {
    if (db) {
      const now = Math.floor(Date.now() / 1000);
      db.run('DELETE FROM sessions WHERE expires_at < ?', [now]);
      saveDatabase();
    }
  }, 60 * 60 * 1000);
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
  }
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDb,
  dbGet,
  dbAll,
  dbRun,
  startAutoSave,
  startSessionCleanup,
  closeDatabase,
  getSea: () => sea
};