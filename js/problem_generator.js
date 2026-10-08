import { generateGeometry, geometryToJSON } from './geometry_solver.js';
import { TEMPLATE_CATALOG, filterTemplates, rankTemplates, getTemplate } from './template_registry.js';
import { generate2015, generate2016, generate2017 } from './templates/canonical_generators.js';

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
  const unitAngle = options.unitAngle ?? randomChoice(random, [20, 22, 24, 26, 28, 30, 32, 34]);
  const angleA = options.angleA ?? randomChoice(random, [60, 75, 90, 105, 120]);
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
  const seed = options.seed ?? Date.now();
  const random = createSeededRandom(seed);
  const parameters = generate2014Parameters(options, random);
  const parameterValidation = validate2014Parameters(parameters);
  if (!parameterValidation.valid) throw new Error(parameterValidation.errors.join('\n'));

  const geometry = generateGeometry(TEMPLATE_2014, parameters);
  const proof = generate2014Proof();

  return {
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
}

const GENERATORS = {
  [TEMPLATE_2014]: generate2014Problem,
  SHIZUOKA_DIAMETER_ISOSCELES_AA_001: generate2015,
  SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001: generate2016,
  SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001: generate2017
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

export function generateProblem(templateId, options = {}) {
  const generator = GENERATORS[templateId];
  if (!generator) throw new Error(`未知の問題テンプレートです: ${templateId}`);
  let lastError = null;
  for (let i = 0; i < (options.retries ?? 5); i++) {
    try { return generator(options); }
    catch (error) { lastError = error; }
  }
  throw lastError ?? new Error('問題生成に失敗しました。');
}

export function generateAutoProblem(options = {}) {
  const random = options.random ?? createSeededRandom(options.seed ?? Date.now());
  const ranked = rankTemplates(options.filters ?? {}, random);
  if (!ranked.length) throw new Error('生成可能な問題テンプレートがありません。');

  // 最上位候補を選ぶ。条件が同点ならrankTemplates内の乱数で分散する。
  const selected = ranked[0];
  const result = generateProblem(selected.template.id, options);
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
