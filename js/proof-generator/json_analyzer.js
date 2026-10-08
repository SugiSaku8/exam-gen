export function normalizeProblem(data) {
  const problem = structuredClone(data ?? {});
  const analysis = problem.analysis ?? {};

  analysis.year ??= problem.metadata?.year ?? null;
  analysis.section ??= problem.metadata?.section ?? problem.metadata?.problem_number ?? '';
  analysis.points ??= problem.metadata?.points ?? 0;
  analysis.tags ??= problem.metadata?.tags ?? [];
  analysis.proof ??= problem.proof ?? null;
  analysis.givenConditions ??= problem.given_conditions ?? [];
  analysis.derivedFacts ??= problem.derived_facts ?? [];

  if (!Array.isArray(analysis.tags)) analysis.tags = [];
  if (!Array.isArray(analysis.givenConditions)) analysis.givenConditions = [];
  if (!Array.isArray(analysis.derivedFacts)) analysis.derivedFacts = [];

  problem.analysis = analysis;
  problem.given_conditions ??= analysis.givenConditions;
  problem.derived_facts ??= analysis.derivedFacts;
  problem.problem ??= { subproblems: [] };
  problem.problem.subproblems ??= [];

  return problem;
}

export function analyzeProblem(data) {
  const problem = normalizeProblem(data);
  const analysis = problem.analysis;
  return {
    year: analysis.year,
    section: analysis.section,
    points: analysis.points,
    tags: analysis.tags,
    proof: analysis.proof,
    givenConditions: analysis.givenConditions,
    derivedFacts: analysis.derivedFacts,
    subproblems: problem.problem.subproblems,
    hasGeometry: Boolean(problem.geometryModel ?? problem.geometry),
    hasProof: Boolean(problem.proof ?? analysis.proof),
    hasFollowUp: Boolean(problem.follow_up?.problems?.length)
  };
}
