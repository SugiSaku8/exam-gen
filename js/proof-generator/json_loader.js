const DATA_BASE_PATH = './data/';

export async function loadYear(year) {
  const path = `${DATA_BASE_PATH}${year}.json`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`JSONの読み込みに失敗しました: ${path} (${response.status})`);
  }
  const data = await response.json();
  return data;
}

export async function loadYears(years) {
  const result = {};
  for (const year of years) {
    result[year] = await loadYear(year);
  }
  return result;
}
