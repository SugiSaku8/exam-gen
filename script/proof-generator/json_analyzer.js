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

/**
 * 問題JSONをジェネレーター内部で扱いやすい形に正規化する。
 *
 * normalizeProblem()
 *     ↓
 * analyzeProblem()
 *
 * ここでは問題の意味を解析しない。
 * あくまで「データの形を揃える」ことだけを担当する。
 *
 * @param {object} input
 * @returns {object}
 */
export function normalizeProblem(input) {

  if (!input || typeof input !== 'object') {
    throw new TypeError(
      'normalizeProblem: 問題データがobjectではありません。'
    );
  }

  /*
   * 元JSONを直接書き換えない。
   *
   * JSON.parse()したデータをそのまま渡す場合でも、
   * analyzer内部で予期せぬ変更が起きないようにする。
   */
  const data = structuredClone(input);


  /*
   * --------------------------------------------------
   * metadata
   * --------------------------------------------------
   */

  data.metadata ??= {};

  if (data.metadata.year == null && data.year != null) {
    data.metadata.year = data.year;
  }

  if (data.metadata.problem == null && data.problem_number != null) {
    data.metadata.problem = data.problem_number;
  }

  data.metadata.tags ??= [];


  /*
   * --------------------------------------------------
   * problem
   * --------------------------------------------------
   */

  data.problem ??= {};

  data.problem.subproblems ??= [];

  /*
   * 小問IDを保証する。
   *
   * JSONによっては id が無い可能性があるため、
   * 順番から自動生成する。
   */
  data.problem.subproblems =
    data.problem.subproblems.map(
      (subproblem, index) => {

        const normalized = {
          ...subproblem
        };

        if (
          normalized.id === undefined ||
          normalized.id === null
        ) {
          normalized.id = `P${index + 1}`;
        }

        if (normalized.number == null) {
          normalized.number = index + 1;
        }

        normalized.type ??= 'unknown';

        return normalized;
      }
    );


  /*
   * --------------------------------------------------
   * geometry
   * --------------------------------------------------
   */

  data.geometry ??= {};

  data.geometry.coordinate_system ??= {
    type: 'schematic',
    exact_coordinates: null
  };

  data.geometry.points ??= [];
  data.geometry.segments ??= [];
  data.geometry.lines ??= [];
  data.geometry.circles ??= [];
  data.geometry.triangles ??= [];
  data.geometry.incidence ??= [];
  data.geometry.intersections ??= [];
  data.geometry.relationships ??= [];
  data.geometry.construction_sequence ??= [];
  data.geometry.display ??= {};


  /*
   * --------------------------------------------------
   * given_conditions
   * --------------------------------------------------
   *
   * 与えられた条件は配列として統一する。
   */

  if (!Array.isArray(data.given_conditions)) {

    if (
      data.given_conditions &&
      typeof data.given_conditions === 'object'
    ) {
      data.given_conditions =
        Object.entries(data.given_conditions)
          .map(([id, condition]) => ({
            id,
            ...(
              typeof condition === 'object'
                ? condition
                : {
                    statement: String(condition)
                  }
            )
          }));
    } else {
      data.given_conditions = [];
    }
  }


  /*
   * --------------------------------------------------
   * derived_facts
   * --------------------------------------------------
   */

  if (!Array.isArray(data.derived_facts)) {

    if (
      data.derived_facts &&
      typeof data.derived_facts === 'object'
    ) {
      data.derived_facts =
        Object.entries(data.derived_facts)
          .map(([id, fact]) => ({
            id,
            ...(
              typeof fact === 'object'
                ? fact
                : {
                    statement: String(fact)
                  }
            )
          }));
    } else {
      data.derived_facts = [];
    }
  }


  /*
   * --------------------------------------------------
   * proof
   * --------------------------------------------------
   */

  data.proof ??= {};

  data.proof.target ??= null;

  data.proof.required_conditions ??= [];

  data.proof.selected_solution ??= {};

  data.proof.selected_solution.steps ??= [];


  /*
   * --------------------------------------------------
   * follow_up
   * --------------------------------------------------
   */

  data.follow_up ??= {};

  data.follow_up.problems ??= [];


  /*
   * --------------------------------------------------
   * analysis
   * --------------------------------------------------
   */

  data.analysis ??= {};

  data.analysis.proof_pattern ??= [];


  /*
   * --------------------------------------------------
   * generation
   * --------------------------------------------------
   */

  data.generation ??= {};

  data.generation.can_generate_problem ??= false;
  data.generation.can_generate_answer ??= false;

  data.generation.randomizable ??= {};


  /*
   * --------------------------------------------------
   * validation
   * --------------------------------------------------
   */

  data.validation ??= {};

  data.validation.errors ??= [];
  data.validation.warnings ??= [];


  /*
   * --------------------------------------------------
   * IDの正規化
   * --------------------------------------------------
   *
   * geometry内で参照されるIDが
   * 数値などになっていても文字列として扱う。
   */

  normalizeIds(data.geometry.points, 'id');
  normalizeIds(data.geometry.segments, 'id');
  normalizeIds(data.geometry.lines, 'id');
  normalizeIds(data.geometry.circles, 'id');
  normalizeIds(data.geometry.triangles, 'id');

  normalizeIds(
    data.geometry.intersections,
    'id'
  );


  /*
   * --------------------------------------------------
   * geometryの参照関係
   * --------------------------------------------------
   *
   * 2014/2015 JSONでは
   *
   *   l_BD
   *   BD
   *
   * のような表記揺れが存在するため、
   * 参照用のIDを正規化する。
   */

  normalizeGeometryReferences(data.geometry);


  /*
   * --------------------------------------------------
   * proof steps
   * --------------------------------------------------
   */

  data.proof.selected_solution.steps =
    data.proof.selected_solution.steps.map(
      (step, index) => {

        const normalized = {
          ...step
        };

        if (
          normalized.id === undefined ||
          normalized.id === null
        ) {
          normalized.id = `S${String(index + 1).padStart(2, '0')}`;
        }

        normalized.order ??= index + 1;

        normalized.requires ??= [];
        normalized.outputs ??= [];

        return normalized;
      }
    );


  /*
   * --------------------------------------------------
   * 完成
   * --------------------------------------------------
   */

  return data;
}


/**
 * 配列内オブジェクトのIDを文字列化する。
 */
function normalizeIds(array, key) {

  if (!Array.isArray(array)) {
    return;
  }

  for (const item of array) {

    if (!item || typeof item !== 'object') {
      continue;
    }

    if (
      item[key] !== undefined &&
      item[key] !== null
    ) {
      item[key] = String(item[key]);
    }
  }
}


/**
 * geometry内の参照IDを正規化する。
 *
 * l_BD と BD のような表記揺れについて、
 * 実体として存在するIDを優先する。
 */
function normalizeGeometryReferences(geometry) {

  const lineIds = new Set(
    Array.isArray(geometry.lines)
      ? geometry.lines
          .map(line => line?.id)
          .filter(Boolean)
          .map(String)
      : []
  );

  const normalizeReference = value => {

    if (
      value === undefined ||
      value === null
    ) {
      return value;
    }

    const id = String(value);

    if (lineIds.has(id)) {
      return id;
    }

    const prefixed = `l_${id}`;

    if (lineIds.has(prefixed)) {
      return prefixed;
    }

    return id;
  };


  /*
   * intersections
   */

  if (Array.isArray(geometry.intersections)) {

    for (const intersection of geometry.intersections) {

      if (!intersection) {
        continue;
      }

      if (intersection.line1 != null) {
        intersection.line1 =
          normalizeReference(intersection.line1);
      }

      if (intersection.line2 != null) {
        intersection.line2 =
          normalizeReference(intersection.line2);
      }
    }
  }


  /*
   * lines
   */

  if (Array.isArray(geometry.lines)) {

    for (const line of geometry.lines) {

      if (!line) {
        continue;
      }

      if (Array.isArray(line.through)) {
        line.through =
          line.through.map(String);
      }
    }
  }


  /*
   * relationships
   */

  if (Array.isArray(geometry.relationships)) {

    for (const relationship of geometry.relationships) {

      if (!relationship) {
        continue;
      }

      if (Array.isArray(relationship.objects)) {

        relationship.objects =
          relationship.objects.map(
            normalizeReference
          );
      }

      if (Array.isArray(relationship.lines)) {

        relationship.lines =
          relationship.lines.map(
            normalizeReference
          );
      }
    }
  }
}
