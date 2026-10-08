import { logger } from './logger.js';
/**
 * template_registry.js
 *
 * 問題の「年度」ではなく、数学的な構造をテンプレートとして管理する。
 * 年度はテンプレート選択後に内部情報として決定される。
 */
export const TEMPLATE_CATALOG = [
  {
    id: 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001',
    year: 2014,
    title: '円・二等辺三角形・平行線・合同（ASA）',
    proofType: 'congruence', method: 'ASA',
    features: ['circle', 'isosceles', 'parallel', 'inscribed_angle'],
    difficulty: 3, sourceTemplate: '2014', generated: true
  },
  {
    id: 'SHIZUOKA_DIAMETER_ISOSCELES_AA_001',
    year: 2015,
    title: '直径・二等辺三角形・平行線・相似（AA）',
    proofType: 'similarity', method: 'AA',
    features: ['circle', 'diameter', 'isosceles', 'parallel'],
    difficulty: 3, sourceTemplate: '2015', generated: true
  },
  {
    id: 'SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001',
    year: 2016,
    title: '円・平行線・平行四辺形・長さ',
    proofType: 'equal_length', method: 'parallelism_to_parallelogram',
    features: ['circle', 'parallel', 'parallelogram', 'length'],
    difficulty: 4, sourceTemplate: '2016', generated: true
  },
  {
    id: 'SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001',
    year: 2017,
    title: '円・角の二等分線・二等辺・相似・面積比',
    proofType: 'similarity', method: 'AA',
    features: ['circle', 'angle_bisector', 'isosceles', 'similarity', 'area_ratio'],
    difficulty: 5, sourceTemplate: '2017', generated: true
  }
];

export function getTemplate(id) {
  return TEMPLATE_CATALOG.find(x => x.id === id) ?? null;
}

export function filterTemplates(filters = {}) {
  logger.debug('TEMPLATE', 'テンプレートをフィルタ', filters);
  return TEMPLATE_CATALOG.filter(t => {
    if (filters.proofType && filters.proofType !== 'all' && t.proofType !== filters.proofType) return false;
    if (filters.method && filters.method !== 'all' && t.method !== filters.method) return false;
    if (filters.feature && filters.feature !== 'all' && !t.features.includes(filters.feature)) return false;
    if (filters.difficulty && filters.difficulty !== 'all' && Number(filters.difficulty) !== t.difficulty) return false;
    return true;
  });
}

/**
 * 条件から候補をスコアリングする。
 * 年度は評価項目に含めない。
 *
 * exact条件が全て一致する候補を最優先し、
 * 難易度だけ近い候補も次点として残す。
 */
export function rankTemplates(filters = {}, random = Math.random) {
  logger.debug('TEMPLATE', 'テンプレートをランキング', filters);
  const candidates = TEMPLATE_CATALOG.map(template => {
    let score = 0;
    const reasons = [];

    if (filters.proofType && filters.proofType !== 'all') {
      if (template.proofType === filters.proofType) { score += 100; reasons.push('証明形式一致'); }
      else score -= 80;
    }
    if (filters.method && filters.method !== 'all') {
      if (template.method === filters.method) { score += 80; reasons.push('証明方法一致'); }
      else score -= 60;
    }
    const requestedFeatures = Array.isArray(filters.features)
      ? filters.features.filter(Boolean)
      : (filters.feature && filters.feature !== 'all' ? [filters.feature] : []);
    if (requestedFeatures.length) {
      const matched = requestedFeatures.filter(f => template.features.includes(f)).length;
      score += matched * 55;
      score -= (requestedFeatures.length - matched) * 20;
      if (matched === requestedFeatures.length) reasons.push('図形条件一致');
      else if (matched > 0) reasons.push(`${matched}/${requestedFeatures.length}条件一致`);
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      const d = Number(filters.difficulty);
      const diff = Math.abs(template.difficulty - d);
      score += Math.max(0, 45 - diff * 20);
      if (diff === 0) reasons.push('難易度一致');
    }

    // 条件未指定時は同じ問題ばかりにならないよう軽く乱数を加える。
    score += random() * 8;
    return { template, score, reasons };
  }).sort((a, b) => b.score - a.score);

  logger.info('TEMPLATE', 'テンプレートランキング完了', candidates.map(x => ({ id: x.template.id, score: Number(x.score.toFixed(3)), reasons: x.reasons })));
  return candidates;
}
