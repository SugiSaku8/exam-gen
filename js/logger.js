/**
 * logger.js
 * 入試対策証明ジェネレーター共通ログ。
 * ブラウザのConsoleから処理の流れを追跡するために使用する。
 */

const PREFIX = '[ProofGen]';
const DEBUG_KEY = 'proof_generator_debug_logs';

function enabled() {
  try {
    const value = localStorage.getItem(DEBUG_KEY);
    return value !== '0' && value !== 'false';
  } catch {
    return true;
  }
}

function stamp() {
  return new Date().toLocaleTimeString('ja-JP', {
    hour12: false,
    fractionalSecondDigits: 3
  });
}

function write(method, category, message, data) {
  if (!enabled()) return;
  const head = `${PREFIX} ${stamp()} [${category}] ${message}`;
  if (data === undefined) console[method](head);
  else console[method](head, data);
}

export const logger = {
  debug(category, message, data) { write('debug', category, message, data); },
  info(category, message, data) { write('info', category, message, data); },
  warn(category, message, data) { write('warn', category, message, data); },
  error(category, message, data) { write('error', category, message, data); },
  group(category, message, data) {
    if (!enabled()) return;
    const head = `${PREFIX} ${stamp()} [${category}] ${message}`;
    if (data === undefined) console.groupCollapsed(head);
    else { console.groupCollapsed(head); console.debug(data); }
  },
  groupEnd() {
    if (!enabled()) return;
    console.groupEnd();
  },
  time(category, label) {
    if (!enabled()) return () => {};
    const started = performance.now();
    logger.debug(category, `${label} 開始`);
    return (data) => {
      const elapsed = performance.now() - started;
      logger.info(category, `${label} 完了 (${elapsed.toFixed(2)} ms)`, data);
    };
  }
};

export function setDebugLogs(value) {
  try {
    localStorage.setItem(DEBUG_KEY, value ? '1' : '0');
  } catch {
    // localStorageが使えない環境でもアプリ本体は動作させる。
  }
}
