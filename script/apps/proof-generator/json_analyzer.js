/**
 * JSON Analyzer
 *
 * 入試問題JSONをアプリ内部モデルへ変換する。
 * geometry_solver により、描画用の実座標もここで生成する。
 */

import { buildGeometryModel } from "./geometry/geometry_solver.js";

export function analyzeProblem(data) {
  if (!data || typeof data !== "object") {
    throw new Error("問題JSONが不正です。");
  }

  const metadata = analyzeMetadata(data.metadata);
  const geometry = analyzeGeometry(
    data.geometry,
    data.generation,
    metadata
  );

  return {
    raw: data,
    metadata,
    problem: analyzeProblemInfo(data.problem),
    geometry,
    conditions: analyzeConditions(data.given_conditions),
    facts: analyzeFacts(data.derived_facts),
    proof: analyzeProof(data.proof),
    followUp: analyzeFollowUp(data.follow_up),
    analysis: data.analysis ?? {},
    generation: data.generation ?? {},
    validation: data.validation ?? {}
  };
}

function analyzeMetadata(metadata = {}) {
  return {
    id: metadata.id ?? "",
    prefecture: metadata.prefecture ?? "",
    examType: metadata.exam_type ?? "",
    subject: metadata.subject ?? "",
    year: metadata.year ?? null,
    problemNumber: metadata.problem_number ?? "",
    points: metadata.points ?? 0,
    tags: metadata.tags ?? [],
    source: metadata.source ?? {}
  };
}

function analyzeProblemInfo(problem = {}) {
  return {
    section: problem.section ?? "",
    subproblems: problem.subproblems ?? []
  };
}

function analyzeGeometry(geometry = {}, generation = {}, metadata = {}) {
  const objects = geometry.objects ?? {};

  const source = {
    coordinateSystem: geometry.coordinate_system ?? {},
    objects: {
      points: objects.points ?? [],
      segments: objects.segments ?? [],
      lines: objects.lines ?? [],
      circles: objects.circles ?? [],
      triangles: objects.triangles ?? []
    },
    incidence: geometry.incidence ?? [],
    intersections: geometry.intersections ?? [],
    relationships: geometry.relationships ?? [],
    constructionSequence: geometry.construction_sequence ?? [],
    display: geometry.display ?? {}
  };

  const model = buildGeometryModel(source, generation, metadata);

  return {
    ...source,
    model,
    pointIds: new Set((objects.points ?? []).map(p => p.id))
  };
}

function analyzeConditions(conditions = []) {
  return conditions.map(condition => ({
    ...condition,
    displayText:
      condition.display_text ??
      formatCondition(condition)
  }));
}

function analyzeFacts(facts = []) {
  const map = new Map();

  for (const fact of facts) {
    map.set(fact.id, {
      ...fact,
      dependencies: fact.derived_from ?? []
    });
  }

  return {
    list: facts,
    map
  };
}

function analyzeProof(proof = {}) {
  const solution = proof.selected_solution ?? {};

  return {
    problemId: proof.problem_id ?? "",
    target: proof.target ?? {},
    targetDecomposition: proof.target_decomposition ?? {},
    strategy: solution.strategy ?? "",
    steps: solution.steps ?? [],
    answerGeneration: proof.answer_generation ?? {}
  };
}

function analyzeFollowUp(followUp = {}) {
  return {
    exists: Boolean(followUp.exists),
    problems: followUp.problems ?? []
  };
}

function formatCondition(condition) {
  const type = condition.type;
  const objects = condition.objects ?? [];

  switch (type) {
    case "concyclic":
      return `${objects.join("，")}は同一円周上`;
    case "equal_length":
      return objects.join("＝");
    case "parallel":
      return `${objects[0]}∥${objects[1]}`;
    case "intersection":
      return `${objects.join("∩")} = ${condition.result ?? ""}`;
    default:
      return objects.join("，");
  }
}

export function isKnownProofStep(step, analyzed) {
  if (!step) return false;

  return (step.input ?? []).every(id => {
    if (id.startsWith("C")) {
      return analyzed.conditions.some(c => c.id === id);
    }

    if (id.startsWith("F")) {
      return analyzed.facts.map.has(id);
    }

    return id === "PROOF_CONCLUSION";
  });
}

export function canDeriveFact(factId, availableIds, analyzed) {
  if (availableIds.has(factId)) return true;

  const fact = analyzed.facts.map.get(factId);
  if (!fact) return false;

  return fact.dependencies.every(dep =>
    canDeriveFact(dep, availableIds, analyzed)
  );
}
