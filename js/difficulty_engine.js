/**
 * Deterministic difficulty contract and transparent complexity report.
 * This is a calibrated rubric for the registered Shizuoka templates, not a
 * claim that every possible geometry proof can be assigned an objective level.
 */
const SUPPORTED_LEVELS = Object.freeze([3, 4, 5, 6, 7, 8]);

const YEARS_BY_LEVEL = Object.freeze({ 3: [2014, 2015], 4: [2016], 5: [2017, 2024, 2025, 2026], 6: [2017], 7: [2017], 8: [2017] });
const MIN_SOURCE_STEPS_BY_YEAR = Object.freeze({ 2014: 7, 2015: 7, 2016: 8, 2017: 8, 2024: 9, 2025: 10, 2026: 11 });

const PROFILE = Object.freeze({
  3: { label: '基礎', calculation: '整数・簡潔な厳密値', numeric: 'simple-exact' },
  4: { label: '標準', calculation: '複数段階の角度・長さ', numeric: 'simple-exact' },
  5: { label: '標準〜発展', calculation: '標準的な厳密計算', numeric: 'simple-exact' },
  6: { label: '上級', calculation: '平方根を含む厳密値', numeric: 'single-radical' },
  7: { label: '発展', calculation: 'a+b√c 型の分数', numeric: 'radical-fraction' },
  8: { label: '最難関', calculation: '分子が a+b√c の分数', numeric: 'radical-fraction' }
});

function sourceProofSteps(problem) {
  const candidates = [problem?.proof?.steps, problem?.proof?.P1?.steps,
    problem?.proof?.P1?.solution_steps, problem?.proof?.selected_solution?.steps];
  const found = candidates.find(Array.isArray);
  return found ? found.map(step => typeof step === 'string' ? step : String(step?.statement ?? step?.conclusion ?? '')).filter(Boolean) : [];
}

function derivationDepth(steps = []) {
  const depths = new Map();
  for (const step of steps) {
    const parentDepth = (step.premises ?? []).reduce((max, id) => Math.max(max, depths.get(id) ?? 0), 0);
    depths.set(step.id, parentDepth + 1);
  }
  return Math.max(0, ...depths.values());
}

function pointCount(problem) {
  const points = problem?.geometryModel?.points ?? problem?.geometry?.points ?? problem?.geometry?.coordinates?.points ?? {};
  return Object.keys(points).length;
}

function numericAnswer(problem) {
  return String(problem?.problem?.parts?.[1]?.target?.answer
    ?? problem?.problem?.parts?.[1]?.answer
    ?? problem?.follow_up?.P2?.answer
    ?? '').replace(/\s+/g, '');
}

function numericForm(answer) {
  if (!answer) return 'not-applicable';
  if (/^[+-]?\d+$/u.test(answer)) return 'integer';
  if (/^\(?[+-]?\d+\)?\/\d+$/u.test(answer)) return 'rational';
  if (/^[+-]?\d*√\d+$/u.test(answer) || /^[+-]?\d+(?:[+-]\d*√\d+)$/u.test(answer)) return 'single-radical';
  if (/^\(\d+[+-]\d+√\d+\)\/\d+$/u.test(answer)) return 'radical-fraction';
  if (/\d+\.\d+/u.test(answer)) return 'decimal';
  return 'other-exact';
}

function targetFor(problem) {
  const d = problem?.generation?.difficulty;
  if (d === 6) return ['single-radical'];
  if (d === 7 || d === 8) return ['radical-fraction'];
  return ['integer', 'rational', 'single-radical', 'radical-fraction', 'other-exact'];
}

export function auditDifficultyContract(problem, requestedDifficulty = problem?.generation?.difficulty, options = {}) {
  const level = Number(requestedDifficulty);
  const errors = [];
  if (!SUPPORTED_LEVELS.includes(level)) errors.push(`未対応の難易度です: ${requestedDifficulty}`);

  const year = Number(problem?.metadata?.year);
  if (options.strictFamily && YEARS_BY_LEVEL[level] && !YEARS_BY_LEVEL[level].includes(year)) {
    errors.push(`難易度${level}の生成対象年度と一致しません（${year}年度）。`);
  }

  const plan = problem?.validation?.proof_first_plan;
  const derivation = Array.isArray(plan?.derivation) ? plan.derivation : [];
  const sourceSteps = sourceProofSteps(problem);
  const minimumSourceSteps = MIN_SOURCE_STEPS_BY_YEAR[year] ?? 0;
  if (sourceSteps.length < minimumSourceSteps) errors.push(`証明の論理段階が不足しています（${sourceSteps.length}/${minimumSourceSteps}段階）。`);
  const rules = [...new Set(derivation.map(step => step.rule).filter(rule => rule && rule !== 'given'))];
  const conditionCount = Array.isArray(plan?.required_conditions) ? plan.required_conditions.length : 0;
  const premiseEdges = derivation.reduce((sum, step) => sum + (Array.isArray(step.premises) ? step.premises.length : 0), 0);
  const answer = numericAnswer(problem);
  const form = numericForm(answer);
  const allowedForms = targetFor(problem);
  if (form === 'not-applicable' && level >= 6) errors.push('高難易度の数値設問に答案がありません。');
  if (form === 'decimal') errors.push('数値答案に小数が含まれています。厳密値に変換してください。');
  if (level === 6 && form !== 'single-radical') errors.push(`難易度6は平方根を含む厳密値が必要です（現在: ${form}）。`);
  if ((level === 7 || level === 8) && form !== 'radical-fraction') errors.push(`難易度${level}は分子が a+b√c の分数形式が必要です（現在: ${form}）。`);
  if (level >= 6 && problem?.metadata?.year !== 2017) errors.push(`難易度${level}の数値設問は登録済みの2017型に限定されています。`);

  const report = {
    version: '1.0.0', status: errors.length ? 'failed' : 'passed', valid: errors.length === 0,
    requested_level: level, profile: PROFILE[level]?.label ?? '未対応',
    strict_family: Boolean(options.strictFamily), year,
    dimensions: {
      source_proof_steps: sourceSteps.length,
      formal_derivation_steps: derivation.length,
      formal_derivation_depth: derivationDepth(derivation),
      distinct_inference_rules: rules.length,
      required_condition_count: conditionCount,
      premise_dependency_edges: premiseEdges,
      geometry_point_count: pointCount(problem),
      calculation_form: form,
      calculation_profile: PROFILE[level]?.calculation ?? '未対応'
    },
    numeric_answer: answer,
    errors,
    limitation: '難易度は登録済みテンプレートの証明構造と数値答案形式を使った校正値です。生徒全員に共通する絶対的な難しさを数学的に証明するものではありません。'
  };
  return report;
}

export function assertDifficultyContract(problem, requestedDifficulty = problem?.generation?.difficulty, options = {}) {
  const report = auditDifficultyContract(problem, requestedDifficulty, options);
  if (!report.valid) throw new Error(`難易度契約に違反しています: ${report.errors.join(' / ')}`);
  return report;
}

export function getDifficultyProfile(level) {
  return PROFILE[Number(level)] ?? null;
}
