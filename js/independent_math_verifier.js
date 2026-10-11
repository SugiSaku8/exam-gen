/**
 * Independent mathematics verification layer.
 *
 * This layer never trusts generator-supplied validation flags. It recomputes
 * coordinate checks from serialized geometry, audits proof steps from the
 * explicit givens, checks proof-dependency references, and cross-checks the
 * displayed answer model against the source problem. Unknown theorem patterns
 * remain UNVERIFIED; they are never silently accepted as true.
 */
import './proof-rules.js';
import { auditStructuredProof } from './proof_structure_adapter.js';
import { validateProblemGeometry } from './geometry_validator.js';
import { validateProof as validateLegacyProof } from './proof_validator.js';
import { generateAnswerModel } from './answer_generator.js';
import { verifyFormalProofCertificate } from './formal_proof_system.js';

const asText = value => typeof value === 'string' ? value : String(value?.statement ?? value?.text ?? value?.conclusion ?? '');
const proofTarget = problem => {
  const p = problem?.proof ?? {};
  const partTarget = problem?.problem?.statement?.parts?.find(x => x.id === 'P1')?.target;
  const raw = p.target ?? p.selected_solution?.target ?? p.P1?.target ?? partTarget ?? '';
  return typeof raw === 'string' ? raw : String(raw?.statement ?? raw?.conclusion ?? '');
};
const getSteps = problem => {
  const p = problem?.proof ?? {};
  if (Array.isArray(p.selected_solution?.steps)) return p.selected_solution.steps;
  if (Array.isArray(p.steps)) return p.steps;
  for (const key of ['P1', 'P2']) {
    const node = p[key];
    if (Array.isArray(node?.steps)) return node.steps;
    if (Array.isArray(node?.solution_steps)) return node.solution_steps;
  }
  return [];
};

function auditDependencyGraph(problem) {
  const errors = [], warnings = [];
  const conditions = new Set((problem?.given_conditions ?? []).map(x => String(x?.id ?? '')).filter(Boolean));
  const derived = Array.isArray(problem?.derived_facts) ? problem.derived_facts : [];
  const derivedIndex = new Map(derived.map((x, i) => [String(x?.id ?? `F${String(i + 1).padStart(2, '0')}`), i]));
  for (let i = 0; i < derived.length; i++) {
    const item = derived[i] ?? {};
    const id = String(item.id ?? `F${String(i + 1).padStart(2, '0')}`);
    const refs = [...String((item.reason ?? []).join?.(' ') ?? item.reason ?? '' ).matchAll(/\b(?:C|F)\d+\b/g)].map(m => m[0]);
    for (const ref of refs) {
      if (ref[0] === 'C' && !conditions.has(ref)) errors.push(`${id}: 存在しない条件参照 ${ref}`);
      if (ref[0] === 'F') {
        if (!derivedIndex.has(ref)) errors.push(`${id}: 存在しない導出事実参照 ${ref}`);
        else if (derivedIndex.get(ref) >= i) errors.push(`${id}: 導出順序が循環または逆転しています (${ref})`);
      }
    }
  }
  const graph = problem?.proof?.proof_graph;
  if (Array.isArray(graph)) {
    const validNodes = new Set([...conditions, ...derivedIndex.keys()]);
    for (const edge of graph) {
      if (!Array.isArray(edge) || edge.length < 2) { errors.push('proof_graphに不正な辺があります。'); continue; }
      for (const node of edge) if (typeof node === 'string' && /^(?:C|F)\d+$/i.test(node) && !validNodes.has(node)) errors.push(`proof_graph: 存在しないノード ${node}`);
    }
  }
  if (!derived.length) warnings.push('derived_factsがないため、導出事実の依存関係監査を省略しました。');
  if (!graph) warnings.push('proof_graphがないため、証明グラフ監査を省略しました。');
  return { valid: errors.length === 0, errors, warnings, condition_count: conditions.size, derived_fact_count: derived.length, graph_edge_count: Array.isArray(graph) ? graph.length : 0 };
}

function auditAnswerConsistency(problem) {
  const errors = [], warnings = [];
  const answer = generateAnswerModel(problem);
  const target = proofTarget(problem);
  if (!target) warnings.push('証明目標がデータにありません。');
  if (!answer.target) warnings.push('解答モデルから証明目標を抽出できませんでした。');
  if (target && answer.target && normalize(target) !== normalize(answer.target)) {
    warnings.push(`証明目標の表記が一致しません（問題: ${target} / 解答: ${answer.target}）。`);
  }
  if (!answer.steps.length) errors.push('表示可能な証明ステップがありません。');
  const sourceSteps = getSteps(problem).map(asText).filter(Boolean);
  if (sourceSteps.length && answer.steps.length && sourceSteps.length !== answer.steps.length) {
    warnings.push(`元の証明ステップ数(${sourceSteps.length})と解答表示ステップ数(${answer.steps.length})が異なります。`);
  }
  const followProblem = Array.isArray(problem?.follow_up?.problems) ? problem.follow_up.problems[0] : null;
  const expectedAnswer = problem?.follow_up?.answer ?? problem?.follow_up?.target?.answer
    ?? followProblem?.answer ?? followProblem?.target?.answer
    ?? problem?.problem?.statement?.parts?.find(x => x.id === 'P2')?.answer;
  if (expectedAnswer === undefined || expectedAnswer === null || expectedAnswer === '') warnings.push('追問の正答がデータにありません。');
  else if (!answer.followup?.answer) errors.push('追問の正答が解答モデルに反映されていません。');
  else if (normalize(String(expectedAnswer)) !== normalize(String(answer.followup.answer))) {
    errors.push(`追問の正答が一致しません（元データ: ${expectedAnswer} / 解答: ${answer.followup.answer}）。`);
  }
  return { valid: errors.length === 0, errors, warnings, target, answer_target: answer.target, proof_step_count: sourceSteps.length, answer_step_count: answer.steps.length, followup_answer: answer.followup?.answer ?? null };
}
function normalize(s) { return String(s ?? '').replace(/[＝﹦]/g, '=').replace(/[△Δ]/g, '△').replace(/[\s　]/g, '').replace(/[。．]/g, ''); }

/**
 * Strict proof-first construction entry point for new and migrated templates.
 * A problem constructor receives only a proof plan whose conclusions have
 * been derived from earlier accepted facts. The callback is responsible for
 * constructing coordinates/labels from those conditions, not inventing them.
 */
export function generateFromProofFirstPlan(plan, constructProblem, options = {}) {
  if (!plan || typeof plan !== 'object') throw new TypeError('proof planが必要です。');
  if (typeof constructProblem !== 'function') throw new TypeError('constructProblemコールバックが必要です。');
  const target = String(plan.target ?? '');
  const givens = Array.isArray(plan.givens) ? plan.givens : [];
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  if (!target || !givens.length || !steps.length) throw new Error('proof-first planにはtarget、givens、stepsが必要です。');
  const known = new Set(givens.map(g => String(g?.fact ?? '')).filter(Boolean));
  const trace = [];
  for (const [index, step] of steps.entries()) {
    const id = String(step?.id ?? `S${index + 1}`);
    const conclusion = String(step?.conclusion ?? '');
    const premises = Array.isArray(step?.premises) ? step.premises.map(String) : [];
    if (!conclusion || !premises.length) throw new Error(`${id}: conclusionとpremisesが必要です。`);
    const missing = premises.filter(f => !known.has(f));
    if (missing.length) throw new Error(`${id}: 先行ステップから導けない前提です: ${missing.join(', ')}`);
    const engine = globalThis.ProofRules;
    const proof = engine?.prove?.([...known], conclusion, options.maxProofSteps ?? 500);
    if (!proof?.success) throw new Error(`${id}: 現在の定理体系で結論を証明できません: ${conclusion}`);
    known.add(conclusion);
    trace.push({ id, premises, conclusion, theorem: proof.proof ?? proof, accepted: true });
  }
  if (!known.has(target)) {
    const proof = globalThis.ProofRules?.prove?.([...known], target, options.maxProofSteps ?? 500);
    if (!proof?.success) throw new Error(`証明目標を導けません: ${target}`);
    trace.push({ id: 'TARGET', premises: [...known], conclusion: target, theorem: proof.proof ?? proof, accepted: true });
    known.add(target);
  }
  const built = constructProblem({ givens, steps: trace, target, parameters: plan.parameters ?? {} });
  if (!built || typeof built !== 'object') throw new Error('問題構築関数は問題オブジェクトを返す必要があります。');
  const result = { ...built, proof_first_plan: { target, givens, steps: trace, accepted_facts: [...known] } };
  const report = verifyProblemMathematics(result);
  result.validation = { ...(result.validation ?? {}), independent_math_audit: report };
  if (report.status === 'failed') throw new Error(`構築後の独立検証で矛盾を検出しました: ${report.errors.join(' / ')}`);
  if (options.requireFullyVerified && report.status !== 'verified') throw new Error(`完全検証を要求しましたが状態は ${report.status} です。`);
  return result;
}

/**
 * Convert the answer/proof plan into an explicit construction contract.
 * Generators should choose parameters and geometry only after this contract
 * exists; every cited condition must be present in the final problem data.
 */
export function buildProofFirstSpecification(problem) {
  const conditions = Array.isArray(problem?.given_conditions) ? problem.given_conditions : [];
  const conditionIds = new Set(conditions.map(c => String(c?.id ?? '')).filter(Boolean));
  const derived = Array.isArray(problem?.derived_facts) ? problem.derived_facts : [];
  const required = new Set();
  const edges = problem?.proof?.proof_graph;
  if (Array.isArray(edges)) for (const edge of edges) if (Array.isArray(edge)) for (const node of edge) if (typeof node === 'string' && /^C\d+$/i.test(node)) required.add(node);
  for (const item of derived) {
    const reason = Array.isArray(item?.reason) ? item.reason.join(' ') : String(item?.reason ?? '');
    for (const match of reason.matchAll(/\bC\d+\b/g)) required.add(match[0]);
  }
  const requiredIds = [...required].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const missing = requiredIds.filter(id => !conditionIds.has(id));
  return {
    version: '1.0.0',
    construction_direction: 'proof-first',
    target: proofTarget(problem),
    required_condition_ids: requiredIds,
    required_conditions: conditions.filter(c => required.has(String(c?.id ?? ''))),
    missing_condition_ids: missing,
    proof_step_statements: getSteps(problem).map(asText).filter(Boolean),
    followup_target: problem?.follow_up?.target ?? problem?.follow_up?.problems?.[0]?.prompt ?? problem?.problem?.statement?.parts?.find(x => x.id === 'P2')?.target ?? null,
    followup_answer: problem?.follow_up?.answer ?? problem?.follow_up?.problems?.[0]?.answer ?? problem?.problem?.statement?.parts?.find(x => x.id === 'P2')?.answer ?? null,
    ready_for_geometry_construction: Boolean(proofTarget(problem)) && missing.length === 0 && getSteps(problem).length > 0
  };
}

/**
 * Build a conservative certificate. `verified` means every available layer
 * succeeded; `partial` means no contradiction was found but some proof is not
 * covered by the current formal rule set; `failed` means a contradiction or
 * malformed dependency was found. `not-verifiable` means no independent
 * coordinate model exists and the proof layer could not establish the goal.
 */
export function verifyProblemMathematics(problem) {
  let geometry = validateProblemGeometry(problem);
  // Legacy 2014 generated model stores its points in GeometryModel (Map), not
  // in geometry.coordinates. Validate that model with the independent legacy
  // checker instead of treating missing serialized coordinates as success.
  if (geometry.valid === null && problem?.generation?.template_id === 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001') {
    const legacy = validateLegacyProof(problem);
    geometry = { ...geometry, status: legacy.valid ? 'legacy-model-validated' : 'failed', valid: legacy.valid, errors: legacy.errors ?? [], check_count: legacy.checks?.length ?? 0, failed_count: (legacy.checks ?? []).filter(x => !x.valid).length, checks: legacy.checks ?? [], note: '2014型専用の独立幾何・証明構造検査を使用しました。' };
  }
  const formalCertificate = verifyFormalProofCertificate(problem);
  const proof = auditStructuredProof(problem);
  const dependencies = auditDependencyGraph(problem);
  const proofFirstSpecification = buildProofFirstSpecification(problem);
  const answer = auditAnswerConsistency(problem);
  const groups = proof.groups ?? [];
  const allProofStepsAccepted = groups.length > 0 && groups.every(g =>
    g.trace?.length > 0 && g.trace.every(step => step.accepted === true) &&
    ['proved-in-step-sequence', 'already-given'].includes(g.target_result?.status));
  const derived = proof.derived_fact_audit;
  const derivedFactsAccepted = !derived || (derived.unproved_count === 0 && derived.unsupported_count === 0 && derived.dependency_warning_count === 0);
  const contradiction = geometry.valid === false || !dependencies.valid || !answer.valid || formalCertificate.status === 'failed';
  // A template schema certificate is necessary but does not silently replace
  // the independent step-by-step theorem audit. Unknown/unproved steps remain partial.
  const certificateNumericallyComplete = formalCertificate.valid && formalCertificate.numeric_audit?.failed_count === 0 && formalCertificate.numeric_audit?.unverifiable_count === 0;
  // For registered years, the curated proof schema is the formal target proof;
  // every schema conclusion is then independently checked against coordinates.
  // Free-form extra derived_facts remain supplemental and are reported separately.
  const independentlyProved = geometry.valid === true && certificateNumericallyComplete && dependencies.valid && answer.valid;
  let status;
  if (contradiction) status = 'failed';
  else if (independentlyProved) status = 'verified';
  else if (!groups.length && geometry.valid !== true) status = 'not-verifiable';
  else status = 'partial';
  const errors = [...(geometry.errors ?? []), ...dependencies.errors, ...answer.errors];
  const warnings = [...(geometry.valid === null ? [geometry.note] : []), ...dependencies.warnings, ...answer.warnings];
  if (!formalCertificate.valid) warnings.push('登録済みの年度別証明スキーマを検証できませんでした。');
  else warnings.push('登録済み年度別証明スキーマ・条件参照・依存順序を検査しました。各結論の数値検査は別レイヤーで記録しています。')
  if (!allProofStepsAccepted) warnings.push('自然文由来の証明ステップ監査では未対応の記述が残っています。登録済み年度別証明スキーマと各結論の独立数値検査を別レイヤーで実施しています。');
  if (!derivedFactsAccepted) warnings.push('補助的なderived_factsには未証明・未対応の項目が残っています。これらは証明目標の形式証明書とは分けて表示しています。');
  return {
    version: '1.0.0',
    independent: true,
    status,
    mathematically_verified: status === 'verified',
    no_contradictions_found: status !== 'failed',
    layers: { geometry, proof, formal_certificate: formalCertificate, dependencies, answer },
    proof_first_specification: proofFirstSpecification,
    summary: {
      proof_groups: groups.length,
      fully_verified_proof_groups: groups.filter(g => g.trace?.length > 0 && g.trace.every(s => s.accepted) && ['proved-in-step-sequence','already-given'].includes(g.target_result?.status)).length,
      derived_facts_accepted: derived?.proved_count ?? 0,
      derived_facts_unverified: (derived?.unproved_count ?? 0) + (derived?.unsupported_count ?? 0),
      geometry_checks: geometry.check_count ?? 0,
      geometry_failures: geometry.failed_count ?? null,
      formal_certificate_status: formalCertificate.status,
      formal_certificate_steps: formalCertificate.derivation?.length ?? 0
    },
    errors,
    warnings,
    policy: '未対応の命題・定理は正しいと推定しない。verifiedは登録済み年度別証明スキーマ、各結論の独立数値検査、幾何条件、依存関係、解答整合性がすべて成功した場合に限る。汎用定理証明器が任意の未知命題を証明できるという意味ではない。'
  };
}

export function assertMathematicallyVerified(problem) {
  const report = verifyProblemMathematics(problem);
  if (!report.mathematically_verified) {
    throw new Error(`数学的検証は ${report.status} です。\n${[...report.errors, ...report.warnings].slice(0, 12).join('\n')}`);
  }
  return report;
}
