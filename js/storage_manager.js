/**
 * storage_manager.js
 *
 * 生成した問題を「名前付きの保存データ」として管理する。
 * - PC: JSONファイルとしてダウンロード / 読み込み
 * - ブラウザ: localStorage と Cookie の両方へ保存
 *
 * localStorage を主保存先、Cookie をバックアップとして同時に保持する。
 * Cookie は容量が小さいため分割保存する。
 */

const STORAGE_PREFIX = 'proof_generator_saved_';
const STORAGE_INDEX = `${STORAGE_PREFIX}index`;
const COOKIE_PREFIX = 'proof_generator_saved_';
const COOKIE_INDEX = `${COOKIE_PREFIX}cookie_index`;
const COOKIE_CHUNK_SIZE = 3600;
const COOKIE_MAX_CHUNKS = 32;
const MAX_BROWSER_SAVES = 30;

function encode(value) {
  return encodeURIComponent(value);
}

function decode(value) {
  return decodeURIComponent(value);
}

function cookieSet(name, value, days = 3650) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function cookieDelete(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  const item = document.cookie.split('; ').find(x => x.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

function safeId() {
  return `s${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeFileName(name) {
  return String(name || '証明問題').trim().replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || '証明問題';
}

export function createSaveData(problem, name) {
  return {
    format: 'SHIZUOKA_PROOF_GENERATOR_SAVE',
    format_version: '1.1.0',
    save_name: String(name || '無題').trim() || '無題',
    saved_at: new Date().toISOString(),
    problem: structuredClone(problem ?? {})
  };
}

export function downloadSave(saveData) {
  const name = sanitizeFileName(saveData?.save_name);
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readSaveFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        resolve(normalizeSaveData(parsed, file?.name));
      } catch (error) {
        reject(new Error(`JSONを読み込めませんでした: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
    reader.readAsText(file, 'utf-8');
  });
}

export function normalizeSaveData(data, fallbackName = '読み込んだ問題') {
  if (data?.format === 'SHIZUOKA_PROOF_GENERATOR_SAVE' && data.problem) {
    return {
      ...data,
      save_name: String(data.save_name || fallbackName),
      problem: structuredClone(data.problem)
    };
  }

  const baseName = String(fallbackName || '読み込んだ問題').replace(/\.json$/i, '');
  return createSaveData(data, baseName);
}

/* ---------------- localStorage ---------------- */

function loadLocalIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalIndex(index) {
  localStorage.setItem(STORAGE_INDEX, JSON.stringify(index));
}

function saveToLocalStorage(saveData, id = safeId()) {
  const payload = JSON.stringify(saveData);
  localStorage.setItem(`${STORAGE_PREFIX}${id}`, payload);

  const index = loadLocalIndex().filter(x => x?.id !== id);
  index.push({
    id,
    name: saveData.save_name,
    saved_at: saveData.saved_at
  });

  const retained = index.slice(-MAX_BROWSER_SAVES);
  for (const old of index.slice(0, -MAX_BROWSER_SAVES)) {
    if (old?.id) localStorage.removeItem(`${STORAGE_PREFIX}${old.id}`);
  }
  saveLocalIndex(retained);
  return id;
}

function loadLocalStorage(id) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) throw new Error('指定されたローカルストレージ保存データが見つかりません。');
  try {
    return normalizeSaveData(JSON.parse(raw));
  } catch (error) {
    throw new Error(`ローカルストレージ保存データを復元できませんでした: ${error.message}`);
  }
}

function deleteLocalStorage(id) {
  localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  saveLocalIndex(loadLocalIndex().filter(x => x.id !== id));
}

/* ---------------- Cookie ---------------- */

function loadCookieIndex() {
  const raw = getCookie(COOKIE_INDEX);
  if (!raw) return [];
  try {
    const value = JSON.parse(decode(raw));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveCookieIndex(index) {
  cookieSet(COOKIE_INDEX, encode(JSON.stringify(index)));
}

function saveToCookie(saveData, id = safeId()) {
  const encoded = encode(JSON.stringify(saveData));
  const chunks = [];
  for (let i = 0; i < encoded.length; i += COOKIE_CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + COOKIE_CHUNK_SIZE));
  }

  if (chunks.length > COOKIE_MAX_CHUNKS) {
    throw new Error(`Cookie保存の容量を超えました（${chunks.length}分割）。ローカルストレージまたはPC保存をご利用ください。`);
  }

  chunks.forEach((chunk, index) => cookieSet(`${COOKIE_PREFIX}${id}_${index}`, chunk));

  const index = loadCookieIndex().filter(x => x?.id !== id);
  index.push({
    id,
    name: saveData.save_name,
    saved_at: saveData.saved_at,
    chunks: chunks.length
  });

  const retained = index.slice(-MAX_BROWSER_SAVES);
  for (const old of index.slice(0, -MAX_BROWSER_SAVES)) {
    if (old?.id) {
      for (let i = 0; i < Number(old.chunks || 0); i++) {
        cookieDelete(`${COOKIE_PREFIX}${old.id}_${i}`);
      }
    }
  }
  saveCookieIndex(retained);
  return id;
}

function loadCookie(id) {
  const meta = loadCookieIndex().find(x => x.id === id);
  if (!meta) throw new Error('指定されたCookie保存データが見つかりません。');

  let encoded = '';
  for (let i = 0; i < Number(meta.chunks || 0); i++) {
    const chunk = getCookie(`${COOKIE_PREFIX}${id}_${i}`);
    if (chunk == null) throw new Error('Cookie保存データの一部が失われています。');
    encoded += chunk;
  }

  try {
    return normalizeSaveData(JSON.parse(decode(encoded)), meta.name);
  } catch (error) {
    throw new Error(`Cookie保存データを復元できませんでした: ${error.message}`);
  }
}

function deleteCookie(id) {
  const index = loadCookieIndex();
  const meta = index.find(x => x.id === id);
  if (!meta) return;
  for (let i = 0; i < Number(meta.chunks || 0); i++) {
    cookieDelete(`${COOKIE_PREFIX}${id}_${i}`);
  }
  saveCookieIndex(index.filter(x => x.id !== id));
}

/* ---------------- 公開API ---------------- */

/**
 * 同じ問題を localStorage と Cookie の両方へ保存する。
 * Cookie容量超過でも localStorage 側には保存を残す。
 */
export function saveBrowser(saveData) {
  const id = safeId();
  let localSaved = false;
  let cookieSaved = false;
  let cookieError = null;

  try {
    saveToLocalStorage(saveData, id);
    localSaved = true;
  } catch (error) {
    throw new Error(`ローカルストレージに保存できませんでした: ${error.message}`);
  }

  try {
    saveToCookie(saveData, id);
    cookieSaved = true;
  } catch (error) {
    cookieError = error;
  }

  return { id, localSaved, cookieSaved, cookieError };
}

export function listBrowserSaves() {
  const local = loadLocalIndex();
  const cookie = loadCookieIndex();
  const map = new Map();

  for (const item of local) {
    if (item?.id) map.set(item.id, { ...item, local: true, cookie: false });
  }
  for (const item of cookie) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    map.set(item.id, {
      ...(existing || item),
      name: existing?.name || item.name,
      saved_at: existing?.saved_at || item.saved_at,
      local: existing?.local ?? false,
      cookie: true
    });
  }

  return [...map.values()].sort((a, b) => String(b.saved_at).localeCompare(String(a.saved_at)));
}

export function loadBrowser(id) {
  try {
    return loadLocalStorage(id);
  } catch (localError) {
    try {
      return loadCookie(id);
    } catch (cookieError) {
      throw new Error(`保存データを読み込めませんでした。\nローカルストレージ: ${localError.message}\nCookie: ${cookieError.message}`);
    }
  }
}

export function deleteBrowser(id) {
  deleteLocalStorage(id);
  deleteCookie(id);
}

// 互換API: 既存コードからCookie専用関数を呼んでも動くように残す。
export function saveCookie(saveData) {
  return saveBrowser(saveData).id;
}

export function listCookieSaves() {
  return listBrowserSaves();
}

export function loadCookieSave(id) {
  return loadBrowser(id);
}

export function deleteCookieSave(id) {
  deleteBrowser(id);
}
