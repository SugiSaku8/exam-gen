import { logger } from '../logger.js';
import { BASE_2015 } from './2015.js';
import { BASE_2016 } from './2016.js';
import { BASE_2017 } from './2017.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seededRandom(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function choice(random, values) {
  return values[Math.floor(random() * values.length)];
}

function rad(deg) { return deg * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pointOnCircle(angle, radius = 1, center = { x: 0, y: 0 }) {
  const t = rad(angle);
  return { x: center.x + radius * Math.cos(t), y: center.y + radius * Math.sin(t) };
}
function cross(a, b) { return a.x * b.y - a.y * b.x; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function mul(a, s) { return { x: a.x * s, y: a.y * s }; }

function lineIntersection(p1, p2, p3, p4) {
  const r = sub(p2, p1);
  const s = sub(p4, p3);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-10) return null;
  const t = cross(sub(p3, p1), s) / den;
  return add(p1, mul(r, t));
}

function lineCircleIntersections(p, q, center, radius) {
  const d = sub(q, p);
  const f = sub(p, center);
  const aa = d.x * d.x + d.y * d.y;
  const bb = 2 * (f.x * d.x + f.y * d.y);
  const cc = f.x * f.x + f.y * f.y - radius * radius;
  const disc = bb * bb - 4 * aa * cc;
  if (disc < -1e-9) return [];
  const root = Math.sqrt(Math.max(0, disc));
  const t1 = (-bb - root) / (2 * aa);
  const t2 = (-bb + root) / (2 * aa);
  return [t1, t2].map(t => add(p, mul(d, t)));
}

function otherCircleIntersection(p, q, center, radius, known) {
  const xs = lineCircleIntersections(p, q, center, radius);
  xs.sort((a, b) => dist(b, known) - dist(a, known));
  return xs[0] ?? null;
}

function angleABC(a, b, c) {
  const u = sub(a, b);
  const v = sub(c, b);
  const dot = u.x * v.x + u.y * v.y;
  const cr = Math.abs(cross(u, v));
  return deg(Math.atan2(cr, dot));
}


/* =========================================================
 * 数値答案の複雑さ制御
 *
 * 許可する形:
 *   整数
 *   分数
 *   √n を分子にもつ分数（分母は整数、分母に根号を残さない）
 *
 * 小数の近似値や、複数の根号・根号の中に分数が入る形は
 * 入試問題の数値答案として採用しない。
 * ========================================================= */

function gcdInt(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

function isPerfectSquareInt(n) {
  if (!Number.isInteger(n) || n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function isSquareFreeInt(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let p = 2; p * p <= n; p++) if (n % (p * p) === 0) return false;
  return true;
}

function simplifyFraction(n, d) {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcdInt(n, d);
  return { n: n / g, d: d / g };
}

function rationalApprox(value, maxDenominator = 24, tolerance = 1e-8) {
  if (!Number.isFinite(value)) return null;
  for (let d = 1; d <= maxDenominator; d++) {
    const n = Math.round(value * d);
    if (Math.abs(value - n / d) <= tolerance) {
      return simplifyFraction(n, d);
    }
  }
  return null;
}

/**
 * 数値を「整数 / 分数 / √n分数」のいずれかに分類する。
 * 係数としてπを伴う場合は coefficient に対して判定する。
 */
function reduceRadicand(radicand) {
  let n = Math.trunc(radicand);
  let outside = 1;
  for (let p = 2; p * p <= n; p++) {
    let count = 0;
    while (n % (p * p) === 0) {
      n /= p * p;
      outside *= p;
      count++;
    }
  }
  return { outside, radicand: n };
}

function classifySimpleNumber(value, options = {}) {
  const maxDenominator = options.maxDenominator ?? 24;
  const maxRadicand = options.maxRadicand ?? 100;
  const tolerance = options.tolerance ?? 1e-8;
  const rational = rationalApprox(value, maxDenominator, tolerance);

  if (rational) {
    return {
      type: rational.d === 1 ? 'integer' : 'fraction',
      numerator: rational.n,
      denominator: rational.d,
      radicand: null
    };
  }

  // value = k√n / d を探索する。
  // k=1だけでなく、2√3/3 のような「平方根が分子に来る分数」も許可する。
  for (let d = 1; d <= maxDenominator; d++) {
    for (let k = 1; k <= maxDenominator; k++) {
      const n = value * d / k;
      const n2 = n * n;
      const roundedN2 = Math.round(n2);
      if (
        roundedN2 >= 1 &&
        roundedN2 <= maxRadicand &&
        !isPerfectSquareInt(roundedN2) &&
        Math.abs(n2 - roundedN2) <= tolerance
      ) {
        const reduced = reduceRadicand(roundedN2);
        const fraction = simplifyFraction(k * reduced.outside, d);
        return {
          type: 'sqrt_fraction',
          numerator: fraction.n,
          denominator: fraction.d,
          radicand: reduced.radicand
        };
      }
    }
  }

  // 二次の無理数を含む分数 (a+b√c)/d を厳密候補として照合する。
  // cは平方因子を含まない整数に限定し、循環小数への近似は行わない。
  const maxCoefficient = options.maxCoefficient ?? 100;
  for (let d = 1; d <= maxDenominator; d++) {
    for (let c = 2; c <= maxRadicand; c++) {
      if (!isSquareFreeInt(c)) continue;
      const root = Math.sqrt(c);
      for (let b = 1; b <= maxDenominator; b++) {
        const a = Math.round(value * d - b * root);
        if (a === 0 || Math.abs(a) > maxCoefficient) continue;
        // 既約な代数的分数だけを採用する。
        if (gcdInt(gcdInt(a, b), d) !== 1) continue;
        const candidate = (a + b * root) / d;
        if (Math.abs(value - candidate) <= tolerance) {
          return { type: 'quadratic_fraction', a, b, denominator: d, radicand: c };
        }
      }
    }
  }

  return null;
}

function formatSimpleNumber(value, options = {}) {
  const classified = classifySimpleNumber(value, options);
  if (!classified) return null;

  const sign = value < 0 ? '-' : '';
  if (classified.type === 'integer') return `${classified.numerator}`;
  if (classified.type === 'fraction') {
    return `${classified.numerator}/${classified.denominator}`;
  }
  if (classified.type === 'quadratic_fraction') {
    const a = classified.a;
    const bText = classified.b === 1 ? '' : String(classified.b);
    const numerator = `${a}${classified.b >= 0 ? '+' : ''}${bText}√${classified.radicand}`;
    return classified.denominator === 1 ? numerator : `(${numerator})/${classified.denominator}`;
  }
  const rootNumerator = classified.numerator === 1
    ? `√${classified.radicand}`
    : `${classified.numerator}√${classified.radicand}`;
  if (classified.denominator === 1) return `${sign}${rootNumerator}`;
  return `${sign}${rootNumerator}/${classified.denominator}`;
}

function formatPiMultiple(coefficient) {
  const formatted = formatSimpleNumber(coefficient);
  if (!formatted) return null;
  if (formatted === '0') return '0';
  if (formatted === '1') return 'π';
  if (formatted === '-1') return '-π';
  if (formatted.includes('/')) {
    const [n, d] = formatted.split('/');
    return `${n}π/${d}`;
  }
  return `${formatted}π`;
}

function assertSimpleNumericAnswer(value, context = '') {
  if (!classifySimpleNumber(value)) {
    throw new Error(
      `${context}の数値答案が許容形式ではありません: ${value}`
    );
  }
}

function assertSimplePiAnswer(coefficient, context = '') {
  if (!formatPiMultiple(coefficient)) {
    throw new Error(
      `${context}のπを含む数値答案が許容形式ではありません: ${coefficient}π`
    );
  }
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function pointRecord(id, p, role = 'point', extra = {}) {
  return {
    x: round(p.x, 12),
    y: round(p.y, 12),
    id,
    label: id,
    role,
    ...extra
  };
}

function makeGeometry(source, points, radius, center = 'O') {
  const objects = source.geometry.objects ?? {};
  const segments = (objects.segments ?? []).map(id => ({
    id,
    from: id.slice(0, 1),
    to: id.slice(1, 2)
  })).filter(s => points[s.from] && points[s.to]);

  const lines = (objects.lines ?? []).map(id => ({
    id,
    through: [id.slice(0, 1), id.slice(1, 2)]
  })).filter(l => points[l.through[0]] && points[l.through[1]]);

  return {
    coordinate_system: {
      ...(source.geometry.coordinate_system ?? {}),
      radius,
      generated_geometry: true
    },
    points,
    segments,
    lines,
    circles: [{
      id: source.geometry.coordinates?.circle?.id ?? 'O1',
      center,
      radius,
      through_points: source.geometry.coordinates?.circle?.through_points ?? []
    }],
    triangles: (objects.triangles ?? []).map(id => ({ id })),
    constraints: { valid: true, errors: [], warnings: [] }
  };
}

function copyGeneratedMetadata(data, year, parameters) {
  data.metadata = {
    ...data.metadata,
    id: `generated_${year}_math_07`,
    problem_number: 'generated'
  };
  data.generation = {
    ...(data.generation ?? {}),
    template_id: data.generation?.source_template ?? `SHIZUOKA_${year}_GENERATED`,
    generation_mode: 'rule_based_parameterized',
    uses_llm: false,
    seed: parameters.seed ?? null,
    parameters
  };
}

/* =========================================================
 * 2015
 *
 * 元条件を保ったまま A の位置を変える。
 * B,C は直径の両端、D は BC 上で BA=BD、
 * C を通る AD 平行線と円の交点を E とする。
 * F,G,H はすべて交点から再計算する。
 * ========================================================= */
function build2015(options, random) {
  const theta = options.theta ?? choice(random, [112, 120, 128, 136, 144, 152, 160]);
  const scale = options.scale ?? choice(random, [1, 2 / 3, 4 / 3]);
  const radius = 9 * scale;
  const R = 1;
  const O = { x: 0, y: 0 };
  const B = { x: -R, y: 0 };
  const C = { x: R, y: 0 };
  const A = pointOnCircle(theta, R);
  const BA = dist(B, A);
  const D = { x: -R + BA, y: 0 };
  const E = otherCircleIntersection(C, add(C, sub(A, D)), O, R, C);
  const F = lineIntersection(A, D, B, E);
  const G = lineIntersection(A, C, B, E);
  const H = otherCircleIntersection(A, D, O, R, A);
  if (!E || !F || !G || !H) throw new Error('2015型の交点生成に失敗しました。');

  const pts = {
    O: pointRecord('O', O, 'circle_center'),
    A: pointRecord('A', scalePoint(A, scale), 'circle_point', { polar_angle_degree: theta }),
    B: pointRecord('B', scalePoint(B, scale), 'circle_point', { polar_angle_degree: 180 }),
    C: pointRecord('C', scalePoint(C, scale), 'circle_point', { polar_angle_degree: 0 }),
    D: pointRecord('D', scalePoint(D, scale), 'point_on_segment', { definition: 'D∈BC and BD=BA' }),
    E: pointRecord('E', scalePoint(E, scale), 'circle_point'),
    F: pointRecord('F', scalePoint(F, scale), 'intersection', { definition: 'AD∩BE' }),
    G: pointRecord('G', scalePoint(G, scale), 'intersection', { definition: 'AC∩BE' }),
    H: pointRecord('H', scalePoint(H, scale), 'circle_point')
  };
  pts.O = pointRecord('O', O, 'circle_center');

  const unitGeometry = makeGeometry(BASE_2015, pts, radius);
  const angleCDH = angleABC(C, D, H);
  const chordArcAngle = angleABC(C, D, H) * 2;
  const arcLength = 2 * Math.PI * radius * (chordArcAngle / 360);
  const answerCoefficient = arcLength / Math.PI;
  assertSimplePiAnswer(answerCoefficient, '2015型・弧CHの長さ');
  const answer = formatPiMultiple(answerCoefficient);

  const data = clone(BASE_2015);
  copyGeneratedMetadata(data, 2015, { theta, scale, angleCDH: round(angleCDH, 2), radius, seed: options.seed ?? null });
  data.geometryModel = unitGeometry;
  data.geometry = unitGeometry;
  data.problem.parts[1].question = `ADを延長し、円Oとの交点をHとする。∠CDH=${round(angleCDH, 0)}°、円Oの半径が${round(radius, 2)}cmのとき、弧CHの長さを求めなさい。`;
  data.problem.parts[1].target.answer = answer;
  data.follow_up.P2.givens.radius = formatGeneratedLength(radius);
  data.follow_up.P2.givens.angle_CDH = round(angleCDH, 0);
  data.follow_up.P2.answer = answer;
  data.follow_up.P2.substitution = `L=2π×${formatGeneratedLength(radius)}×${round(chordArcAngle, 0)}/360`;
  return data;
}

function scalePoint(p, scale) { return { x: p.x * scale, y: p.y * scale }; }

/* =========================================================
 * 2016
 *
 * AD∥BC を保ちながら弧AD・弧DCを変更する。
 * E,F,Hを構造から再計算するため、単なる図形変形ではない。
 * ========================================================= */
function build2016(options, random) {
  const arcAD = options.arcAD ?? choice(random, [30, 36, 42, 48, 54, 60]);
  const arcDC = options.arcDC ?? choice(random, [54, 66, 78, 90, 102, 114]);
  const alpha = options.alpha ?? choice(random, [35, 50, 65, 80, 100]);
  const angleFHC = options.angleFHC ?? null;
  const scale = options.scale ?? choice(random, [0.9, 1, 1.15, 1.3]);
  const R = scale;
  const center = { x: 0, y: 0 };

  const D0 = pointOnCircle(alpha, 1);
  const A0 = pointOnCircle(alpha + arcAD, 1);
  const C0 = pointOnCircle(alpha - arcDC, 1);
  const B0 = pointOnCircle(alpha + arcAD + arcDC, 1);

  const D = scalePoint(D0, scale);
  const A = scalePoint(A0, scale);
  const C = scalePoint(C0, scale);
  const B = scalePoint(B0, scale);
  const E = lineIntersection(D, add(D, sub(A, C)), B, C);
  const F = lineIntersection(B, E, D, add(D, sub(B, A)));
  const G = lineIntersection(D, B, A, C);
  const H = lineIntersection(D, add(D, sub(B, A)), A, C);
  if (!E || !F || !G || !H) throw new Error('2016型の交点生成に失敗しました。');

  const fHc = angleABC(F, H, C);
  if (angleFHC != null && Math.abs(fHc - angleFHC) > 0.5) throw new Error('指定した∠FHCと構造が一致しません。');
  const fdc = angleABC(F, D, C);
  const acd = angleABC(A, C, D);

  const pts = {
    O: pointRecord('O', center, 'circle_center'),
    A: pointRecord('A', A, 'circle_point'), B: pointRecord('B', B, 'circle_point'),
    C: pointRecord('C', C, 'circle_point'), D: pointRecord('D', D, 'circle_point'),
    E: pointRecord('E', E, 'line_intersection'), F: pointRecord('F', F, 'line_intersection'),
    G: pointRecord('G', G, 'intersection'), H: pointRecord('H', H, 'intersection')
  };
  const geometry = makeGeometry(BASE_2016, pts, R);
  const data = clone(BASE_2016);
  copyGeneratedMetadata(data, 2016, { arcAD, arcDC, alpha, scale, angleFHC: round(fHc, 0), angleFDC: round(fdc, 0), angleACD: round(acd, 0), seed: options.seed ?? null });
  data.geometryModel = geometry;
  data.geometry = geometry;
  data.problem.parts[1].question = `弧AD:弧DC=${arcAD}:${arcDC}、∠FHC=${round(fHc, 0)}°のとき、∠FDCの大きさを求めなさい。`;
  data.problem.parts[1].target.answer = round(fdc, 0);
  data.follow_up.P2.givens.arc_AD_to_DC = `${arcAD}:${arcDC}`;
  data.follow_up.P2.givens.angle_FHC = round(fHc, 0);
  data.follow_up.P2.answer = round(fdc, 0);
  data.follow_up.P2.formula = `∠FDC=${round(fdc, 0)}°`;
  return data;
}

/* =========================================================
 * 2017
 *
 * Dを弧ACの中点として配置し、BDを角の二等分線にする。
 * EをAC上に置き、BF=EFを満たすFを方程式から求める。
 * GもFE∩ADから再計算する。
 * ========================================================= */
function solveEqualDistancePoint(B, C, E) {
  const v = sub(C, B);
  const w = sub(B, E);
  const aa = v.x * v.x + v.y * v.y - (v.x * v.x + v.y * v.y);
  // |s v|^2 = |B+s v-E|^2 -> 0 = |w|^2 + 2s(w·v)
  const denom = 2 * (w.x * v.x + w.y * v.y);
  if (Math.abs(denom) < 1e-10) return null;
  const s = -(w.x * w.x + w.y * w.y) / denom;
  if (s <= 0.01 || s >= 0.99) return null;
  return add(B, mul(v, s));
}

function formatNestedRadicalLength(value) {
  if (!(Number.isFinite(value) && value > 0)) return null;
  const square = value * value;
  for (let d = 1; d <= 24; d++) {
    for (let c = 2; c <= 30; c++) {
      if (!isSquareFreeInt(c)) continue;
      for (let b = -12; b <= 12; b++) {
        if (b === 0) continue;
        const a = Math.round(square * d - b * Math.sqrt(c));
        if (a === 0 || Math.abs(a) > 50 || gcdInt(gcdInt(a, b), d) !== 1) continue;
        if (Math.abs(square - (a + b * Math.sqrt(c)) / d) > 1e-8) continue;
        const rootTerm = `${Math.abs(b) === 1 ? '' : Math.abs(b)}√${c}`;
        const inside = `${a}${b > 0 ? '+' : '−'}${rootTerm}`;
        return d === 1 ? `√(${inside})` : `√((${inside})/${d})`;
      }
    }
  }
  return null;
}

function formatGeneratedLength(value, exactText = null) {
  if (exactText) return exactText;
  const simple = formatSimpleNumber(value);
  if (simple) return simple;
  // 中間的な補助線分だけは、必要に応じて厳密な二重根号で記録する。
  // 最終的な数値答案は assertSimpleNumericAnswer でより簡単な形式に制限する。
  const nested = formatNestedRadicalLength(value);
  if (nested) return nested;
  throw new Error(`生成された長さを有限の厳密表現にできません: ${value}`);
}

function build2017(options, random) {
  const simpleShapes = [
    { halfArc: 60, bAngle: 240, ratio: [1, 1], scale: 2, scaleText: '2' },
    { halfArc: 60, bAngle: 300, ratio: [1, 2], scale: Math.sqrt(3), scaleText: '√3' },
    { halfArc: 90, bAngle: 270, ratio: [1, 1], scale: Math.sqrt(2), scaleText: '√2' }
  ];
  const difficultyShapes = {
    3: { halfArc: 60, bAngle: 240, ratio: [1, 1], scale: 2, scaleText: '2' },
    4: { halfArc: 60, bAngle: 300, ratio: [1, 2], scale: Math.sqrt(3), scaleText: '√3' },
    5: { halfArc: 60, bAngle: 300, ratio: [1, 2], scale: Math.sqrt(3), scaleText: '√3' },
    6: { halfArc: 60, bAngle: 240, ratio: [1, 1], scale: 2, scaleText: '2' },
    7: { halfArc: 60, bAngle: 300, ratio: [1, 2], scale: 1, scaleText: '1' },
    8: { halfArc: 60, bAngle: 240, ratio: [1, 1], scale: 1, scaleText: '1' }
  };
  const requestedDifficulty = Number(options.difficulty);
  const selectedShape = difficultyShapes[requestedDifficulty] ?? choice(random, simpleShapes);
  const halfArc = options.halfArc ?? selectedShape.halfArc;
  const bAngle = options.bAngle ?? selectedShape.bAngle;
  const ratio = options.ratio ?? selectedShape.ratio;
  const scale = options.scale ?? selectedShape.scale;
  const scaleText = options.scaleText ?? selectedShape.scaleText;
  const R = scale;
  const A = pointOnCircle(0, R);
  const D = pointOnCircle(halfArc, R);
  const C = pointOnCircle(2 * halfArc, R);
  const B = pointOnCircle(bAngle, R);
  const E = add(A, mul(sub(C, A), ratio[0] / (ratio[0] + ratio[1])));
  const F = solveEqualDistancePoint(B, C, E);
  if (!F) throw new Error('2017型のBF=EFを満たすFの生成に失敗しました。');
  const G = lineIntersection(E, F, A, D);
  if (!G) throw new Error('2017型のG生成に失敗しました。');

  const AD = dist(A, D), AE = dist(A, E), EC = dist(E, C), AG = dist(A, G), DG = dist(D, G);
  const areaCDE = Math.abs(cross(sub(C, D), sub(E, D))) / 2;
  const areaDGE = Math.abs(cross(sub(G, D), sub(E, D))) / 2;
  const areaRatio = areaCDE / areaDGE;
  assertSimpleNumericAnswer(areaRatio, '2017型・面積比');
  const areaRatioAnswer = formatSimpleNumber(areaRatio);
  const O = circumcenter(A, C, D);
  const pts = {
    O: pointRecord('O', O, 'circle_center'), A: pointRecord('A', A, 'circle_point'),
    B: pointRecord('B', B, 'circle_point'), C: pointRecord('C', C, 'circle_point'),
    D: pointRecord('D', D, 'circle_point'), E: pointRecord('E', E, 'intersection'),
    F: pointRecord('F', F, 'construction_point'), G: pointRecord('G', G, 'intersection')
  };
  const geometry = makeGeometry(BASE_2017, pts, dist(O, A));
  const data = clone(BASE_2017);
  copyGeneratedMetadata(data, 2017, { halfArc, bAngle, ratio, scale, scaleText, seed: options.seed ?? null });
  data.geometryModel = geometry;
  data.geometry = geometry;
  let adText = formatGeneratedLength(AD);
  let aeText = formatGeneratedLength(AE);
  let ecText = formatGeneratedLength(EC);
  if (halfArc === 60 && bAngle === 240 && ratio[0] === 1 && ratio[1] === 1 && Math.abs(scale - 2) < 1e-8) {
    adText = '2'; aeText = '√3'; ecText = '√3';
  } else if (halfArc === 60 && bAngle === 300 && ratio[0] === 1 && ratio[1] === 2 && Math.abs(scale - Math.sqrt(3)) < 1e-8) {
    adText = '√3'; aeText = '1'; ecText = '2';
  } else if (halfArc === 90 && bAngle === 270 && ratio[0] === 1 && ratio[1] === 1 && Math.abs(scale - Math.sqrt(2)) < 1e-8) {
    adText = '2'; aeText = '√2'; ecText = '√2';
  }
  let numericAnswer = areaRatioAnswer;
  let numericTask = 'area_ratio';
  let numericSolutionChain = null;
  const difficulty = Number(options.difficulty);
  if (difficulty >= 6 && difficulty <= 8) {
    const multiplier = difficulty === 8 ? 3 : difficulty === 7 ? 2 : 1;
    const numericValue = AD + multiplier * AE;
    assertSimpleNumericAnswer(numericValue, `難易度${difficulty}・線分の長さの和`);
    numericAnswer = formatSimpleNumber(numericValue);
    numericTask = difficulty === 8 ? 'AD+3AE' : difficulty === 7 ? 'AD+2AE' : 'AD+AE';
    data.problem.parts[1].question = `AD=${adText}cm、AE=${aeText}cm、EC=${ecText}cmのとき、${numericTask}の値を求めなさい。答えは最も簡単な厳密な形で表しなさい。`;
    data.problem.parts[1].unit = 'cm';
    data.follow_up.P2.unit = ' cm';
    delete data.follow_up.P2.formula;
    delete data.follow_up.P2.substitution;
    numericSolutionChain = [
      `AD=${adText}、AE=${aeText}を用いる。`,
      `${numericTask}を代入すると、${numericAnswer}となる。`
    ];
  } else {
    data.problem.parts[1].question = `AD=${adText}cm、AE=${aeText}cm、EC=${ecText}cmのとき、△CDEの面積は△DGEの面積の何倍か答えなさい。`;
  }
  data.problem.parts[1].target.answer = numericAnswer;
  data.follow_up.P2.answer = numericAnswer;
  if (numericSolutionChain) data.follow_up.P2.solution_chain = numericSolutionChain;
  const exactAD = formatGeneratedLength(AD);
  const exactAE = formatGeneratedLength(AE);
  const exactEC = formatGeneratedLength(EC);
  // AG/DGは最終設問で与えない補助線分。厳密な許容形式に落とせない場合は
  // 近似小数を保存せず、値を未設定として扱う（誤った循環小数の表示を防ぐ）。
  let exactAG = null, exactDG = null;
  try { exactAG = formatGeneratedLength(AG); } catch { /* 補助値は省略 */ }
  try { exactDG = formatGeneratedLength(DG); } catch { /* 補助値は省略 */ }
  data.follow_up.P2.givens = { AD: exactAD, AE: exactAE, EC: exactEC };
  data.variables.AG.value = exactAG;
  data.variables.DG.value = exactDG;
  data.generation.parameters.derived = { AD: exactAD, AE: exactAE, EC: exactEC, areaRatio: areaRatioAnswer, targetAnswer: numericAnswer, numericTask };
  if (exactAG !== null) data.generation.parameters.derived.AG = exactAG;
  if (exactDG !== null) data.generation.parameters.derived.DG = exactDG;
  return data;
}

function circumcenter(A, B, C) {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-10) throw new Error('外接円が定まりません。');
  const a2 = A.x*A.x + A.y*A.y;
  const b2 = B.x*B.x + B.y*B.y;
  const c2 = C.x*C.x + C.y*C.y;
  return {
    x: (a2*(B.y-C.y) + b2*(C.y-A.y) + c2*(A.y-B.y))/d,
    y: (a2*(C.x-B.x) + b2*(A.x-C.x) + c2*(B.x-A.x))/d
  };
}

export function generate2015(options = {}) {
  const finish = logger.time('PROBLEM', 'generate2015');
  logger.debug('PROBLEM', 'generate2015 options', options);
  const result = build2015(options, seededRandom(options.seed ?? Date.now()));
  finish({ template: result.generation?.template_id, seed: result.generation?.seed });
  return result;
}
export function generate2016(options = {}) {
  const finish = logger.time('PROBLEM', 'generate2016');
  logger.debug('PROBLEM', 'generate2016 options', options);
  const result = build2016(options, seededRandom(options.seed ?? Date.now()));
  finish({ template: result.generation?.template_id, seed: result.generation?.seed });
  return result;
}
export function generate2017(options = {}) {
  const finish = logger.time('PROBLEM', 'generate2017');
  logger.debug('PROBLEM', 'generate2017 options', options);
  const result = build2017(options, seededRandom(options.seed ?? Date.now()));
  finish({ template: result.generation?.template_id, seed: result.generation?.seed });
  return result;
}
