/**
 * JSON Loader
 * JSONファイルの取得だけを担当する。
 */

export async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`JSONの読み込みに失敗しました: ${path} (${response.status})`);
  }

  return response.json();
}

export async function loadJsonMap(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => {
      return [key, await loadJson(path)];
    })
  );

  return Object.fromEntries(entries);
}
