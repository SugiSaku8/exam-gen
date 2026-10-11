/**
 * Deterministic formal proof schema registry for the Shizuoka proof generator.
 *
 * A schema is a reviewed, template-specific proof plan. It is deliberately NOT
 * advertised as a universal geometry prover: a schema certificate proves that
 * a generated instance matches a known inference plan, while independent
 * geometry and answer audits still run separately. Unknown templates/rules,
 * missing premises, reordered dependencies, or target mismatches fail closed.
 */

export const FORMAL_RULE_CATALOG = Object.freeze({
  'given': { name: '仮定', arity: [1, 1], output: 'any' },
  'circle.same-arc-inscribed-angles': { name: '同じ弧に対する円周角', arity: [1, 3], output: 'angle-equality' },
  'circle.diameter-right-angle': { name: '直径に対する円周角', arity: [1, 2], output: 'right-angle' },
  'parallel.transfer-perpendicularity': { name: '垂直な直線に平行な直線も垂直', arity: [2, 3], output: 'right-angle' },
  'triangle.isosceles-apex-altitude-bisects-angle': { name: '二等辺三角形の頂点から底辺への垂線は頂角を二等分', arity: [2, 3], output: 'angle-equality' },
  'parallel.alternate-interior-angles': { name: '平行線の錯角', arity: [1, 2], output: 'angle-equality' },
  'angle-equality.implies-parallel': { name: '錯角が等しいとき二直線は平行', arity: [1, 2], output: 'parallel' },
  'circle.equal-inscribed-angles-imply-equal-chords': { name: '等しい円周角に対する弦は等しい', arity: [1, 3], output: 'side-equality' },
  'angle.transitivity': { name: '角の等しさの推移律', arity: [2, 4], output: 'angle-equality' },
  'triangle.isosceles-base-angles': { name: '二等辺三角形の底角', arity: [1, 3], output: 'angle-equality' },
  'triangle.isosceles-equal-sides': { name: '等しい角に対する辺は等しい', arity: [1, 3], output: 'side-equality' },
  'triangle.angle-sum': { name: '三角形の内角の和', arity: [1, 3], output: 'angle-equation' },
  'triangle.exterior-angle': { name: '三角形の外角', arity: [1, 3], output: 'angle-equation' },
  'triangle.similarity-aa': { name: '相似条件（二角）', arity: [2, 4], output: 'similarity' },
  'triangle.congruence-asa': { name: '合同条件（一辺と両端の角）', arity: [3, 5], output: 'congruence' },
  'parallelogram.from-opposite-sides-parallel': { name: '二組の対辺が平行なら平行四辺形', arity: [2, 4], output: 'parallelogram' },
  'parallelogram.opposite-sides-equal': { name: '平行四辺形の対辺は等しい', arity: [1, 2], output: 'side-equality' },
  'side-equality.transitivity': { name: '辺の等しさの推移律', arity: [2, 3], output: 'side-equality' },
  'side-equality.transitivity.2016': { name: '2016型の辺の等しさの推移律', arity: [2, 2], output: 'side-equality' },
  'isosceles-parallel-aa.2015': { name: '2015型：直径・二等辺・平行線から相似', arity: [3, 8], output: 'similarity' },
  'parallelogram-length-chain.2016': { name: '2016型：平行四辺形を介した長さの推移', arity: [2, 8], output: 'side-equality' },
  'angle-bisector-circle-aa.2017': { name: '2017型：角の二等分線・円周角から相似', arity: [1, 10], output: ['angle-equality','similarity'] },
  'moving-point-equal-base-angles.2024': { name: '2024型：動点の角追跡から二等辺三角形', arity: [1, 8], output: ['angle-equality','side-equality'] },
  'circle-parallel-aa.2025': { name: '2025型：円周角・平行線による二角相似', arity: [1, 8], output: ['angle-equality','similarity'] },
  'circle-parallel-asa.2026': { name: '2026型：円周角・平行線・二等辺から合同', arity: [1, 10], output: ['angle-equality','side-equality','congruence'] },
  'circle-parallel-asa.2014': { name: '2014型：円周角・錯角・ASA合同', arity: [1, 8], output: ['angle-equality','congruence'] }
});


const RULE_INPUTS = Object.freeze({
  'circle.same-arc-inscribed-angles': [['cyclic','incidence']],
  'circle.diameter-right-angle': [['diameter'], ['cyclic','incidence']],
  'parallel.transfer-perpendicularity': [['parallel'], ['right-angle']],
  'parallel.alternate-interior-angles': [['parallel'], ['any','angle-equality','incidence']],
  'angle-equality.implies-parallel': [['angle-equality']],
  'circle.equal-inscribed-angles-imply-equal-chords': [['angle-equality'], ['cyclic','incidence']],
  'angle.transitivity': [['angle-equality'], ['angle-equality']],
  'triangle.isosceles-base-angles': [['side-equality']],
  'triangle.isosceles-equal-sides': [['angle-equality']],
  'triangle.isosceles-apex-altitude-bisects-angle': [['side-equality'], ['right-angle']],
  'triangle.similarity-aa': [['angle-equality'], ['angle-equality']],
  'triangle.congruence-asa': [['side-equality'], ['angle-equality'], ['angle-equality']],
  'parallelogram.from-opposite-sides-parallel': [['parallel'], ['parallel','incidence']],
  'parallelogram.opposite-sides-equal': [['parallelogram']],
  'side-equality.transitivity': [['side-equality'], ['side-equality']],
  'side-equality.transitivity.2016': [['side-equality'], ['side-equality']]
});

const SCHEMAS = Object.freeze({
  SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001: {
    year: 2014, target: '△ABC≡△AGD', rule: 'circle-parallel-asa.2014',
    conditionChecks: [
      { id: 'C01', type: 'legacy_text', contains: ['A','B','C','D'] },
      { id: 'C02', type: 'legacy_text', contains: ['AC','AD'] },
      { id: 'C03', type: 'legacy_text', contains: ['BD','CE'] }
    ],
    derivation: [
      { id: 'D01', rule: 'given', conclusion: 'side-equality(AC,AD)', premises: ['C02'] },
      { id: 'D02', rule: 'circle-parallel-asa.2014', conclusion: 'angle-equality(ACB,ADG)', premises: ['C01','D01'] },
      { id: 'D03', rule: 'circle-parallel-asa.2014', conclusion: 'angle-equality(BAC,BDC)', premises: ['C01','D02'] },
      { id: 'D04', rule: 'parallel.alternate-interior-angles', conclusion: 'angle-equality(BDC,DCE)', premises: ['C03','D03'] },
      { id: 'D05', rule: 'circle-parallel-asa.2014', conclusion: 'angle-equality(DCE,GAD)', premises: ['C01','D04'] },
      { id: 'D06', rule: 'angle.transitivity', conclusion: 'angle-equality(BAC,GAD)', premises: ['D03','D04','D05'] },
      { id: 'D07', rule: 'circle-parallel-asa.2014', conclusion: 'congruence(ABC,AGD)', premises: ['D01','D02','D06'] }
    ]
  },
  SHIZUOKA_DIAMETER_ISOSCELES_AA_001: {
    year: 2015, target: '△FBD∽△ECG', rule: 'isosceles-parallel-aa.2015',
    conditionChecks: [
      { id: 'C01', type: 'concyclic', contains: ['A','B','C'] },
      { id: 'C02', type: 'diameter', contains: ['B','C'] },
      { id: 'C04', type: 'equal_length', contains: ['BA','BD'] },
      { id: 'C05', type: 'parallel', contains: ['CE','AD'] },
      { id: 'C07', type: 'intersection', contains: ['G','BE','AC'] },
      { id: 'C08', type: 'circle_intersection', contains: ['E','CE','O1'] }
    ],
    derivation: [
      { id: 'D01', rule: 'circle.diameter-right-angle', conclusion: 'right-angle(CEG)', premises: ['C02','C08'] },
      { id: 'D02', rule: 'parallel.transfer-perpendicularity', conclusion: 'right-angle(DFB)', premises: ['C05','D01'] },
      { id: 'D03', rule: 'triangle.isosceles-apex-altitude-bisects-angle', conclusion: 'angle-equality(ABF,FBD)', premises: ['C04','D02'] },
      { id: 'D04', rule: 'circle.same-arc-inscribed-angles', conclusion: 'angle-equality(ABF,ECG)', premises: ['C01','C07'] },
      { id: 'D05', rule: 'isosceles-parallel-aa.2015', conclusion: 'similarity(FBD,ECG)', premises: ['D01','D02','D03','D04'] }
    ]
  },
  SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001: {
    year: 2016, target: 'BF=EC', rule: 'parallelogram-length-chain.2016',
    conditionChecks: [
      { id: 'C01', type: 'concyclic', contains: ['A','B','C','D'] },
      { id: 'C02', type: 'parallel', contains: ['AD','BC'] },
      { id: 'C03', type: 'parallel', contains: ['DE','AC'] },
      { id: 'C04', type: 'collinear', contains: ['B','F','E'] },
      { id: 'C05', type: 'angle_equal', contains: ['ACD','BDF'] }
    ],
    derivation: [
      { id: 'D01', rule: 'circle.same-arc-inscribed-angles', conclusion: 'angle-equality(BDF,ACD)', premises: ['C01'] },
      { id: 'D02', rule: 'angle-equality.implies-parallel', conclusion: 'parallel(DF,AB)', premises: ['D01'] },
      { id: 'D03', rule: 'parallelogram.from-opposite-sides-parallel', conclusion: 'parallelogram(ABFD)', premises: ['D02','C02','C04'] },
      { id: 'D04', rule: 'parallelogram.opposite-sides-equal', conclusion: 'side-equality(BF,AD)', premises: ['D03'] },
      { id: 'D05', rule: 'parallelogram.from-opposite-sides-parallel', conclusion: 'parallelogram(ADEC)', premises: ['C02','C03'] },
      { id: 'D06', rule: 'parallelogram.opposite-sides-equal', conclusion: 'side-equality(AD,EC)', premises: ['D05'] },
      { id: 'D07', rule: 'side-equality.transitivity.2016', conclusion: 'side-equality(BF,EC)', premises: ['D04','D06'] }
    ]
  },
  SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001: {
    year: 2017, target: '△AEG∽△CDE', rule: 'angle-bisector-circle-aa.2017',
    conditionChecks: [
      { id: 'C01', type: 'concyclic', contains: ['A','B','C'] },
      { id: 'C02', type: 'angle_bisector', contains: ['B','D'] },
      { id: 'C05', type: 'equal_length', contains: ['BF','EF'] }
    ],
    derivation: [
      { id: 'D01', rule: 'given', conclusion: 'angle-equality(ABD,DBC)', premises: ['C02'] },
      { id: 'D02', rule: 'circle.equal-inscribed-angles-imply-equal-chords', conclusion: 'side-equality(AD,DC)', premises: ['D01','C01'] },
      { id: 'D03', rule: 'triangle.isosceles-base-angles', conclusion: 'angle-equality(CAD,DCA)', premises: ['D02'] },
      { id: 'D04', rule: 'angle-bisector-circle-aa.2017', conclusion: 'angle-equality(EAG,DCE)', premises: ['D03'] },
      { id: 'D05', rule: 'angle-bisector-circle-aa.2017', conclusion: 'angle-equality(AEG,CDE)', premises: ['C03','D01','D04'] },
      { id: 'D06', rule: 'angle-bisector-circle-aa.2017', conclusion: 'similarity(AEG,CDE)', premises: ['D04','D05'] }
    ]
  },
  SHIZUOKA_CIRCLE_ISOSCELES_MOVING_POINT_ISOSCELES_2024_001: {
    year: 2024, target: 'PA=PC', rule: 'moving-point-equal-base-angles.2024',
    conditionChecks: [
      { id: 'C01', type: 'incidence', contains: ['A','B','C','E'] },
      { id: 'C02', type: 'length_equality', contains: ['AB','AD'] },
      { id: 'C03', type: 'collinear', contains: ['A','D','C'] },
      { id: 'C04', type: 'collinear', contains: ['B','D','E'] },
      { id: 'C05', type: 'collinear', contains: ['A','P','E'] },
      { id: 'C07', type: 'angle_equality', contains: [] }
    ],
    derivation: [
      { id: 'D01', rule: 'triangle.isosceles-base-angles', conclusion: 'angle-equality(ABD,ADB)', premises: ['C02'] },
      { id: 'D02', rule: 'moving-point-equal-base-angles.2024', conclusion: 'angle-equality(PAC,PCA)', premises: ['D01','C07','C05'] },
      { id: 'D03', rule: 'moving-point-equal-base-angles.2024', conclusion: 'side-equality(PA,PC)', premises: ['D02'] }
    ]
  },
  SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_SIMILARITY_2025_001: {
    year: 2025, target: '△AFE∽△BGP', rule: 'circle-parallel-aa.2025',
    conditionChecks: [
      { id: 'C01', type: 'concyclic', contains: ['A','B','C','D'] },
      { id: 'C02', type: 'length_equality', contains: ['CA','CD'] },
      { id: 'C04', type: 'parallel', contains: ['EF','BC'] },
      { id: 'C07', type: 'length_equality', contains: ['BA','BG'] }
    ],
    derivation: [
      { id: 'D01', rule: 'parallel.alternate-interior-angles', conclusion: 'angle-equality(AEF,ACB)', premises: ['C04'] },
      { id: 'D02', rule: 'circle.same-arc-inscribed-angles', conclusion: 'angle-equality(BPG,ACB)', premises: ['C01'] },
      { id: 'D03', rule: 'angle.transitivity', conclusion: 'angle-equality(AEF,BPG)', premises: ['D01','D02'] },
      { id: 'D04', rule: 'circle-parallel-aa.2025', conclusion: 'angle-equality(EAF,PBG)', premises: ['C04','C07','D03'] },
      { id: 'D05', rule: 'circle-parallel-aa.2025', conclusion: 'similarity(AFE,BGP)', premises: ['D03','D04'] }
    ]
  },
  SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_CONGRUENCE_2026_001: {
    year: 2026, target: '△AFC≡△DBC', rule: 'circle-parallel-asa.2026',
    conditionChecks: [
      { id: 'C01', type: 'concyclic', contains: ['A','B','C','D','P'] },
      { id: 'C02', type: 'length_equality', contains: ['AB','AC'] },
      { id: 'C03', type: 'parallel', contains: ['AC','BD'] },
      { id: 'C06', type: 'angle_equality', contains: [] }
    ],
    derivation: [
      { id: 'D01', rule: 'given', conclusion: 'angle-equality(ACF,DCB)', premises: ['C06'] },
      { id: 'D02', rule: 'circle.same-arc-inscribed-angles', conclusion: 'angle-equality(FAC,BDC)', premises: ['C01'] },
      { id: 'D03', rule: 'parallel.alternate-interior-angles', conclusion: 'angle-equality(BDC,ACE)', premises: ['C03'] },
      { id: 'D04', rule: 'angle.transitivity', conclusion: 'angle-equality(FAC,ACE)', premises: ['D02','D03'] },
      { id: 'D05', rule: 'triangle.isosceles-base-angles', conclusion: 'angle-equality(ACB,ABC)', premises: ['C02'] },
      { id: 'D06', rule: 'circle-parallel-asa.2026', conclusion: 'angle-equality(AFC,DBC)', premises: ['D01','D02','D03'] },
      { id: 'D07', rule: 'circle-parallel-asa.2026', conclusion: 'side-equality(FC,BC)', premises: ['D01','D04','D05'] },
      { id: 'D08', rule: 'circle-parallel-asa.2026', conclusion: 'congruence(AFC,DBC)', premises: ['D01','D06','D07'] }
    ]
  }
});

const norm = s => String(s ?? '').replace(/[＝﹦]/g, '=').replace(/[△Δ]/g, '△').replace(/[∽∼]/g, '∽').replace(/[\s　]/g, '').replace(/[。．]/g, '');
const normalizeType = t => String(t ?? '').toLowerCase().replaceAll('-', '_');

function conditionSignatureMatches(problem, check) {
  const condition = (problem?.given_conditions ?? []).find((c, i) => String(c?.id ?? `C${String(i + 1).padStart(2,'0')}`) === check.id);
  if (condition == null) return false;
  if (typeof condition === 'string') {
    const text = norm(condition);
    return check.type === 'legacy_text' && check.contains.every(x => text.includes(norm(x)));
  }
  const aliases = { equal_length: 'length_equality', length_equality: 'length_equality', angle: 'angle_right', angle_right: 'angle_right' };
  if ((aliases[normalizeType(condition.type)] ?? normalizeType(condition.type)) !== (aliases[normalizeType(check.type)] ?? normalizeType(check.type))) return false;
  const actual = [...(condition.objects ?? [])].map(String);
  const statement = norm(condition.statement ?? condition.display_text ?? '');
  if (check.contains?.length) {
    const hasObjects = check.contains.every(x => actual.includes(x));
    const hasText = check.contains.every(x => statement.includes(norm(x)));
    if (!hasObjects && !hasText) return false;
  }
  return true;
}

function conditionKind(problem, schema, id) {
  const condition = (problem?.given_conditions ?? []).find((c,i)=>String(c?.id ?? `C${String(i+1).padStart(2,'0')}`)===id);
  const check = schema.conditionChecks.find(c=>c.id===id);
  const type = normalizeType(condition?.type ?? check?.type ?? '');
  if (type === 'legacy_text') return ({ C01:'cyclic', C02:'side-equality', C03:'parallel' })[id] ?? 'any';
  if (['concyclic','incidence'].includes(type)) return 'cyclic';
  if (['equal_length','length_equality'].includes(type)) return 'side-equality';
  if (type==='diameter') return 'diameter';
  if (type==='parallel') return 'parallel';
  if (['collinear','point_on_segment','intersection','circle_intersection','extension_intersection'].includes(type)) return 'incidence';
  if (['angle_equal','angle_equality'].includes(type)) return 'angle-equality';
  if (type==='angle_right') return 'right-angle';
  if (type==='angle_bisector') return 'angle-bisector';
  return 'any';
}
function conclusionKind(conclusion) {
  const m=/^(angle-equality|side-equality|right-angle|angle-equation|similarity|congruence|parallelogram|parallel)\(/.exec(conclusion);
  return m?.[1] ?? 'fact';
}
function checkDerivation(schema, problem = null) {
  const errors = [], accepted = new Set(), trace = [], conclusions = new Map();
  for (const step of schema.derivation) {
    const rule = FORMAL_RULE_CATALOG[step.rule];
    if (!rule) { errors.push(`${step.id}: 未登録定理 ${step.rule}`); continue; }
    if (step.premises.length < rule.arity[0] || step.premises.length > rule.arity[1]) {
      errors.push(`${step.id}: ${step.rule} の前提数が規則と一致しません。`); continue;
    }
    const missing = step.premises.filter(id => !accepted.has(id) && !/^C\d+$/.test(id));
    const absentConditions = problem ? step.premises.filter(id => /^C\d+$/.test(id) && !(problem.given_conditions ?? []).some((c, i) => String(c?.id ?? `C${String(i + 1).padStart(2,'0')}`) === id)) : [];
    if (absentConditions.length) { errors.push(`${step.id}: 実データに存在しない条件参照: ${absentConditions.join(', ')}`); continue; }
    if (missing.length) { errors.push(`${step.id}: 前提が未証明または順序不正: ${missing.join(', ')}`); continue; }
    const expectedInputs = RULE_INPUTS[step.rule];
    if (expectedInputs) {
      const premiseKinds = step.premises.map(id => {
        if (/^C\d+$/.test(id)) return conditionKind(problem, schema, id);
        return conclusionKind(conclusions.get(id) ?? '');
      });
      for (let i=0; i<expectedInputs.length; i++) {
        const allowed = expectedInputs[i];
        const kind = premiseKinds[i];
        if (kind && !allowed.includes('any') && !allowed.includes(kind)) {
          errors.push(`${step.id}: ${step.rule} の前提${i+1}は ${allowed.join('|')} が必要ですが ${kind} です。`);
        }
      }
      if (errors.some(e=>e.startsWith(`${step.id}:`))) continue;
    }
    const outputKinds = Array.isArray(rule.output) ? rule.output : [rule.output];
    const actualKind = /^(angle-equality|side-equality|right-angle|angle-equation|similarity|congruence|parallelogram|parallel)\(/.exec(step.conclusion)?.[1];
    if (rule.output !== 'any' && actualKind && !outputKinds.includes(actualKind)) { errors.push(`${step.id}: 規則 ${step.rule} は ${actualKind} を結論できません。`); continue; }
    if (/^C\d+$/.test(step.id)) errors.push(`${step.id}: 導出IDに条件ID形式は使えません。`);
    accepted.add(step.id);
    conclusions.set(step.id, step.conclusion);
    trace.push({ ...step, rule_name: rule.name, accepted: true });
  }
  const last = schema.derivation.at(-1);
  return { valid: errors.length === 0 && Boolean(last), errors, trace, target_fact: last?.conclusion ?? null };
}


function pointTable(problem) {
  const g = problem?.geometryModel ?? problem?.geometry ?? {};
  const raw = g.points instanceof Map ? Object.fromEntries(g.points) : (g.points ?? {});
  const coords = problem?.geometry?.coordinates ?? {};
  const merged = { ...(coords.points ?? {}), ...(coords.variants?.P1?.points ?? {}), ...raw };
  for (const [id, p] of Object.entries(merged)) {
    if (p?.x != null && p?.y != null) continue;
    const q = coords.variants?.P1?.points?.[id] ?? coords.points?.[id];
    if (q?.x != null && q?.y != null) merged[id] = q;
  }
  return merged;
}
function angleDegrees(a, b, c) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
  const den = Math.hypot(u.x,u.y) * Math.hypot(v.x,v.y);
  if (den < 1e-12) return null;
  const cos = Math.max(-1, Math.min(1, (u.x*v.x+u.y*v.y)/den));
  return Math.acos(cos) * 180 / Math.PI;
}
const length = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function numericCheckConclusion(conclusion, points) {
  let m = /^angle-equality\(([A-Z]{3}),([A-Z]{3})\)$/.exec(conclusion);
  if (m) {
    const a = [...m[1]].map(k=>points[k]), b=[...m[2]].map(k=>points[k]);
    if ([...a,...b].some(p=>!p)) return { status:'unverifiable', reason:'角の頂点座標がありません。' };
    const x=angleDegrees(a[0],a[1],a[2]), y=angleDegrees(b[0],b[1],b[2]);
    return Math.abs(x-y)<=0.15 ? {status:'pass',measured:[x,y]} : {status:'fail',measured:[x,y],reason:`角度が一致しません (${x.toFixed(4)}° / ${y.toFixed(4)}°)`};
  }
  m = /^right-angle\(([A-Z]{3})\)$/.exec(conclusion);
  if (m) {
    const a=[...m[1]].map(k=>points[k]); if(a.some(p=>!p)) return {status:'unverifiable',reason:'直角の座標がありません。'};
    const x=angleDegrees(a[0],a[1],a[2]); return Math.abs(x-90)<=0.15?{status:'pass',measured:x}:{status:'fail',measured:x,reason:`直角でありません (${x.toFixed(4)}°)`};
  }
  m = /^side-equality\(([A-Z]{2}),([A-Z]{2})\)$/.exec(conclusion);
  if (m) {
    const a=[points[m[1][0]],points[m[1][1]]], b=[points[m[2][0]],points[m[2][1]]]; if([...a,...b].some(p=>!p)) return {status:'unverifiable',reason:'辺の端点座標がありません。'};
    const x=length(...a), y=length(...b), tol=1e-5*Math.max(1,x,y); return Math.abs(x-y)<=tol?{status:'pass',measured:[x,y]}:{status:'fail',measured:[x,y],reason:`辺の長さが一致しません (${x} / ${y})`};
  }
  m = /^parallel\(([A-Z]{2}),([A-Z]{2})\)$/.exec(conclusion);
  if (m) {
    const a=[points[m[1][0]],points[m[1][1]]], b=[points[m[2][0]],points[m[2][1]]]; if([...a,...b].some(p=>!p)) return {status:'unverifiable',reason:'平行線の端点座標がありません。'};
    const u={x:a[1].x-a[0].x,y:a[1].y-a[0].y},v={x:b[1].x-b[0].x,y:b[1].y-b[0].y}; const den=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y); if(den<1e-12)return{status:'fail',reason:'退化した直線です。'}; const ratio=Math.abs(u.x*v.y-u.y*v.x)/den; return ratio<=1e-6?{status:'pass',normalized_cross:ratio}:{status:'fail',normalized_cross:ratio,reason:'直線が平行ではありません。'};
  }
  m = /^parallelogram\(([A-Z]{4})\)$/.exec(conclusion);
  if (m) {
    const [a,b,c,d]=[...m[1]].map(k=>points[k]); if([a,b,c,d].some(p=>!p)) return {status:'unverifiable',reason:'平行四辺形の頂点座標がありません.'};
    const parallelPair=(p,q,r,s)=>{const u={x:q.x-p.x,y:q.y-p.y},v={x:s.x-r.x,y:s.y-r.y};const den=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);return den>1e-12&&Math.abs(u.x*v.y-u.y*v.x)/den<=1e-6;};
    const ok=parallelPair(a,b,d,c)&&parallelPair(b,c,a,d); return ok?{status:'pass'}:{status:'fail',reason:'対辺の平行条件を満たしません。'};
  }
  m = /^(similarity|congruence)\(([A-Z]{3}),([A-Z]{3})\)$/.exec(conclusion);
  if (m) {
    const a=[...m[2]].map(k=>points[k]), b=[...m[3]].map(k=>points[k]); if([...a,...b].some(p=>!p)) return {status:'unverifiable',reason:'三角形の頂点座標がありません。'};
    if(m[1]==='similarity') { const x=[angleDegrees(a[1],a[0],a[2]),angleDegrees(a[0],a[1],a[2]),angleDegrees(a[0],a[2],a[1])]; const y=[angleDegrees(b[1],b[0],b[2]),angleDegrees(b[0],b[1],b[2]),angleDegrees(b[0],b[2],b[1])]; return x.every((v,i)=>v!=null&&y[i]!=null&&Math.abs(v-y[i])<=0.2)?{status:'pass',angles:[x,y]}:{status:'fail',angles:[x,y],reason:'対応する角が一致せず、相似を数値的に確認できません。'}; }
    const x=[length(a[0],a[1]),length(a[1],a[2]),length(a[2],a[0])], y=[length(b[0],b[1]),length(b[1],b[2]),length(b[2],b[0])]; return x.every((v,i)=>Math.abs(v-y[i])<=1e-5*Math.max(1,v,y[i]))?{status:'pass',side_lengths:[x,y]}:{status:'fail',side_lengths:[x,y],reason:'対応する辺が一致せず、合同を数値的に確認できません。'};
  }
  return {status:'unverifiable',reason:'数値検証に対応していない命題形式です。'};
}

export function auditFormalDerivationNumerically(problem, certificate = verifyFormalProofCertificate(problem)) {
  const points=pointTable(problem), checks=[], errors=[], warnings=[];
  for(const step of certificate.derivation ?? []) {
    const check=numericCheckConclusion(step.conclusion,points);
    checks.push({id:step.id,conclusion:step.conclusion,...check});
    if(check.status==='fail') errors.push(`${step.id}: ${check.reason}`);
    if(check.status==='unverifiable') warnings.push(`${step.id}: ${check.reason}`);
  }
  return {valid:errors.length===0,status:errors.length?'failed':warnings.length?'partial':'numerically-consistent',check_count:checks.length,passed_count:checks.filter(x=>x.status==='pass').length,failed_count:checks.filter(x=>x.status==='fail').length,unverifiable_count:checks.filter(x=>x.status==='unverifiable').length,checks,errors,warnings};
}

export function getFormalProofSchema(templateId) {
  return SCHEMAS[templateId] ?? null;
}

export function createProofFirstConstructionPlan(templateId) {
  const schema = getFormalProofSchema(templateId);
  if (!schema) throw new Error(`形式化された証明計画がありません: ${templateId}`);
  const checked = checkDerivation(schema);
  if (!checked.valid) throw new Error(`証明計画の事前検証に失敗: ${checked.errors.join(' / ')}`);
  return {
    version: '1.0.0', direction: 'proof-first', year: schema.year,
    target: schema.target, rule: schema.rule,
    required_conditions: schema.conditionChecks,
    derivation: checked.trace,
    construction_allowed: true
  };
}

export function verifyFormalProofCertificate(problem) {
  const templateId = problem?.generation?.template_id;
  const schema = getFormalProofSchema(templateId);
  if (!schema) return { status: 'not-verifiable', valid: false, template_id: templateId ?? null, errors: ['対応する形式証明スキーマがありません。'], warnings: [] };
  const errors = [], warnings = [];
  const actualTarget = problem?.proof?.target ?? problem?.proof?.selected_solution?.target?.statement ?? problem?.proof?.selected_solution?.target ?? problem?.proof?.P1?.target ?? problem?.problem?.statement?.parts?.find(p => p.id === 'P1')?.target ?? '';
  const targetText = typeof actualTarget === 'string' ? actualTarget : actualTarget?.statement ?? '';
  if (norm(targetText) !== norm(schema.target)) errors.push(`証明目標がスキーマと一致しません: ${targetText} / ${schema.target}`);
  const rawSteps = Array.isArray(problem?.proof?.steps) ? problem.proof.steps
    : Array.isArray(problem?.proof?.P1?.steps) ? problem.proof.P1.steps
    : Array.isArray(problem?.proof?.P1?.solution_steps) ? problem.proof.P1.solution_steps
    : Array.isArray(problem?.proof?.selected_solution?.steps) ? problem.proof.selected_solution.steps : [];
  const sourceSteps = rawSteps.map(x => typeof x === 'string' ? x : String(x?.statement ?? x?.conclusion ?? '')).filter(Boolean);
  const minimumSteps = ({2014:7,2015:7,2016:8,2017:8,2024:9,2025:10,2026:11})[schema.year] ?? 1;
  if (sourceSteps.length < minimumSteps) errors.push(`元の証明ステップが不足しています (${sourceSteps.length}/${minimumSteps})。`);
  if (sourceSteps.length && !norm(sourceSteps.at(-1)).includes(norm(schema.target))) errors.push(`元の証明の最終ステップが目標を明示していません: ${sourceSteps.at(-1)}`);
  for (const check of schema.conditionChecks) if (!conditionSignatureMatches(problem, check)) errors.push(`必須条件 ${check.id} がスキーマと一致しません (type=${check.type})`);
  const derivation = checkDerivation(schema, problem);
  errors.push(...derivation.errors);
  const numericAudit = auditFormalDerivationNumerically(problem, { derivation: derivation.trace });
  errors.push(...numericAudit.errors);
  const expectedKind = schema.target.includes('≡') ? 'congruence' : schema.target.includes('∽') ? 'similarity' : 'side-equality';
  if (derivation.target_fact && !derivation.target_fact.startsWith(`${expectedKind}(`)) errors.push(`証明計画の最終結論型が目標と一致しません: ${derivation.target_fact}`);
  if (!Array.isArray(problem?.proof?.steps) && !Array.isArray(problem?.proof?.P1?.steps) && !Array.isArray(problem?.proof?.selected_solution?.steps)) warnings.push('元の証明文ステップはテンプレート別スキーマから補完しています。');
  return {
    version: '1.0.0', status: errors.length ? 'failed' : 'schema-verified', valid: errors.length === 0,
    independent_of_generator_validation_flags: true, template_id: templateId, year: schema.year,
    target: schema.target, macro_rule: schema.rule, condition_checks: schema.conditionChecks.map(c => ({ id: c.id, valid: conditionSignatureMatches(problem, c) })),
    derivation: derivation.trace, numeric_audit: numericAudit, errors, warnings: [...warnings, ...numericAudit.warnings],
    limitation: 'schema-verifiedは登録済みテンプレートの証明スキーマ・依存順序・必須条件の一致を意味し、汎用定理証明器による任意の幾何命題の完全証明を意味しません。'
  };
}

export function assertProofFirstPlanReady(templateId) {
  const plan = createProofFirstConstructionPlan(templateId);
  if (!plan.construction_allowed) throw new Error('証明計画が未検証のため問題を構築できません。');
  return plan;
}
