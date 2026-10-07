const DATA_BASE_PATH = './data/';

/**
 * 年からJSONファイルを読み込む
 */
export async function loadYear(year) {
  const path = `${DATA_BASE_PATH}${year}.json`;

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `JSONの読み込みに失敗しました: ${path} (${response.status})`
    );
  }

  const data = await response.json();

  return data;
}

/**
 * 複数年のJSONを読み込む
 */
export async function loadYears(years) {
  const result = {};

  for (const year of years) {
    result[year] = await loadYear(year);
  }

  return result;
}
