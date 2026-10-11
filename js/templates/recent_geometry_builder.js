/**
 * Constraint-based coordinate reconstruction for the 2024-2026 families.
 * All coordinates are normalized to a unit circle; physical radius is stored
 * separately in the problem conditions for exact length/arc calculations.
 */
const EPS = 1e-9;
const TAU = Math.PI * 2;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const normAngle = d => ((d % 360) + 360) % 360;
const signedAngle = d => ((d + 180) % 360 + 360) % 360 - 180;
const round = n => Math.abs(n) < 5e-13 ? 0 : Number(n.toFixed(12));
const point = (angle, radius = 1) => ({ x: radius * Math.cos(rad(angle)), y: radius * Math.sin(rad(angle)) });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = v => Math.hypot(v.x, v.y);
const distance = (a, b) => length(sub(a, b));
const polar = p => normAngle(deg(Math.atan2(p.y, p.x)));
const angle = (a, b, c) => {
  const u = sub(a, b), v = sub(c, b), den = length(u) * length(v);
  if (den < EPS) throw new Error('角度計算に退化した線分が含まれています。');
  return deg(Math.acos(Math.max(-1, Math.min(1, dot(u, v) / den))));
};
const lineIntersection = (a, b, c, d) => {
  const u = sub(b, a), v = sub(d, c), den = cross(u, v);
  if (Math.abs(den) < EPS) throw new Error('平行または一致する直線の交点を計算できません。');
  const t = cross(sub(c, a), v) / den;
  return add(a, mul(u, t));
};
const lineCircleIntersections = (a, b, center, radius) => {
  const v = sub(b, a), q = sub(a, center);
  const aa = dot(v, v), bb = 2 * dot(q, v), cc = dot(q, q) - radius * radius;
  const discriminant = bb * bb - 4 * aa * cc;
  if (aa < EPS || discriminant < -EPS) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const ts = Math.abs(root) < EPS ? [-bb / (2 * aa)] : [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)];
  return ts.map(t => add(a, mul(v, t)));
};
const secondCircleIntersection = (start, through, center = { x: 0, y: 0 }, radius = 1) => {
  const hits = lineCircleIntersections(start, through, center, radius);
  const candidates = hits.filter(p => distance(p, start) > 1e-7);
  if (!candidates.length) throw new Error('円と直線の第2交点が見つかりません。');
  return candidates.sort((a, b) => distance(b, start) - distance(a, start))[0];
};
const onMinorArc = (p, a, b) => {
  const ap = normAngle(polar(p) - polar(a));
  const ab = normAngle(polar(b) - polar(a));
  const bp = normAngle(polar(p) - polar(b));
  if (ab <= 180) return ap <= ab + 1e-6;
  return bp <= 360 - ab + 1e-6;
};
const fraction = (n, d) => {
  n = Math.round(n); d = Math.round(d);
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const g = gcd(n, d); n /= g; d /= g;
  if (d < 0) { n = -n; d = -d; }
  return d === 1 ? String(n) : `${n}/${d}`;
};
const piMultiple = (n, d) => {
  const value = fraction(n, d);
  if (!value.includes('/')) return `${value}π`;
  const [num, den] = value.split('/');
  return `${num}π/${den}`;
};
const setPoint = (p, circle = false) => {
  const x = round(p.x), y = round(p.y);
  return { x, y, exact: [String(x), String(y)], ...(circle ? { polar_angle_degree: Number(polar(p).toFixed(6)) } : {}) };
};
const setCoords = (data, points, variants, physicalRadius = null, circleIds = []) => {
  const old = data.geometry.coordinates;
  const coords = {};
  for (const [id, p] of Object.entries(points)) coords[id] = setPoint(p, circleIds.includes(id));
  coords.O = setPoint({ x: 0, y: 0 });
  data.geometry.coordinates.points = coords;
  data.geometry.coordinates.variants = {};
  for (const [name, variant] of Object.entries(variants)) {
    data.geometry.coordinates.variants[name] = {
      ...(old.variants?.[name] ?? {}),
      points: Object.fromEntries(Object.entries(variant).map(([id, p]) => [id, setPoint(p, id === 'P' && data.metadata.year !== 2024)]))
    };
  }
  data.geometry.coordinate_system = {
    ...(data.geometry.coordinate_system ?? {}),
    type: 'normalized_euclidean_model',
    status: 'reconstructed_from_constraints',
    primary_model: 'unit_circle',
    radius: 1,
    ...(physicalRadius == null ? {} : { physical_radius_cm: physicalRadius }),
    origin: 'O=(0,0)',
    axis: 'x right, y up',
    coordinate_basis: '点を角度・線分条件・交点条件から再構成した正規化座標',
    note: '座標は表示用に単位円へ正規化。実寸は問題文の半径条件を参照。'
  };
};
const check = (name, actual, expected, tolerance = 1e-6) => ({ name, actual, expected, valid: Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, error: Number.isFinite(actual) ? Math.abs(actual - expected) : null });
const boolCheck = (name, valid, details = null) => ({ name, valid: Boolean(valid), ...(details == null ? {} : { details }) });
const storeChecks = (data, checks) => {
  const failed = checks.filter(c => !c.valid);
  data.validation = {
    ...(data.validation ?? {}),
    geometry: {
      status: failed.length ? 'constraint_reconstruction_failed' : 'constraint_reconstructed',
      valid: failed.length === 0,
      checks,
      errors: failed.map(c => `${c.name}: ${c.details ?? `${c.actual} vs ${c.expected}`}`),
      warnings: ['座標は表示用の正規化モデルです。最終的な幾何検証は独立バリデーターでも実施します。']
    },
    proof: { status: 'not-fully-reproved-after-reconstruction', valid: null }
  };
  data.metadata = { ...(data.metadata ?? {}), data_status: 'generated_variant', generated: true };
  data.source_analysis = { generated_variant: true, source_year: data.metadata.year, note: '元の過去問分析の数値を誤用しないため、生成後の条件はgeneration.parametersとgiven_conditionsを参照。' };
};

function rebuild2024(data, params) {
  const { bAngle, cAngle } = params;
  const O = { x: 0, y: 0 }, A = point(90), B = point(bAngle), C = point(cAngle);
  const ab = distance(A, B), ac = distance(A, C);
  if (!(ab < ac)) throw new Error('2024型の条件AB<ACが成立しません。');
  const D = add(A, mul(sub(C, A), ab / ac));
  const E = secondCircleIntersection(B, D, O, 1);
  const midpoint = mul(add(A, C), 0.5), acVector = sub(C, A);
  const perpendicularPoint = add(midpoint, { x: -acVector.y, y: acVector.x });
  const P1 = lineIntersection(A, E, midpoint, perpendicularPoint);
  const diameterCenter = mul(add(E, C), 0.5), diameterRadius = distance(E, C) / 2;
  const p2Candidates = lineCircleIntersections(A, E, diameterCenter, diameterRadius);
  const P2 = p2Candidates.filter(p => distance(p, E) > 1e-6).sort((p, q) => distance(p, E) - distance(q, E))[0];
  if (!P2) throw new Error('2024型の直角条件からP2を構成できません。');
  const F1 = lineIntersection(C, P1, B, E), F2 = lineIntersection(C, P2, B, E);
  const arcBC = Math.round(normAngle(cAngle - bAngle)), arcCE = Math.round(normAngle(polar(E) - cAngle));
  const ratioGcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  const ratio = `${arcBC / ratioGcd(arcBC, arcCE)}:${arcCE / ratioGcd(arcBC, arcCE)}`;
  const angleCFD = Math.round(angle(C, F2, D));
  const answer = Math.round(angle(A, B, E));
  const angleBAE = Math.round(angle(B, A, E)), angleAEB = Math.round(angle(A, E, B));
  setCoords(data, { O, A, B, C, D, E, F: F1 }, { P1: { P: P1, F: F1 }, P2: { P: P2, F: F2 } }, null, ['A', 'B', 'C', 'E']);
  const conditionUpdates = { C09: `arc BC : arc CE = ${ratio}`, C10: `∠CFD=${angleCFD}°` };
  data.given_conditions = data.given_conditions.map(c => conditionUpdates[c.id] ? { ...c, statement: conditionUpdates[c.id] } : c);
  data.problem.statement.parts.find(p => p.id === 'P2').answer = `${answer}°`;
  data.follow_up.answer = `${answer}°`;
  data.follow_up.solution_chain = [
    `∠EFP=∠CFD=${angleCFD}°`,
    `∠FEP=${90 - angleCFD}°`,
    `弧BC:弧CE=${ratio}`,
    `弧BEに対する円周角より∠BAE=${angleBAE}°`,
    `弧ABに対する円周角より∠AEB=${angleAEB}°`,
    `△ABEの内角の和より∠ABE=180°−${angleBAE}°−${angleAEB}°=${answer}°`
  ];
  if (data.validation?.answer) data.validation.answer.P2 = `${answer}°`;
  data.derived_facts = (data.derived_facts ?? []).map(f => {
    const updates = {
      F10: `∠EFP=∠CFD=${angleCFD}°`, F11: `∠FEP=${90 - angleCFD}°`, F12: `∠BAC:∠EAC=${ratio}`,
      F13: `∠BAE=${angleBAE}°`, F14: `∠AEB=${angleAEB}°`, F15: `∠ABE=180°−∠BAE−∠AEB`, F16: `∠ABE=${answer}°`, F17: `∠ABE=${answer}°`
    };
    return updates[f.id] ? { ...f, statement: updates[f.id] } : f;
  });
  data.geometry.relationships = (data.geometry.relationships ?? []).map(x => x.includes('arc BC : arc CE') ? `arc BC : arc CE = ${ratio} for P2` : x.includes('∠CFD=') ? `∠CFD=${angleCFD}° for P2` : x);
  const checks = [
    check('AB=AD', distance(A, B), distance(A, D)),
    check('A,D,Cの一直線性', Math.abs(cross(sub(D, A), sub(C, A))), 0),
    check('A,B,C,Eの円周上', Math.max(...[A, B, C, E].map(p => Math.abs(distance(p, O) - 1))), 0),
    check('PA=PC (P1)', distance(P1, A), distance(P1, C)),
    check('∠EFC=∠ABC (P1)', angle(E, F1, C), angle(A, B, C)),
    check('∠EPC=90° (P2)', angle(E, P2, C), 90),
    check('arc ratio BC:CE', arcBC / arcCE, Number(ratio.split(':')[0]) / Number(ratio.split(':')[1]), 1e-6),
    check('∠CFD', angle(C, F2, D), angleCFD, 0.51),
    check('∠ABE answer', angle(A, B, E), answer, 0.51),
    boolCheck('P1/P2がAE上', Math.abs(cross(sub(P1, A), sub(E, A))) < 1e-6 && Math.abs(cross(sub(P2, A), sub(E, A))) < 1e-6)
  ];
  storeChecks(data, checks);
  return { data, params: { ...params, angleCFD, answer, arcRatio: ratio, arcBC, arcCE } };
}

function rebuild2025(data, params) {
  const { cAngle, physicalRadius } = params;
  const O = { x: 0, y: 0 }, A = point(90), B = point(180), C = point(cAngle), D = point(normAngle(2 * cAngle - 90));
  const E = lineIntersection(A, C, B, D);
  const F = lineIntersection(A, B, E, add(E, sub(C, B)));
  const ab = distance(A, B), bd = distance(B, D);
  if (bd <= ab) throw new Error('2025型のBG=BAを構成できません。');
  const G1 = add(B, mul(sub(D, B), ab / bd));
  const P1 = secondCircleIntersection(A, G1, O, 1);
  const P2 = point(270);
  const G2 = lineIntersection(A, P2, B, D);
  const arcDP = Math.round(Math.min(normAngle(270 - polar(D)), normAngle(polar(D) - 270)));
  const answer = `${piMultiple(physicalRadius * Math.round(arcDP), 180)} cm`;
  const angleFEB = Math.round(angle(F, E, B));
  setCoords(data, { O, A, B, C, D, E, F }, { P1: { P: P1, F, G: G1 }, P2: { P: P2, F, G: G2 } }, physicalRadius, ['A', 'B', 'C', 'D']);
  data.geometry.relationships = (data.geometry.relationships ?? []).map(x => x.includes('∠FEB=') ? `∠FEB=${angleFEB}° for P2` : (x.includes('radius O=9') || x.includes('radius=9')) ? `radius=${physicalRadius} cm for P2` : x);
  data.given_conditions = data.given_conditions.map(c => {
    if (c.id === 'C09') return { ...c, statement: `∠FEB=${angleFEB}°` };
    if (c.id === 'C10') return { ...c, statement: `radius O=${physicalRadius} cm` };
    return c;
  });
  data.problem.statement.parts.find(p => p.id === 'P2').answer = answer;
  data.follow_up.answer = answer;
  const aCBD = Math.round(angle(C, B, D)), aCAD = Math.round(angle(C, A, D));
  const aACD = Math.round(angle(A, C, D)), aABD = Math.round(angle(A, B, D));
  const aABP = Math.round(angle(A, B, P2)), aDBP = Math.round(angle(D, B, P2));
  data.follow_up.solution_chain = [
    `∠CBD=${aCBD}°`, `∠CAD=${aCAD}°`, `∠ACD=${aACD}°`, `∠ABD=${aABD}°`,
    'APが直径より∠ABP=90°', `∠DBP=${aDBP}°`, `∠DOP=${arcDP}°`,
    `弧DP=2π×${physicalRadius}×${arcDP}/360=${answer.replace(' cm', '')}`
  ];
  if (data.validation?.answer) data.validation.answer.P2 = answer;
  data.derived_facts = (data.derived_facts ?? []).map(f => {
    const updates = {
      F14: `∠CBD=${aCBD}°`, F15: `∠CAD=${aCAD}°`, F16: `∠ACD=${aACD}°`, F17: `∠ABD=${aABD}°`,
      F18: '∠ABP=90°', F19: `∠DBP=${aDBP}°`, F20: `∠DOP=${arcDP}°`, F21: `arc DP=${answer}`
    };
    return updates[f.id] ? { ...f, statement: updates[f.id] } : f;
  });
  const checks = [
    ...[A, B, C, D, P1, P2].map((p, i) => check(`円周上の点${['A','B','C','D','P1','P2'][i]}`, distance(p, O), 1)),
    check('CA=CD', distance(C, A), distance(C, D)),
    check('BG=BA (P1)', distance(B, G1), distance(B, A)),
    check('A,G,Pの一直線性', Math.abs(cross(sub(G1, A), sub(P1, A))), 0),
    check('EF∥BC', Math.abs(cross(sub(F, E), sub(C, B))), 0),
    boolCheck('P1が小さい弧DC上', onMinorArc(P1, D, C)),
    check('APが直径 (P2)', distance(A, P2), 2),
    check('∠FEB', angle(F, E, B), angleFEB, 0.51),
    check('弧DPの中心角', arcDP, Math.min(normAngle(270 - polar(D)), normAngle(polar(D) - 270)))
  ];
  storeChecks(data, checks);
  return { data, params: { ...params, angleFEB, arcDP: Math.round(arcDP), answer } };
}

function rebuild2026(data, params) {
  const { arcCoeff, physicalRadius = 15 } = params;
  const theta = arcCoeff * 12;
  const a = 90, b = 270 - theta / 2, c = 270 + theta / 2, d = a + theta;
  const O = { x: 0, y: 0 }, A = point(a), B = point(b), C = point(c), D = point(d);
  const P1 = point(a + Math.abs(signedAngle(d - b)));
  const P2 = point(c + 180);
  const E = lineIntersection(A, B, C, D);
  const F1 = lineIntersection(A, B, C, P1), F2 = lineIntersection(A, B, C, P2);
  const anglePCA = Math.round(angle(P1, C, A)), angleBCD = Math.round(angle(B, C, D));
  const answer = `${Math.round(90 - theta / 4)}°`;
  const arcLength = `${arcCoeff}π cm`;
  setCoords(data, { O, A, B, C, D, E, F: F1 }, { P1: { P: P1, F: F1 }, P2: { P: P2, F: F2 } }, physicalRadius, ['A', 'B', 'C', 'D']);
  data.given_conditions = data.given_conditions.map(c => c.id === 'C09' ? { ...c, statement: `arc BC=${arcLength}` } : c);
  data.geometry.relationships = (data.geometry.relationships ?? []).map(x => x.includes('arc BC=') ? `arc BC=${arcLength} for P2` : x);
  data.problem.statement.parts.find(p => p.id === 'P2').answer = answer;
  data.follow_up.answer = answer;
  data.follow_up.solution_chain = [
    `半径${physicalRadius}cm、弧BC=${arcLength}より中心角∠BOC=${theta}°、よって円周角∠BAC=${theta / 2}°`,
    '∠DPB=∠DCB',
    '平行線と円周角より∠BPC=∠BAC=∠DBA=∠DCA',
    'よって∠DPC=∠BCA',
    `△ABCはAB=ACの二等辺三角形なので∠BCA=(180−${theta / 2})/2=${answer}`
  ];
  if (data.validation?.answer) data.validation.answer.P2 = answer;
  data.derived_facts = (data.derived_facts ?? []).map(f => {
    if (f.id === 'F13') return { ...f, statement: `∠BAC=${theta / 2}°` };
    if (f.id === 'F17') return { ...f, statement: `∠DPC=${answer}` };
    return f;
  });
  const checks = [
    ...[A, B, C, D, P1, P2].map((p, i) => check(`円周上の点${['A','B','C','D','P1','P2'][i]}`, distance(p, O), 1)),
    check('AB=AC', distance(A, B), distance(A, C)),
    check('AC∥BD', Math.abs(cross(sub(C, A), sub(D, B))), 0),
    check('∠PCA=∠BCD', angle(P1, C, A), angle(B, C, D)),
    check('FC=BC', distance(F1, C), distance(B, C)),
    check('∠AFC=∠DBC', angle(A, F1, C), angle(D, B, C)),
    check('CPが直径 (P2)', distance(C, P2), 2),
    check('arc BCの中心角', normAngle(c - b), theta)
  ];
  storeChecks(data, checks);
  return { data, params: { ...params, theta, anglePCA, angleBCD, answer } };
}

export function rebuildRecentGeometry(baseData, year, parameters) {
  const data = JSON.parse(JSON.stringify(baseData));
  let result;
  if (year === 2024) result = rebuild2024(data, parameters);
  else if (year === 2025) result = rebuild2025(data, parameters);
  else if (year === 2026) result = rebuild2026(data, parameters);
  else throw new Error(`未対応の近年テンプレートです: ${year}`);
  if (!result.data.validation.geometry.valid) {
    throw new Error(`幾何制約を満たさない生成結果です (${year}): ${result.data.validation.geometry.errors.join('; ')}`);
  }
  result.data.question_generation = { ...(result.data.question_generation ?? {}), generation_ready: true };
  result.data.generation = {
    ...(result.data.generation ?? {}),
    method: 'constraint_based_coordinate_reconstruction',
    uses_llm: false,
    generation_ready: true,
    parameters: result.params
  };
  return result;
}
