/**
 * 条件欄に表示する項目を整理する。
 * 図から読み取れる点の配置定義は表示を省くが、元データ自体は変更しない。
 */
export function getDisplayConditions(allConditions = []) {
  const seen = new Set();
  return (Array.isArray(allConditions) ? allConditions : []).filter(condition => {
    const statement = String(typeof condition === 'string' ? condition : condition?.statement ?? '').trim();
    const type = String(typeof condition === 'object' && condition ? condition.type ?? '' : '').toLowerCase();
    if (!statement) return false;
    if (type === 'intersection' || type === 'point_on_segment') return false;
    // 「E=AB∩CD」のような交点定義は図に表示されるため、条件欄では重複させない。
    if (/^[A-ZＡ-Ｚa-z]\s*=\s*[^=]*∩/u.test(statement)) return false;
    if (seen.has(statement)) return false;
    seen.add(statement);
    return true;
  });
}
