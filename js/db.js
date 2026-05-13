// ═══════════════════════════════════════════
//  RAIMOS DB — IndexedDB Storage Layer
// ═══════════════════════════════════════════

const DB_NAME = 'raimos_db';
const DB_VER  = 5;

const STORES = {
  chats:          { keyPath: 'id' },
  messages:       { keyPath: 'id', indexes: [['chatId','chatId']] },
  contacts:       { keyPath: 'id' },
  memories:       { keyPath: 'id' },
  stickers:       { keyPath: 'id' },
  kwAnims:        { keyPath: 'id' },
  moments:        { keyPath: 'id' },
  comments:       { keyPath: 'id', indexes: [['momentId','momentId']] },
  files:          { keyPath: 'id' },
  settings:       { keyPath: 'key' },
  album:          { keyPath: 'id' },
  wardrobeItems:  { keyPath: 'id' },
  statusNotes:    { keyPath: 'id' },
  checkinGoals:   { keyPath: 'id' },
  checkinRecords: { keyPath: 'id', indexes: [['goalId','goalId']] },
};

let _db = null;

async function dbOpen() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      for (const [name, cfg] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: cfg.keyPath });
          (cfg.indexes || []).forEach(([idx, key]) => store.createIndex(idx, key));
        }
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbGet(store, key) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function dbGetAll(store, indexName, indexValue) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const req = indexName ? os.index(indexName).getAll(indexValue) : os.getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

async function dbPut(store, obj) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function dbDel(store, key) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

async function dbClear(store) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// Settings helpers
async function getSetting(key, def) {
  const row = await dbGet('settings', key);
  return row ? row.value : def;
}
async function setSetting(key, value) {
  await dbPut('settings', { key, value });
}
async function getAllSettings() {
  const rows = await dbGetAll('settings');
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  return out;
}

// File store helpers (store images as dataURL)
async function saveFile(id, dataUrl, meta = {}) {
  await dbPut('files', { id, dataUrl, ...meta, ts: Date.now() });
  return id;
}
async function loadFile(id) {
  const row = await dbGet('files', id);
  return row ? row.dataUrl : null;
}
async function delFile(id) { await dbDel('files', id); }
async function getAllFiles() { return dbGetAll('files'); }

// Media blob helpers (for audio/video/image assets too large for dataUrl)
async function saveMediaBlob(id, blob, meta = {}) {
  await dbPut('files', { id, blob, ...meta, ts: Date.now() });
  return id;
}
async function loadMediaBlob(id) {
  const row = await dbGet('files', id);
  return row ? (row.blob || null) : null;
}
async function loadMediaUrl(id) {
  const blob = await loadMediaBlob(id);
  if (!blob) return null;
  try { return URL.createObjectURL(blob); } catch(e) { return null; }
}

// Storage size estimate
async function estimateUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota, pct: Math.round(usage / quota * 100) };
  }
  return null;
}
