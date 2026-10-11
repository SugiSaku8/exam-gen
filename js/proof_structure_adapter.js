/**
 * proof_structure_adapter.js
 *
 * 既存の日本語証明データを、決定的な証明エンジンが扱える原子的命題へ
 * 保守的に変換する。文章の理由や図の見た目だけから事実を追加しない。
 */
const POINT = '[A-Z]';

function normalize(text) {
  return String(text ?? '')
    .replace(/[＝﹦]/g, '=')
    .replace(/[Δ]/g, '△')
    .replace(/[\s　]/g, '')
    .replace(/[，,。．]/g, '')
    .replace(/度/g, '°');
}

function canonicalSide(a, b) {
  return a < b ? `side(${a}${b})` : `side(${b}${a})`;
}

function canonicalEquality(a, b) {
  return [a, b].sort().join('=');
}

/** Extract explicit atomic claims. Every extracted claim is checked separately. */
export function parseAtomicStatements(statement) {
  if (typeof statement !== 'string') return [];
  const text = normalize(statement);
  const claims = [];
  const seen = new Set();
  const add = (fact, kind, matchedText) => {
    const key = `${kind}:${fact}`;
    if (!seen.has(key)) { seen.add(key); claims.push({ fact, kind, text: matchedText }); }
  };

  for (const m of text.matchAll(/△([A-Z]{3})(?:∽|∼|相似)△?([A-Z]{3})/g)) {
    add(`similar(${m[1]},${m[2]})`, 'similarity', m[0]);
  }
  for (const m of text.matchAll(/△([A-Z]{3})(?:≡|合同)△?([A-Z]{3})/g)) {
    add(`congruent(${m[1]},${m[2]})`, 'congruence', m[0]);
  }
  for (const m of text.matchAll(/∠([A-Z]{3})=∠([A-Z]{3})/g)) {
    add(canonicalEquality(`angle(${m[1]})`, `angle(${m[2]})`), 'angle-equality', m[0]);
  }
  for (const m of text.matchAll(/∠([A-Z]{3})=(\d+(?:\.\d+)?)°?/g)) {
    add(`angle(${m[1]})=${Number(m[2])}`, 'angle-value', m[0]);
  }
  // Segment claims are extracted independently; chained equalities become two
  // claims and both must pass verification before the step is marked accepted.
  for (const m of text.matchAll(/(?=([A-Z]{2})=([A-Z]{2}))/g)) {
    const [, a, b] = m;
    if (a[0] === a[1] || b[0] === b[1]) continue;
    add(canonicalEquality(canonicalSide(a[0], a[1]), canonicalSide(b[0], b[1])), 'side-equality', `${a}=${b}`);
  }
  return claims;
}

// Backwards-compatible single-claim helper. Multi-claim statements are
// intentionally not collapsed to an arbitrary first/last conclusion.
export function parseAtomicStatement(statement) {
  const claims = parseAtomicStatements(statement);
  return claims.length === 1 ? claims[0] : null;
}

function conditionFacts(problem, scope = null) {
  const facts = [];
  const conditions = Array.isArray(problem?.given_conditions) ? problem.given_conditions : [];
  for (const c of conditions) {
    const type = String(c?.type ?? '').toLowerCase();
    if (c?.part && scope && c.part !== scope) continue;
    const objects = Array.isArray(c?.objects) ? c.objects : [];
    const statement = String(c?.statement ?? c?.display_text ?? '');
    if (['equal_length', 'length_equality', 'equal_side'].includes(type)) {
      if (objects.length >= 2) {
        const [a, b] = objects;
        if (/^[A-Z]{2}$/.test(a) && /^[A-Z]{2}$/.test(b)) facts.push(canonicalEquality(canonicalSide(a[0], a[1]), canonicalSide(b[0], b[1])));
      }
      for (const claim of parseAtomicStatements(statement)) if (claim.kind === 'side-equality') facts.push(claim.fact);
    } else if (['angle_equal', 'angle_equality', 'equal_angle', 'angle', 'angle_right'].includes(type)) {
      for (const claim of parseAtomicStatements(statement)) {
        if (claim.kind === 'angle-equality' || claim.kind === 'angle-value') facts.push(claim.fact);
      }
    } else if (type === 'diameter') {
      if (objects.length >= 2) {
        const [a, b] = objects;
        if (/^[A-Z]$/.test(a) && /^[A-Z]$/.test(b) && a !== b) facts.push(`diameter(${a}${b})`);
      }
      const dm = /([A-Z])([A-Z]).{0,12}(?:直径|diameter)/i.exec(statement);
      if (dm && dm[1] !== dm[2]) facts.push(`diameter(${dm[1]}${dm[2]})`);
    } else if (type === 'concyclic' || type === 'incidence') {
      // Only explicitly named circle memberships are included. We do not infer
      // same-segment, arc equality, or equal inscribed angles from cyclicity.
      for (const object of objects) if (/^[A-Z]$/.test(object)) facts.push(`onCircle(${object})`);
      const circleMatch = /([A-Z](?:\s*[,、]\s*[A-Z]){1,})\s*(?:are|is|は)?\s*(?:on(?:\s+the)?\s+circle|on\s+circle|円周上|円周上に)/i.exec(statement);
      if (circleMatch) for (const point of circleMatch[1].split(/\s*[,、]\s*/)) if (/^[A-Z]$/.test(point)) facts.push(`onCircle(${point})`);
      const onArc = /([A-Z])\s*(?:lies|is|は).*?(?:arc|弧)\s*([A-Z])([A-Z])/i.exec(statement);
      if (onArc) facts.push(`onCircle(${onArc[1]})`);
    } else if (type === 'parallel') {
      const a = objects[0], b = objects[1];
      if (/^[A-Z]{2}$/.test(a ?? '') && /^[A-Z]{2}$/.test(b ?? '')) facts.push(`parallel(${a},${b})`);
      const pm = /([A-Z]{2})\s*(?:∥|parallel\s+to)\s*([A-Z]{2})/i.exec(statement);
      if (pm) facts.push(`parallel(${pm[1]},${pm[2]})`);
    } else if (type === 'angle_bisector') {
      let vertex = objects[0], bisectorLine = objects[1], angleLabel = objects[2];
      if (typeof bisectorLine === 'string' && /^[A-Z]{2}$/.test(bisectorLine) && typeof angleLabel === 'string' && /^[A-Z]{3}$/.test(angleLabel)) {
        const b = bisectorLine[0] === vertex ? bisectorLine[1] : bisectorLine[1] === vertex ? bisectorLine[0] : null;
        if (/^[A-Z]$/.test(vertex ?? '') && b && angleLabel[1] === vertex && new Set([vertex, angleLabel[0], b, angleLabel[2]]).size === 4) {
          facts.push(`angleBisector(${vertex},${angleLabel[0]},${b},${angleLabel[2]})`);
        }
      }
      const bm = /([A-Z]{2}).{0,18}(?:二等分線|bisector).{0,12}(?:∠|angle\s*)?([A-Z]{3})/i.exec(statement);
      if (bm && bm[2][1] === bm[1][0]) facts.push(`angleBisector(${bm[1][0]},${bm[2][0]},${bm[1][1]},${bm[2][2]})`);
    } else if (type === 'collinear') {
      const points = objects.filter(x => /^[A-Z]$/.test(x));
      if (points.length >= 3) facts.push(`collinear(${points.join('')})`);
      const cm = /([A-Z](?:\s*[,、]\s*[A-Z]){2,}).{0,12}(?:一直線上|collinear)/i.exec(statement);
      if (cm) facts.push(`collinear(${cm[1].split(/\s*[,、]\s*/).join('')})`);
    }
  }
  return [...new Set(facts)];
}

function trianglesFromProblem(problem, targetText) {
  const triangles = new Set();
  const add = (s) => {
    if (typeof s !== 'string') return;
    for (const m of s.matchAll(/△([A-Z]{3})/g)) {
      if (new Set(m[1]).size === 3) triangles.add(`triangle(${m[1]})`);
    }
  };
  add(targetText);
  for (const t of problem?.geometry?.triangles ?? []) {
    const vertices = Array.isArray(t) ? t : t?.vertices;
    if (Array.isArray(vertices) && vertices.length === 3 && vertices.every(x => /^[A-Z]$/.test(x)) && new Set(vertices).size === 3) {
      triangles.add(`triangle(${vertices.join('')})`);
    }
  }
  const legacyTriangles = problem?.geometry?.objects?.triangles;
  if (Array.isArray(legacyTriangles)) for (const item of legacyTriangles) {
    const vertices = Array.isArray(item) ? item.join('') : String(item);
    if (/^[A-Z]{3}$/.test(vertices) && new Set(vertices).size === 3) triangles.add(`triangle(${vertices})`);
  }
  return [...triangles];
}

function getProofGroups(problem) {
  const proof = problem?.proof;
  if (!proof || typeof proof !== 'object') return [];
  const groups = [];
  const add = (id, node, fallbackTarget) => {
    if (!node || typeof node !== 'object') return;
    const steps = Array.isArray(node.steps) ? node.steps
      : Array.isArray(node.solution_steps) ? node.solution_steps
      : Array.isArray(node.selected_solution?.steps) ? node.selected_solution.steps
      : [];
    const target = typeof node.target === 'string' ? node.target
      : typeof node.target?.statement === 'string' ? node.target.statement
      : typeof node.target?.conclusion === 'string' ? node.target.conclusion
      : fallbackTarget ?? '';
    if (steps.length) groups.push({ id, target, steps });
  };
  if (Array.isArray(proof.steps) || proof.selected_solution?.steps || proof.target) {
    add('main', proof, typeof proof.target === 'string' ? proof.target : proof.target?.statement ?? '');
  }
  for (const key of ['P1', 'P2', 'P3']) if (proof[key]) add(key, proof[key]);
  if (proof.selected_solution?.steps && !groups.length) add('main', proof.selected_solution, proof.target?.statement ?? '');
  return groups;
}

function engineAttempt(engine, facts, goal) {
  if (!engine || typeof engine.prove !== 'function') return { success: false, status: 'engine-unavailable' };
  try {
    const result = engine.prove(facts, goal, 200);
    return result?.success
      ? { success: true, status: 'proved-from-accepted-facts', proof: result }
      : { success: false, status: 'not-proved-with-current-rules' };
  } catch (error) {
    return { success: false, status: 'engine-error', error: error?.message ?? String(error) };
  }
}

/**
 * Audits each proof step in order. A statement enters the accepted fact set only
 * if the deterministic engine independently proves it from earlier accepted
 * facts and explicit conditions. Multi-claim/unparsed steps remain unsupported.
 */
function auditDerivedFacts(problem, engine) {
  const rawFacts = Array.isArray(problem?.derived_facts) ? problem.derived_facts : [];
  const scoped = rawFacts.filter(item => !item?.part || item.part === 'P1');
  const facts = [...new Set([...conditionFacts(problem, 'P1'), ...trianglesFromProblem(problem, typeof problem?.proof?.target === 'string' ? problem.proof.target : problem?.proof?.target?.statement ?? '')])];
  const initialFacts = new Set(facts);
  const conditionIds = new Set((problem?.given_conditions ?? []).filter(c => !c?.part || c.part === 'P1').map(c => c?.id).filter(Boolean));
  const acceptedById = new Map();
  const trace = [];
  let proved = 0, alreadyKnown = 0, unproved = 0, unsupported = 0, dependencyWarnings = 0;

  for (const item of scoped) {
    const id = item?.id ?? `F${String(trace.length + 1).padStart(2, '0')}`;
    const statement = String(item?.statement ?? item?.display_text ?? '');
    const claims = parseAtomicStatements(statement);
    const sourceRefs = Array.isArray(item?.derived_from) ? item.derived_from.filter(x => typeof x === 'string') : [];
    const idRefs = sourceRefs.filter(x => /^(?:C|F)\d+$/i.test(x));
    const dependencyIssues = idRefs.filter(ref => {
      if (conditionIds.has(ref)) return false;
      if (/^F/i.test(ref)) return acceptedById.get(ref) !== true;
      return true;
    });
    if (dependencyIssues.length) dependencyWarnings++;
    if (!claims.length) {
      unsupported++;
      acceptedById.set(id, false);
      trace.push({ id, statement, symbolic: null, status: 'unsupported-statement', accepted: false, dependency_issues: dependencyIssues });
      continue;
    }
    const claimResults = [];
    let allAccepted = true, anyNew = false;
    for (const claim of claims) {
      if (facts.includes(claim.fact)) {
        claimResults.push({ symbolic: claim.fact, status: 'already-given-or-established', accepted: true });
        continue;
      }
      const attempt = engineAttempt(engine, facts, claim.fact);
      if (attempt.success) {
        facts.push(claim.fact);
        anyNew = true;
        claimResults.push({ symbolic: claim.fact, status: attempt.status, accepted: true, proof: attempt.proof });
      } else {
        allAccepted = false;
        claimResults.push({ symbolic: claim.fact, status: attempt.status, accepted: false });
      }
    }
    if (allAccepted && anyNew) proved++;
    else if (allAccepted) alreadyKnown++;
    else unproved++;
    acceptedById.set(id, allAccepted);
    trace.push({
      id, statement,
      symbolic: claims.length === 1 ? claims[0].fact : claims.map(x => x.fact),
      status: allAccepted ? (anyNew ? 'all-claims-proved' : 'all-claims-already-known') : 'partially-or-not-proved',
      accepted: allAccepted,
      dependency_issues: dependencyIssues,
      claims: claimResults
    });
  }
  return {
    scope: 'P1',
    source_fact_count: scoped.length,
    initial_fact_count: initialFacts.size,
    accepted_fact_count: facts.length,
    proved_count: proved,
    already_known_count: alreadyKnown,
    unproved_count: unproved,
    unsupported_count: unsupported,
    dependency_warning_count: dependencyWarnings,
    trace
  };
}

export function auditStructuredProof(problem, engine = globalThis.ProofRules) {
  const groups = getProofGroups(problem);
  const derivedFactAudit = auditDerivedFacts(problem, engine);
  const results = groups.map(group => {
    const targetParsed = parseAtomicStatement(group.target);
    const scope = group.id === 'main' ? 'P1' : group.id;
    const scopedFacts = conditionFacts(problem, scope);
    const facts = [...new Set([...scopedFacts, ...trianglesFromProblem(problem, group.target)])];
    const initialFacts = new Set(facts);
    const trace = [];
    let proved = 0, unproved = 0, unsupported = 0, alreadyKnown = 0;
    for (let i = 0; i < group.steps.length; i++) {
      const raw = group.steps[i];
      const statement = typeof raw === 'string' ? raw : String(raw?.statement ?? '');
      const id = typeof raw === 'object' ? raw.id ?? `S${String(i + 1).padStart(2, '0')}` : `S${String(i + 1).padStart(2, '0')}`;
      const parsedClaims = parseAtomicStatements(statement);
      if (!parsedClaims.length) {
        unsupported++;
        trace.push({ id, statement, symbolic: null, status: 'unsupported-statement', accepted: false });
        continue;
      }
      const claimTrace = [];
      let allAccepted = true;
      let anyNewlyProved = false;
      for (const parsed of parsedClaims) {
        if (facts.includes(parsed.fact)) {
          claimTrace.push({ symbolic: parsed.fact, status: 'already-given-or-established', accepted: true });
          continue;
        }
        const attempt = engineAttempt(engine, facts, parsed.fact);
        if (attempt.success) {
          facts.push(parsed.fact);
          anyNewlyProved = true;
          claimTrace.push({ symbolic: parsed.fact, status: attempt.status, accepted: true, proof: attempt.proof });
        } else {
          allAccepted = false;
          claimTrace.push({ symbolic: parsed.fact, status: attempt.status, accepted: false, ...(attempt.error ? { error: attempt.error } : {}) });
        }
      }
      if (allAccepted && anyNewlyProved) proved++;
      else if (allAccepted) alreadyKnown++;
      else unproved++;
      trace.push({
        id,
        statement,
        symbolic: parsedClaims.length === 1 ? parsedClaims[0].fact : parsedClaims.map(x => x.fact),
        status: allAccepted ? (anyNewlyProved ? 'all-claims-proved' : 'all-claims-already-known') : 'partially-or-not-proved',
        accepted: allAccepted,
        claims: claimTrace
      });
    }
    let targetResult = { target: group.target, symbolic: targetParsed?.fact ?? null, status: targetParsed ? 'not-tested' : 'unsupported-target' };
    if (targetParsed) {
      if (facts.includes(targetParsed.fact) && initialFacts.has(targetParsed.fact)) targetResult.status = 'already-given';
      else if (facts.includes(targetParsed.fact)) targetResult.status = 'proved-in-step-sequence';
      else {
        const attempt = engineAttempt(engine, facts, targetParsed.fact);
        targetResult = { target: group.target, symbolic: targetParsed.fact, status: attempt.status, ...(attempt.proof ? { proof: attempt.proof } : {}) };
      }
    }
    return {
      id: group.id,
      target: group.target,
      initial_fact_count: scopedFacts.length,
      accepted_fact_count: facts.length,
      step_count: group.steps.length,
      proved_step_count: proved,
      already_known_step_count: alreadyKnown,
      unproved_step_count: unproved,
      unsupported_step_count: unsupported,
      target_result: targetResult,
      trace
    };
  });
  return {
    version: '1.0.0',
    mode: 'conservative-stepwise',
    engine_available: Boolean(engine?.prove),
    proof_group_count: results.length,
    derived_fact_audit: derivedFactAudit,
    fully_proved_group_count: results.filter(r =>
      ['proved-from-accepted-facts', 'proved-in-step-sequence', 'already-given'].includes(r.target_result.status) &&
      r.unproved_step_count === 0 && r.unsupported_step_count === 0
    ).length,
    groups: results,
    limitations: [
      '問題文の明示条件から、実装済みの記号化規則で表現できる事実だけを初期事実にします。',
      'reason欄や図の配置から、記号化できない事実を推測して追加しません。',
      '未証明・未対応は、命題が偽であることを意味しません。',
      '証明ステップの結論は、前のステップまでに受理された事実から証明できた場合にのみ追加します。',
      'derived_factsのreasonやderived_fromは前提として信用せず、記号化できる命題を別途検証します。'
    ]
  };
}
