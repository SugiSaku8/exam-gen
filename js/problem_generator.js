import { logger } from './logger.js';
import { auditGeneratedProblem } from './proof_audit.js';
import { verifyProblemMathematics } from './independent_math_verifier.js';
import { assertProofFirstPlanReady } from './formal_proof_system.js';
import { assertDifficultyContract } from './difficulty_engine.js';
import { validateProblemGeometry } from './geometry_validator.js';
import { generateGeometry, geometryToJSON } from './geometry_solver.js';
import { TEMPLATE_CATALOG, filterTemplates, rankTemplates, getTemplate } from './template_registry.js';
import { generate2015, generate2016, generate2017 } from './templates/canonical_generators.js';
import { generate2024, generate2025, generate2026 } from './templates/recent_generators.js';

export const TEMPLATE_2014 = 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001';

function createSeededRandom(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomChoice(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function generate2014Parameters(options = {}, random = Math.random) {
  const arcRatio = options.arcRatio ?? { ab: 3, bc: 1 };
  const unitAngles = [20, 22, 24, 26, 28, 30, 32, 34];
  const angleAs = [60, 75, 90, 105, 120];
  let unitAngle = options.unitAngle;
  let angleA = options.angleA;
  if (unitAngle == null || angleA == null) {
    const candidates = [];
    for (const u of unitAngles) for (const a of angleAs) {
      const span = (Number(arcRatio.ab) + Number(arcRatio.bc)) * u;
      const answer = 180 - (Number(arcRatio.ab) + 1.5) * u;
      const angleAFB = 180 - ((Number(arcRatio.ab) + 2) * u) / 2;
      if (a - span > 0 && a + span < 180 && a + Number(arcRatio.ab) * u < 180 && span < 180 && answer > 0 && answer < 180 && angleAFB > 0 && angleAFB < 180) {
        if (unitAngle == null || unitAngle === u) {
          if (angleA == null || angleA === a) candidates.push({ unitAngle: u, angleA: a });
        }
      }
    }
    if (!candidates.length) throw new Error('2014型の角度条件を満たすパラメータの組がありません。');
    const chosen = randomChoice(random, candidates);
    unitAngle = chosen.unitAngle;
    angleA = chosen.angleA;
  }
  const angleAB = arcRatio.ab * unitAngle;
  const angleBC = arcRatio.bc * unitAngle;
  const angleB = angleA + angleAB;
  const angleC = angleB + angleBC;
  const angleD = angleA - (angleC - angleA);

  const angleAFB = 180 - ((arcRatio.ab + 2) * unitAngle) / 2;
  const answerCAE = 180 - (arcRatio.ab + 1.5) * unitAngle;

  return {
    radius: options.radius ?? 1,
    angleA,
    angleB,
    angleC,
    angleD,
    arcRatio,
    unitAngle,
    angleAFB,
    answerCAE
  };
}

export function validate2014Parameters(p) {
  const errors = [];
  const warnings = [];
  if (!(p.unitAngle > 0)) errors.push('unitAngleが正ではありません。');
  if (!(p.angleD > 0)) errors.push('∠Dが正ではなく、図形の配置が成立しません。');
  if (!(p.angleB > 0 && p.angleB < 180 && p.angleC > 0 && p.angleC < 180)) errors.push('角度が三角形・円周角の範囲外です。');
  if (!(p.arcRatio.ab > 0 && p.arcRatio.bc > 0)) errors.push('弧の比が正ではありません。');
  if (!(p.angleC - p.angleA < 180)) errors.push('弧ACが180°以上です。');
  if (!(p.answerCAE > 0 && p.answerCAE < 180)) errors.push('∠CAEが0°〜180°の範囲外です。');
  if (!Number.isInteger(p.angleAFB)) warnings.push('∠AFBが整数ではありません。');
  if (!Number.isInteger(p.answerCAE)) warnings.push('∠CAEが整数ではありません。');
  return { valid: errors.length === 0, errors, warnings };
}

function generate2014Proof() {
  return {
    target: '△ABC≡△AGD',
    criterion: 'ASA',
    decomposition: ['AC=AD', '∠ACB=∠ADG', '∠BAC=∠GAD'],
    steps: [
      { id: 'S01', statement: 'AC=AD', reason: '仮定より' },
      { id: 'S02', statement: '∠ACB=∠ADG', reason: '同じ弧ABに対する円周角' },
      { id: 'S03', statement: '∠BAC=∠BDC', reason: '同じ弧BCに対する円周角' },
      { id: 'S04', statement: '∠BDC=∠DCE', reason: 'BD∥CEより錯角' },
      { id: 'S05', statement: '∠DCE=∠GAD', reason: '同じ弧DEに対する円周角' },
      { id: 'S06', statement: '∠BAC=∠GAD', reason: 'S03〜S05より' },
      { id: 'S07', statement: '△ABC≡△AGD', reason: '一辺とその両端の角がそれぞれ等しい（ASA）' }
    ]
  };
}

function generate2014FollowUp(parameters) {
  return {
    problems: [{
      id: 'P2',
      prompt: `弧AB:弧BC=${parameters.arcRatio.ab}:${parameters.arcRatio.bc}、∠AFB=${parameters.angleAFB}°のとき、∠CAEを求めなさい。`,
      answer: parameters.answerCAE,
      unit: '°'
    }]
  };
}

export function generate2014Problem(options = {}) {
  const finish = logger.time('PROBLEM', '2014型問題生成');
  const seed = options.seed ?? Date.now();
  const random = createSeededRandom(seed);
  logger.debug('PROBLEM', '2014型パラメータ生成', { seed });
  const parameters = generate2014Parameters(options, random);
  logger.debug('PROBLEM', '2014型パラメータ', parameters);
  const parameterValidation = validate2014Parameters(parameters);
  if (!parameterValidation.valid) throw new Error(parameterValidation.errors.join('\n'));

  logger.debug('PROBLEM', '幾何図形生成を開始', { template: TEMPLATE_2014 });
  const geometry = generateGeometry(TEMPLATE_2014, parameters);
  logger.info('PROBLEM', '幾何図形生成完了', geometry.constraints);
  const proof = generate2014Proof();

  const result = {
    schema_version: '1.1.0',
    metadata: {
      id: 'generated_2014_math_07',
      prefecture: '静岡県',
      exam_type: '公立高校入試',
      subject: '数学',
      year: 2014,
      problem_number: 'generated',
      points: 9,
      tags: ['circle', 'inscribed_angle', 'chord', 'isosceles_triangle', 'parallel_lines', 'congruence', 'arc_ratio', 'angle_calculation']
    },
    geometryModel: geometry,
    geometry: geometryToJSON(geometry),
    given_conditions: [
      'A,B,C,Dは円O1上にある',
      'AC=AD',
      'CE∥BD',
      'F=AC∩BD',
      'G=AE∩BD'
    ],
    derived_facts: [
      { id: 'F01', statement: '∠ACB=∠ADG', rule: 'same_arc' },
      { id: 'F02', statement: '∠BAC=∠BDC', rule: 'same_arc' },
      { id: 'F03', statement: '∠BDC=∠DCE', rule: 'alternate_interior' },
      { id: 'F04', statement: '∠DCE=∠GAD', rule: 'same_arc' },
      { id: 'F05', statement: '∠BAC=∠GAD', rule: 'transitivity' }
    ],
    problem: {
      subproblems: [
        { id: 'P1', prompt: '△ABCと△AGDが合同であることを証明しなさい。' },
        { id: 'P2', prompt: '∠CAEを求めなさい。' }
      ]
    },
    proof,
    follow_up: generate2014FollowUp(parameters),
    generation: {
      template_id: TEMPLATE_2014,
      seed,
      parameters
    },
    validation: {
      parameters: parameterValidation,
      geometry: geometry.constraints ?? null
    }
  };
  finish({ template: TEMPLATE_2014, seed, answer: parameters.answerCAE });
  return result;
}

const GENERATORS = {
  [TEMPLATE_2014]: generate2014Problem,
  SHIZUOKA_DIAMETER_ISOSCELES_AA_001: generate2015,
  SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001: generate2016,
  SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001: generate2017,
  SHIZUOKA_CIRCLE_ISOSCELES_MOVING_POINT_ISOSCELES_2024_001: generate2024,
  SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_SIMILARITY_2025_001: generate2025,
  SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_CONGRUENCE_2026_001: generate2026
};

export class ProblemGenerator {
  constructor(options = {}) { this.options = options; }
  generate(options = {}) {
    const merged = { ...this.options, ...options };
    if (!merged.templateId) return generateAutoProblem(merged);
    const templateId = merged.templateId ?? TEMPLATE_2014;
    return generateProblem(templateId, merged);
  }
}

function difficultyProfileDescription(difficulty, templateId) {
  if (difficulty >= 8) return '最難関：分子が a+b√c の分数（循環小数を禁止）';
  if (difficulty === 7) return '発展：二次の無理数を含む厳密値（循環小数を禁止）';
  if (difficulty === 6) return '上級：平方根を含む厳密値（循環小数を禁止）';
  if (difficulty === 5 && templateId === 'SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001') return '標準〜発展：既約分数の数値答案';
  if (difficulty === 4) return '標準：複数段階の角度・長さ計算';
  return '基礎：整数または簡潔な厳密値';
}

export function generateProblem(templateId, options = {}) {
  logger.info('PROBLEM', 'テンプレート指定生成', { templateId, retries: options.retries ?? 5 });
  const generator = GENERATORS[templateId];
  if (!generator) throw new Error(`未知の問題テンプレートです: ${templateId}`);
  // Proof-first preflight: the reviewed target/rule plan must exist before
  // any coordinates or random parameters are constructed.
  const proofFirstPlan = assertProofFirstPlanReady(templateId);
  let lastError = null;
  for (let i = 0; i < (options.retries ?? 5); i++) {
    try {
      logger.debug('PROBLEM', `生成試行 ${i + 1}/${options.retries ?? 5}`, { templateId });
      const templateInfo = getTemplate(templateId);
      const filterDifficulty = options.filters?.difficulty;
      const requestedValue = options.difficulty
        ?? (filterDifficulty && filterDifficulty !== 'all' ? filterDifficulty : undefined)
        ?? templateInfo?.difficulty
        ?? 4;
      const parsedDifficulty = Number(requestedValue);
      const requestedDifficulty = Number.isInteger(parsedDifficulty) && parsedDifficulty >= 3 && parsedDifficulty <= 8
        ? parsedDifficulty : Number(templateInfo?.difficulty ?? 4);
      const generationOptions = { ...options, difficulty: requestedDifficulty };
      const result = generator(generationOptions);
      result.generation = {
        ...(result.generation ?? {}),
        difficulty: requestedDifficulty,
        difficulty_profile: difficultyProfileDescription(requestedDifficulty, templateId)
      };
      result.validation = { ...(result.validation ?? {}), proof_first_preflight: {
        version: proofFirstPlan.version, direction: proofFirstPlan.direction,
        target: proofFirstPlan.target, macro_rule: proofFirstPlan.rule,
        required_condition_count: proofFirstPlan.required_conditions.length,
        derivation_step_count: proofFirstPlan.derivation.length,
        construction_allowed: proofFirstPlan.construction_allowed
      }, proof_first_plan: proofFirstPlan
      };
      // 生成器自身のチェックとは独立して、保存済み座標から幾何条件を再計算する。
      const independentGeometryAudit = validateProblemGeometry(result);
      if (independentGeometryAudit.valid === false) {
        throw new Error(`独立幾何検証に失敗しました: ${independentGeometryAudit.errors.slice(0, 5).join(' / ')}`);
      }
      result.validation = {
        ...(result.validation ?? {}),
        independent_geometry_audit: independentGeometryAudit
      };
      logger.info('GEOMETRY_VALIDATE', '独立幾何検証完了', {
        status: independentGeometryAudit.status,
        valid: independentGeometryAudit.valid,
        checks: independentGeometryAudit.check_count,
        failures: independentGeometryAudit.failed_count
      });
      // 定理カタログ対応候補と逐次証明監査も記録する。未対応ステップを正しいと扱わない。
      result.validation = {
        ...(result.validation ?? {}),
        theorem_audit: auditGeneratedProblem(result)
      };
      // Strict, separately computed certificate. Partial is an acceptable
      // generation result; a mathematical contradiction is never labelled verified.
      const independentMathAudit = verifyProblemMathematics(result);
      result.validation = {
        ...(result.validation ?? {}),
        independent_math_audit: independentMathAudit
      };
      logger.info('MATH_VERIFY', '独立数学検証完了', {
        status: independentMathAudit.status,
        mathematicallyVerified: independentMathAudit.mathematically_verified,
        geometryChecks: independentMathAudit.summary.geometry_checks,
        proofGroups: independentMathAudit.summary.proof_groups,
        proofGroupsVerified: independentMathAudit.summary.fully_verified_proof_groups
      });
      if (independentMathAudit.status === 'failed') {
        throw new Error(`独立数学検証で矛盾を検出しました: ${[...independentMathAudit.errors, ...independentMathAudit.warnings].slice(0, 5).join(' / ')}`);
      }
      // Difficulty is checked after construction using actual proof and answer data.
      // Decimal fallbacks and mismatched radical answer forms fail closed.
      const difficultyAudit = assertDifficultyContract(result, requestedDifficulty, { strictFamily: Boolean(options.strictDifficultyFamily) });
      result.generation.difficulty_audit = difficultyAudit;
      result.validation.difficulty_contract = difficultyAudit;
      logger.info('DIFFICULTY_AUDIT', '難易度契約チェック完了', {
        level: requestedDifficulty, status: difficultyAudit.status,
        dimensions: difficultyAudit.dimensions
      });
      logger.info('PROBLEM', '生成成功', { templateId, attempt: i + 1 });
      return result;
    } catch (error) {
      lastError = error;
      logger.warn('PROBLEM', '生成試行に失敗', { templateId, attempt: i + 1, message: error.message });
    }
  }
  throw lastError ?? new Error('問題生成に失敗しました。');
}

export function generateAutoProblem(options = {}) {
  logger.info('PROBLEM', '自動テンプレート選択を開始', options.filters ?? {});
  const random = options.random ?? createSeededRandom(options.seed ?? Date.now());
  const ranked = rankTemplates(options.filters ?? {}, random);
  if (!ranked.length) throw new Error(`難易度${options.filters?.difficulty ?? ''}と条件に対応する問題テンプレートがありません。難易度を変更するか、詳細条件を減らしてください。`);

  // 最上位候補を選ぶ。条件が同点ならrankTemplates内の乱数で分散する。
  const selected = ranked[0];
  logger.info('PROBLEM', 'テンプレート選択結果', { template: selected.template.id, score: selected.score, reasons: selected.reasons });
  const result = generateProblem(selected.template.id, { ...options, strictDifficultyFamily: true });
  result.generation = {
    ...(result.generation ?? {}),
    auto_selected: true,
    selected_template: selected.template.id,
    selected_source_year: selected.template.year,
    selection_score: Number(selected.score.toFixed(3)),
    selection_reasons: selected.reasons
  };
  return result;
}

export function generateRandomProblem(options = {}) {
  return generateAutoProblem(options);
}

export function listTemplates(filters = {}) {
  return filterTemplates(filters);
}

export function getTemplateInfo(templateId) {
  return getTemplate(templateId);
}

export { TEMPLATE_CATALOG };

export function debugGenerate2014(seed) {
  const result = generate2014Problem({ seed });
  console.log(result);
  return result;
}
