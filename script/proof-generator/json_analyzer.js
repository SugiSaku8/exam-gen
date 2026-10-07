import {
  buildGeometryModel
} from './geometry/geometry_solver.js';


/* =========================================================
 * normalizeProblem
 * =======================================================*/

/**
 * 問題JSONを内部標準形式へ正規化する。
 *
 * 役割：
 * - 欠落している配列・オブジェクトを補完
 * - IDを文字列へ統一
 * - geometry内の参照を正規化
 * - proof stepの基本構造を統一
 *
 * 問題の「意味」の解析はここでは行わない。
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

  const data =
    typeof structuredClone === 'function'
      ? structuredClone(input)
      : JSON.parse(JSON.stringify(input));


  /* -------------------------------------------------------
   * metadata
   * -----------------------------------------------------*/

  data.metadata ??= {};

  if (
    data.metadata.year == null &&
    data.year != null
  ) {
    data.metadata.year = data.year;
  }

  if (
    data.metadata.problem == null &&
    data.problem_number != null
  ) {
    data.metadata.problem =
      data.problem_number;
  }

  if (
    !Array.isArray(data.metadata.tags)
  ) {
    data.metadata.tags = [];
  }


  /* -------------------------------------------------------
   * problem
   * -----------------------------------------------------*/

  data.problem ??= {};

  if (
    !Array.isArray(data.problem.subproblems)
  ) {
    data.problem.subproblems = [];
  }

  data.problem.subproblems =
    data.problem.subproblems.map(
      (subproblem, index) => {

        const normalized = {
          ...subproblem
        };

        normalized.id ??=
          `P${index + 1}`;

        normalized.number ??=
          index + 1;

        normalized.type ??=
          'unknown';

        return normalized;
      }
    );


  /* -------------------------------------------------------
   * geometry
   * -----------------------------------------------------*/

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


  /* -------------------------------------------------------
   * conditions
   * -----------------------------------------------------*/

  data.given_conditions =
    normalizeArray(
      data.given_conditions
    );

  data.derived_facts =
    normalizeArray(
      data.derived_facts
    );


  /* -------------------------------------------------------
   * proof
   * -----------------------------------------------------*/

  data.proof ??= {};

  data.proof.target ??= null;

  data.proof.required_conditions ??= [];

  data.proof.selected_solution ??= {};

  if (
    !Array.isArray(
      data.proof.selected_solution.steps
    )
  ) {
    data.proof.selected_solution.steps = [];
  }

  data.proof.selected_solution.steps =
    data.proof.selected_solution.steps.map(
      (step, index) => {

        const normalized = {
          ...step
        };

        normalized.id ??=
          `S${String(index + 1).padStart(2, '0')}`;

        normalized.order ??=
          index + 1;

        normalized.requires ??= [];
        normalized.outputs ??= [];

        return normalized;
      }
    );


  /* -------------------------------------------------------
   * follow up
   * -----------------------------------------------------*/

  data.follow_up ??= {};

  if (
    !Array.isArray(data.follow_up.problems)
  ) {
    data.follow_up.problems = [];
  }


  /* -------------------------------------------------------
   * analysis
   * -----------------------------------------------------*/

  data.analysis ??= {};

  if (
    !Array.isArray(
      data.analysis.proof_pattern
    )
  ) {
    data.analysis.proof_pattern = [];
  }


  /* -------------------------------------------------------
   * generation
   * -----------------------------------------------------*/

  data.generation ??= {};

  data.generation.can_generate_problem ??=
    false;

  data.generation.can_generate_answer ??=
    false;

  data.generation.randomizable ??= {};


  /* -------------------------------------------------------
   * validation
   * -----------------------------------------------------*/

  data.validation ??= {};

  if (
    !Array.isArray(data.validation.errors)
  ) {
    data.validation.errors = [];
  }

  if (
    !Array.isArray(data.validation.warnings)
  ) {
    data.validation.warnings = [];
  }


  /* -------------------------------------------------------
   * ID
   * -----------------------------------------------------*/

  normalizeIds(
    data.geometry.points
  );

  normalizeIds(
    data.geometry.segments
  );

  normalizeIds(
    data.geometry.lines
  );

  normalizeIds(
    data.geometry.circles
  );

  normalizeIds(
    data.geometry.triangles
  );

  normalizeIds(
    data.geometry.intersections
  );


  /* -------------------------------------------------------
   * geometry references
   * -----------------------------------------------------*/

  normalizeGeometryReferences(
    data.geometry
  );


  return data;
}


/* =========================================================
 * analyzeProblem
 * =======================================================*/

/**
 * 問題JSONを解析し、
 * UI・生成ロジックが利用するAnalysisを作る。
 *
 * @param {object} input
 * @returns {object}
 */
export function analyzeProblem(input) {

  const data =
    normalizeProblem(input);


  const metadata =
    data.metadata ?? {};

  const problem =
    data.problem ?? {};


  /* -------------------------------------------------------
   * Geometry
   * -----------------------------------------------------*/

  const geometry =
    analyzeGeometry(data);


  /* -------------------------------------------------------
   * UIから扱う基本情報
   * -----------------------------------------------------*/

  const year =
    metadata.year ?? null;

  const section =
    metadata.section ??
    metadata.subject ??
    '';

  const points =
    Number.isFinite(
      Number(metadata.points)
    )
      ? Number(metadata.points)
      : 0;

  const tags =
    Array.isArray(metadata.tags)
      ? metadata.tags
      : [];


  /* -------------------------------------------------------
   * Conditions
   * -----------------------------------------------------*/

  const givenConditions =
    Array.isArray(data.given_conditions)
      ? data.given_conditions
      : [];

  const derivedFacts =
    Array.isArray(data.derived_facts)
      ? data.derived_facts
      : [];


  /* -------------------------------------------------------
   * Proof
   * -----------------------------------------------------*/

  const proof =
    analyzeProof(
      data.proof,
      givenConditions,
      derivedFacts
    );


  /* -------------------------------------------------------
   * Follow-up
   * -----------------------------------------------------*/

  const followUp =
    data.follow_up ?? {
      problems: []
    };


  /* -------------------------------------------------------
   * Generation
   * -----------------------------------------------------*/

  const generation =
    data.generation ?? {};


  /* -------------------------------------------------------
   * Validation
   * -----------------------------------------------------*/

  const validation =
    data.validation ?? {};


  /* -------------------------------------------------------
   * Analysis
   * -----------------------------------------------------*/

  const analysisInfo = {
    ...(data.analysis ?? {})
  };


  /*
   * UI / Generatorが利用する統一形式
   */
  return {

    year,

    section,

    points,

    tags,

    problem,

    geometry,

    givenConditions,

    derivedFacts,

    proof,

    followUp,

    analysis:
      analysisInfo,

    generation,

    validation
  };
}


/* =========================================================
 * analyzeGeometry
 * =======================================================*/

/**
 * geometryを解析する。
 *
 * geometry_solverに実際の座標計算を委譲する。
 */
function analyzeGeometry(data) {

  const source =
    data.geometry ?? {};

  const generation =
    data.generation ?? {};

  const metadata =
    data.metadata ?? {};


  const model =
    buildGeometryModel(
      source,
      generation,
      metadata
    );


  return {

    source,

    model
  };
}


/* =========================================================
 * analyzeProof
 * =======================================================*/

/**
 * 証明情報を解析する。
 *
 * 現段階ではJSONに記録されている証明情報を
 * 安全な内部形式へまとめる。
 */
function analyzeProof(
  proof,
  givenConditions,
  derivedFacts
) {

  if (!proof || typeof proof !== 'object') {
    return null;
  }


  const target =
    proof.target ?? null;


  const requiredConditions =
    Array.isArray(
      proof.required_conditions
    )
      ? proof.required_conditions
      : [];


  const selectedSolution =
    proof.selected_solution ?? {};


  const steps =
    Array.isArray(
      selectedSolution.steps
    )
      ? selectedSolution.steps
      : [];


  return {

    ...proof,

    target,

    requiredConditions,

    selectedSolution: {

      ...selectedSolution,

      steps
    },

    /*
     * 証明解析時に参照できるように
     * 条件・導出事実を紐付けておく。
     */
    availableConditions:
      givenConditions,

    availableFacts:
      derivedFacts
  };
}


/* =========================================================
 * normalize helpers
 * =======================================================*/

/**
 * 配列形式を保証する。
 */
function normalizeArray(value) {

  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === 'object'
  ) {

    return Object.entries(value)
      .map(([id, item]) => {

        if (
          item &&
          typeof item === 'object'
        ) {
          return {
            id,
            ...item
          };
        }

        return {
          id,
          statement: String(item)
        };
      });
  }

  return [];
}


/**
 * IDを文字列へ統一する。
 */
function normalizeIds(array) {

  if (!Array.isArray(array)) {
    return;
  }

  for (const item of array) {

    if (
      !item ||
      typeof item !== 'object'
    ) {
      continue;
    }

    if (
      item.id !== undefined &&
      item.id !== null
    ) {
      item.id =
        String(item.id);
    }
  }
}


/**
 * geometry内の参照IDを正規化する。
 */
function normalizeGeometryReferences(
  geometry
) {

  const lineIds =
    new Set(
      Array.isArray(geometry.lines)
        ? geometry.lines
            .map(line => line?.id)
            .filter(Boolean)
            .map(String)
        : []
    );


  const normalizeLineReference =
    value => {

      if (
        value === undefined ||
        value === null
      ) {
        return value;
      }

      const id =
        String(value);

      /*
       * 実在するIDを優先
       */
      if (lineIds.has(id)) {
        return id;
      }

      /*
       * BD → l_BD
       */
      const prefixed =
        `l_${id}`;

      if (lineIds.has(prefixed)) {
        return prefixed;
      }

      return id;
    };


  /* intersections */

  if (
    Array.isArray(
      geometry.intersections
    )
  ) {

    for (
      const intersection
      of geometry.intersections
    ) {

      if (!intersection) {
        continue;
      }

      if (
        intersection.line1 != null
      ) {
        intersection.line1 =
          normalizeLineReference(
            intersection.line1
          );
      }

      if (
        intersection.line2 != null
      ) {
        intersection.line2 =
          normalizeLineReference(
            intersection.line2
          );
      }
    }
  }


  /* lines */

  if (
    Array.isArray(geometry.lines)
  ) {

    for (
      const line
      of geometry.lines
    ) {

      if (!line) {
        continue;
      }

      if (
        Array.isArray(line.through)
      ) {

        line.through =
          line.through.map(String);
      }
    }
  }


  /* relationships */

  if (
    Array.isArray(
      geometry.relationships
    )
  ) {

    for (
      const relationship
      of geometry.relationships
    ) {

      if (!relationship) {
        continue;
      }

      if (
        Array.isArray(
          relationship.objects
        )
      ) {

        relationship.objects =
          relationship.objects.map(
            value =>
              normalizeLineReference(value)
          );
      }

      if (
        Array.isArray(
          relationship.lines
        )
      ) {

        relationship.lines =
          relationship.lines.map(
            value =>
              normalizeLineReference(value)
          );
      }
    }
  }
}


/* =========================================================
 * Proof utility functions
 * =======================================================*/

/**
 * 証明ステップが既知のものか判定する。
 */
export function isKnownProofStep(
  step,
  analyzed
) {

  if (!step || !analyzed) {
    return false;
  }

  const facts =
    analyzed.derivedFacts ?? [];

  const conditions =
    analyzed.givenConditions ?? [];

  const availableIds =
    new Set([
      ...conditions.map(
        item => item?.id
      ),
      ...facts.map(
        item => item?.id
      )
    ]);

  const requires =
    Array.isArray(step.requires)
      ? step.requires
      : [];

  return requires.every(
    id => availableIds.has(id)
  );
}


/**
 * factIdが現在利用可能な事実か判定する。
 */
export function canDeriveFact(
  factId,
  availableIds,
  analyzed
) {

  if (
    !factId ||
    !analyzed
  ) {
    return false;
  }

  const facts =
    analyzed.derivedFacts ?? [];

  const fact =
    facts.find(
      item => item?.id === factId
    );

  if (!fact) {
    return false;
  }

  const available =
    availableIds instanceof Set
      ? availableIds
      : new Set(
          Array.isArray(availableIds)
            ? availableIds
            : []
        );


  /*
   * requiresが無い事実は、
   * JSON上では導出可能とみなす。
   */
  if (
    !Array.isArray(fact.requires) ||
    fact.requires.length === 0
  ) {
    return true;
  }


  return fact.requires.every(
    id => available.has(id)
  );
}
