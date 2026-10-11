import { logger } from './logger.js';

/**
 * Deterministic bridge to the theorem-catalog-foundation inference engine.
 * The bridge deliberately accepts explicit symbolic facts only; it never
 * treats diagram coordinates or prose guesses as proof premises.
 *
 * Opt-in problem shape:
 * problem.proof_engine = {
 *   facts: ['triangle(ABC)', 'angle(A)=angle(D)', ...],
 *   goal: 'similar(ABC,DEF)',
 *   max_steps: 100
 * }
 */
export function runProofEngine(problem, options = {}) {
  const engine = globalThis.ProofRules;
  const config = problem?.proof_engine;
  if (!config || !Array.isArray(config.facts) || typeof config.goal !== 'string') {
    return {
      available: Boolean(engine?.prove),
      configured: false,
      success: false,
      status: 'not-configured',
      reason: 'この問題には明示的な proof_engine.facts / goal がありません。'
    };
  }
  if (!engine || typeof engine.prove !== 'function') {
    return {
      available: false,
      configured: true,
      success: false,
      status: 'engine-unavailable',
      reason: 'ProofRules が読み込まれていません。'
    };
  }
  const facts = [...new Set(config.facts.filter(x => typeof x === 'string' && x.trim()))];
  const goal = config.goal.trim();
  const maxSteps = options.maxSteps ?? config.max_steps ?? 100;
  const started = performance.now?.() ?? Date.now();
  try {
    const result = engine.prove(facts, goal, maxSteps);
    const elapsedMs = Math.max(0, (performance.now?.() ?? Date.now()) - started);
    const response = {
      available: true,
      configured: true,
      success: Boolean(result.success),
      status: result.success ? 'proved-by-registered-rules' : 'not-proved-with-current-rules',
      goal,
      input_fact_count: facts.length,
      max_steps: maxSteps,
      elapsed_ms: Number(elapsedMs.toFixed(3)),
      proof: result,
      reason: result.success
        ? '登録済みの決定的な推論規則から目標を導出しました。'
        : '現在の規則では目標を導出できません。命題が偽であることを意味しません。'
    };
    logger.info('PROOF_ENGINE', '決定的証明探索完了', {
      status: response.status,
      goal,
      facts: facts.length,
      steps: result.steps?.length ?? 0,
      elapsedMs: response.elapsed_ms
    });
    return response;
  } catch (error) {
    logger.error('PROOF_ENGINE', '証明探索で例外', { goal, message: error.message });
    return {
      available: true,
      configured: true,
      success: false,
      status: 'engine-error',
      goal,
      error: error.message
    };
  }
}

export function attachProofEngineResult(problem, options = {}) {
  const result = runProofEngine(problem, options);
  return {
    ...problem,
    validation: {
      ...(problem.validation ?? {}),
      proof_engine: result
    }
  };
}
