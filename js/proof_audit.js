import { logger } from './logger.js';
import { runProofEngine } from './proof_engine_bridge.js';
import { auditStructuredProof } from './proof_structure_adapter.js';

const RULES = [
  [/同じ弧|円周角/, 'circle.inscribed-angles-same-arc'],
  [/等しい弧|弧.*等しい弧/, 'circle.equal-arcs-inscribed-angles'],
  [/中心角/, 'circle.central-inscribed-angle'],
  [/直径|半円/, 'circle.diameter-inscribed-angle'],
  [/錯角/, 'parallel.alternate-interior-angles'],
  [/同位角/, 'parallel.corresponding-angles'],
  [/対頂角/, 'angle.vertical-angles'],
  [/二等辺三角形.*底角|底角.*二等辺|二等辺三角形だから|二等辺三角形であり/, 'triangle.isosceles-base-angles'],
  [/三角形の外角|外角より|外角なので/, 'triangle.exterior-angle'],
  [/内角の和/, 'triangle.angle-sum'],
  [/角の加法|角.*和|角を分け|角の差/, 'angle.addition'],
  [/線分の加法|線分.*和|線分を分け/, 'segment.addition'],
  [/2組の角|二組の角|AA|相似条件/, 'triangle.similarity-aa'],
  [/3組の辺|SSS/, 'triangle.congruence-sss'],
  [/その間の角|SAS/, 'triangle.congruence-sas'],
  [/その両端の角|一辺とその両端|ASA|1組の辺とその両端/, 'triangle.congruence-asa'],
  [/推移|以上より|したがって|よって/, 'logic.equality-transitivity']
];

function stepList(problem) {
  const proof = problem?.proof;
  if (!proof) return [];
  const lists = [];
  if (Array.isArray(proof.steps)) lists.push(proof.steps);
  if (Array.isArray(proof.selected_solution?.steps)) lists.push(proof.selected_solution.steps);
  for (const part of [proof.P1, proof.P2]) {
    if (Array.isArray(part?.solution_steps)) lists.push(part.solution_steps);
    if (Array.isArray(part?.steps)) lists.push(part.steps);
  }
  return lists.flat().map((raw, index) => {
    if (typeof raw === 'string') return { index: index + 1, statement: raw, reason: '' };
    return { index: index + 1, statement: raw?.statement ?? '', reason: raw?.reason ?? '' };
  }).filter(step => step.statement);
}

function mapRule(step, catalog) {
  const text = `${step.statement} ${step.reason}`;
  for (const [pattern, id] of RULES) {
    if (pattern.test(text) && catalog?.get?.(id)) return id;
  }
  return null;
}

function auditGeometry(problem) {
  const errors = [];
  const warnings = [];
  const model = problem?.geometryModel;
  const points = model?.points;
  if (!model) {
    warnings.push('geometryModelがないため、座標モデルの監査を省略しました。');
    return { valid: true, errors, warnings, pointCount: 0 };
  }

  let entries = [];
  if (points instanceof Map) entries = [...points.entries()];
  else if (points && typeof points === 'object') entries = Object.entries(points);
  else errors.push('geometryModel.pointsがMapまたはオブジェクトではありません。');

  const ids = new Set();
  for (const [key, point] of entries) {
    const id = point?.id ?? key;
    if (ids.has(id)) errors.push(`点IDが重複しています: ${id}`);
    ids.add(id);
    if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) {
      errors.push(`点${id}の座標が有限値ではありません。`);
    }
  }

  const coordinates = problem?.geometry?.coordinates?.points;
  if (coordinates && typeof coordinates === 'object') {
    for (const [id, p] of Object.entries(coordinates)) {
      if (!Number.isFinite(Number(p?.x)) || !Number.isFinite(Number(p?.y))) {
        errors.push(`geometry.coordinatesの点${id}の座標が有限値ではありません。`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, pointCount: entries.length };
}

/**
 * This is an audit/reporting layer, not a proof prover.
 * It never upgrades an unverified statement to a mathematically proved fact.
 */
export function auditGeneratedProblem(problem) {
  const catalog = globalThis.TheoremCatalog;
  const steps = stepList(problem);
  const annotated = steps.map(step => ({
    ...step,
    theorem_id: mapRule(step, catalog),
    theorem_status: mapRule(step, catalog) ? 'catalogued-candidate' : 'needs-review'
  }));
  const mapped = annotated.filter(x => x.theorem_id).length;
  const geometry = auditGeometry(problem);
  const proofEngine = runProofEngine(problem);
  const symbolicProofAudit = auditStructuredProof(problem);
  const derivedFactAudit = symbolicProofAudit.derived_fact_audit;
  const derivedFactsComplete = derivedFactAudit.source_fact_count === 0 ||
    (derivedFactAudit.unproved_count === 0 && derivedFactAudit.unsupported_count === 0);
  const symbolicVerificationStatus = symbolicProofAudit.proof_group_count === 0
    ? 'no-proof-steps'
    : symbolicProofAudit.fully_proved_group_count === symbolicProofAudit.proof_group_count && derivedFactsComplete
      ? 'verified'
      : symbolicProofAudit.groups.some(group => group.proved_step_count > 0 || group.already_known_step_count > 0) || derivedFactAudit.proved_count > 0 || derivedFactAudit.already_known_count > 0
        ? 'partial'
        : 'not-proved-with-current-rules';
  const result = {
    version: '1.0.0',
    catalog_available: Boolean(catalog?.get),
    catalog_rule_count: catalog?.list?.().length ?? 0,
    proof_step_count: steps.length,
    mapped_step_count: mapped,
    unmapped_step_count: steps.length - mapped,
    geometry,
    proof_engine: proofEngine,
    symbolic_proof_audit: symbolicProofAudit,
    symbolic_verification_status: symbolicVerificationStatus,
    status: geometry.valid ? (steps.length && mapped === steps.length ? 'reviewable' : 'partial') : 'invalid-structure',
    steps: annotated,
    note: '定理IDは文章から推定した監査候補です。数学的な証明の正しさを保証するものではありません。'
  };
  logger.info('AUDIT', '定理カタログ・構造監査完了', {
    status: result.status,
    proofSteps: result.proof_step_count,
    mapped: result.mapped_step_count,
    unmapped: result.unmapped_step_count,
    geometryValid: geometry.valid,
    proofEngineStatus: proofEngine.status,
    symbolicGroups: symbolicProofAudit.proof_group_count,
    fullyProvedGroups: symbolicProofAudit.fully_proved_group_count,
    derivedFactsProved: symbolicProofAudit.derived_fact_audit?.proved_count ?? 0,
    derivedFactsUnproved: symbolicProofAudit.derived_fact_audit?.unproved_count ?? 0,
    symbolicVerificationStatus
  });
  return result;
}
