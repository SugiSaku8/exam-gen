import { logger } from './logger.js';
function getPoint(geometry, id) {
  const points = geometry?.points;
  if (points instanceof Map) return points.get(id);
  return points?.[id];
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function cross(a, b, c) { return (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x); }
function collinear(a,b,c,t=1e-7) { return Math.abs(cross(a,b,c)) <= t; }
function parallel(a,b,c,d,t=1e-7) { return Math.abs((b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x)) <= t; }
function equalLength(a,b,c,d,t=1e-7) { return Math.abs(distance(a,b)-distance(c,d)) <= t; }

export function validate2014Proof(problem, options = {}) {
  const tolerance = options.tolerance ?? 1e-7;
  const errors = [], warnings = [], checks = [];
  const g = problem?.geometryModel ?? problem?.geometry;
  if (!g) return { valid:false, errors:['geometryがありません。'], warnings, checks, template_id: 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001' };

  const ids = ['A','B','C','D','E','F','G'];
  const p = Object.fromEntries(ids.map(id => [id, getPoint(g,id)]));
  for (const id of ids) if (!p[id]) errors.push(`点${id}が存在しません。`);
  if (errors.length) return { valid:false, errors, warnings, checks, template_id:'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001' };

  checks.push({name:'AC=AD', valid:equalLength(p.A,p.C,p.A,p.D,tolerance)});
  if (!checks.at(-1).valid) errors.push('AC=ADが成立していません。');
  checks.push({name:'BD∥CE', valid:parallel(p.B,p.D,p.C,p.E,tolerance)});
  if (!checks.at(-1).valid) errors.push('BD∥CEが成立していません。');
  checks.push({name:'F on AC', valid:collinear(p.A,p.C,p.F,tolerance)});
  if (!checks.at(-1).valid) errors.push('FがAC上にありません。');
  checks.push({name:'F on BD', valid:collinear(p.B,p.D,p.F,tolerance)});
  if (!checks.at(-1).valid) errors.push('FがBD上にありません。');
  checks.push({name:'G on AE', valid:collinear(p.A,p.E,p.G,tolerance)});
  if (!checks.at(-1).valid) errors.push('GがAE上にありません。');
  checks.push({name:'G on BD', valid:collinear(p.B,p.D,p.G,tolerance)});
  if (!checks.at(-1).valid) errors.push('GがBD上にありません。');

  const proof = problem.proof;
  if (!proof) errors.push('proofがありません。');
  if (proof?.criterion !== 'ASA') errors.push('合同条件がASAではありません。');
  const statements = new Set((proof?.steps ?? []).map(s => s.statement));
  for (const s of ['AC=AD','∠ACB=∠ADG','∠BAC=∠GAD','△ABC≡△AGD']) {
    if (!statements.has(s)) warnings.push(`証明手順に「${s}」が見つかりません。`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checks,
    measured: { AC:distance(p.A,p.C), AD:distance(p.A,p.D) },
    template_id:'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001'
  };
}

const VALIDATORS = { SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001: validate2014Proof };
export function validateProof(problem, options = {}) {
  logger.debug('VALIDATE', 'proof検証開始', { template: problem?.generation?.template_id });
  const template = problem?.generation?.template_id ?? 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001';
  return (VALIDATORS[template] ?? validate2014Proof)(problem, options);
}
export function assertValidProof(problem, options = {}) {
  const result = validateProof(problem, options);
  if (!result.valid) throw new Error(result.errors.join('\n'));
  return result;
}
