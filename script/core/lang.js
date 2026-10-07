export const LANG_DATA = {
//lang data
};

import { CURRENT_LANG } from './config.js';
/**
 * 指定したキーの文言を現在の言語で取得
 * @param {string} key
 * @param {string} lang - 省略時はconfig.jsのCURRENT_LANG
 */
export function t(key, lang = CURRENT_LANG) {
  return (LANG_DATA[lang] && LANG_DATA[lang][key]) || key;
} 