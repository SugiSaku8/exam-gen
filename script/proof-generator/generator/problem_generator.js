/**
 * problem_generator.js
 *
 * 構造化された過去問JSONから、
 * 「類似する新しい問題」を生成する。
 *
 * 方針:
 *   - MLは使用しない
 *   - generation.template_id を核にする
 *   - geometry_solver.js に幾何計算を委譲する
 *   - 問題固有の処理をGenerator本体に埋め込まない
 *   - 後からJSONを追加しても、
 *     templateを登録するだけで対応できる構造にする
 */

import {
  solveGeometry
} from './geometry_solver.js';


/* =========================================================
 * 基本ユーティリティ
 * ======================================================= */

/**
 * 整数乱数
 */
function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}


/**
 * 配列からランダムに1つ選ぶ
 */
function randomChoice(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  return array[
    randomInt(0, array.length - 1)
  ];
}


/**
 * 配列をシャッフル
 */
function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
}


/**
 * 値を範囲内に制限
 */
function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


/**
 * 数値を指定桁に丸める
 */
function round(value, digits = 10) {
  const factor =
    10 ** digits;

  return Math.round(
    value * factor
  ) / factor;
}


/* =========================================================
 * Point label
 * ======================================================= */

const DEFAULT_POINT_LABELS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H'
];


/**
 * 点名をランダム化する。
 *
 * 例:
 *   A B C D E F G
 *
 * →
 *   C A E B D G F
 */
function createPointLabelMap(
  pointIds,
  enabled = true
) {
  const map = {};

  if (!enabled) {
    for (const id of pointIds) {
      map[id] = id;
    }

    return map;
  }

  const labels =
    DEFAULT_POINT_LABELS.slice(
      0,
      pointIds.length
    );

  const shuffled =
    shuffle(labels);

  pointIds.forEach(
    (id, index) => {
      map[id] =
        shuffled[index];
    }
  );

  return map;
}


/* =========================================================
 * Generator Context
 * ======================================================= */

class GenerationContext {

  constructor(source) {

    this.source =
      source;

    this.metadata =
      source?.metadata ?? {};

    this.geometry =
      source?.geometry ?? {};

    this.generation =
      source?.generation ?? {};

    this.proof =
      source?.proof ?? null;

    this.followUp =
      source?.follow_up ?? null;

    this.random =
      {};
  }


  /**
   * generation.randomizable の取得
   */
  canRandomize(name) {

    return Boolean(
      this.generation
        ?.randomizable
        ?.[
          name
        ]
    );
  }


  /**
   * 元JSONの制約
   */
  getConstraints() {

    return [
      ...(
        this.generation
          ?.constraints ??
        []
      )
    ];
  }
}


/* =========================================================
 * Template Registry
 * ======================================================= */

/**
 * Template Registry
 *
 * 新しい問題形式を追加するときは、
 *
 * registerTemplate({
 *   id: '...',
 *   canGenerate(context) {},
 *   generate(context) {}
 * });
 *
 * とする。
 *
 * Generator本体を変更する必要はない。
 */

class TemplateRegistry {

  constructor() {
    this.templates =
      new Map();
  }


  register(template) {

    if (
      !template ||
      !template.id
    ) {
      throw new Error(
        'Generation templateにはidが必要です。'
      );
    }

    if (
      typeof template.generate !==
      'function'
    ) {
      throw new Error(
        `Template "${template.id}" `
        + 'にはgenerate()が必要です。'
      );
    }

    this.templates.set(
      template.id,
      template
    );
  }


  get(id) {
    return this.templates.get(id);
  }


  find(context) {

    /*
     * まずtemplate_idを優先する。
     */
    const templateId =
      context.generation
        ?.template_id;

    if (templateId) {

      const exact =
        this.get(templateId);

      if (exact) {
        return exact;
      }
    }


    /*
     * template_idが存在しない場合は
     * canGenerate()による探索。
     */
    for (
      const template
      of this.templates.values()
    ) {

      if (
        typeof template.canGenerate !==
        'function'
      ) {
        continue;
      }

      if (
        template.canGenerate(context)
      ) {
        return template;
      }
    }

    return null;
  }
}


/* =========================================================
 * 2014年型 Template
 * ======================================================= */

const SHIZUOKA_2014_TEMPLATE = {

  id:
    'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001',


  canGenerate(context) {

    const tags =
      context.metadata
        ?.tags ?? [];

    return (
      tags.includes('circle') &&
      tags.includes('isosceles_triangle') &&
      tags.includes('parallel_lines') &&
      (
        tags.includes('congruence') ||
        context.proof?.target?.type ===
        'congruence'
      )
    );
  },


  /**
   * 問題生成
   */
  generate(context) {

    const source =
      context.source;

    const randomizable =
      context.generation
        ?.randomizable ?? {};


    /*
     * -----------------------------------------
     * 1. 円
     * -----------------------------------------
     */

    const radius =
      this.generateRadius(
        source
      );


    /*
     * -----------------------------------------
     * 2. 円周上の点
     *
     * 2014型では
     *
     * A
     * B
     * C
     * D
     * E
     *
     * を円周上に置く。
     * -----------------------------------------
     */

    const arcRatio =
      this.generateArcRatio(
        source
      );


    /*
     * -----------------------------------------
     * 3. 図形パラメータ
     * -----------------------------------------
     */

    const parameters = {

      radius,

      arcRatio,

      /*
       * 円周上の基準位置。
       */
      rotation:
        randomizable.circle_orientation
          ? randomInt(0, 359)
          : 0,

      /*
       * AC = AD
       *
       * 2014型では、
       * Aから等しい弦を引く。
       */
      equalChord:
        'AC=AD',

      /*
       * CE ∥ BD
       */
      parallel:
        'CE∥BD'
    };


    /*
     * -----------------------------------------
     * 4. 点名
     * -----------------------------------------
     */

    const pointIds = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G'
    ];

    const labels =
      randomizable.point_labels
        ? createPointLabelMap(
            pointIds
          )
        : Object.fromEntries(
            pointIds.map(
              id => [
                id,
                id
              ]
            )
          );


    /*
     * -----------------------------------------
     * 5. geometry_solverへ渡す
     * -----------------------------------------
     */

    const geometry =
      solveGeometry({

        template:
          this.id,

        radius,

        arcRatio,

        rotation:
          parameters.rotation,

        labels
      });


    /*
     * -----------------------------------------
     * 6. 証明問題
     * -----------------------------------------
     */

    const proof =
      this.generateProof(
        parameters
      );


    /*
     * -----------------------------------------
     * 7. (2)の数値条件
     * -----------------------------------------
     */

    const followUp =
      this.generateFollowUp(
        parameters
      );


    /*
     * -----------------------------------------
     * 8. 完成した問題
     * -----------------------------------------
     */

    return {

      schema_version:
        '1.0.0',

      metadata: {

        id:
          `generated_${Date.now()}`,

        prefecture:
          source.metadata?.prefecture ??
          '静岡県',

        exam_type:
          source.metadata?.exam_type ??
          '公立高校入試',

        subject:
          source.metadata?.subject ??
          '数学',

        year:
          source.metadata?.year ??
          null,

        problem_number:
          source.metadata?.problem_number ??
          null,

        points:
          source.metadata?.points ??
          9,

        generated:
          true,

        based_on:
          source.metadata?.id ??
          null,

        tags: [
          'generated',
          'circle',
          'isosceles_triangle',
          'parallel_lines',
          'congruence',
          'proof'
        ]
      },


      problem: {

        section:
          '生成問題',

        subproblems: [

          {
            id: 'P1',
            number: '(1)',
            type: 'proof',
            points: 6
          },

          {
            id: 'P2',
            number: '(2)',
            type: 'angle',
            points: 3
          }

        ]
      },


      geometry,


      given_conditions:
        this.generateGivenConditions(
          parameters
        ),


      derived_facts:
        [],


      proof,


      follow_up:
        followUp,


      generation: {

        template_id:
          this.id,

        source_template:
          context.generation
            ?.template_id ?? null,

        parameters

      }

    };
  },


  /* -----------------------------------------
   * 円の半径
   * --------------------------------------- */

  generateRadius(source) {

    /*
     * 今は正規化モデルを基本にする。
     *
     * geometry_solver側では
     * 1を基準としてもよい。
     */

    const radius =
      source.geometry
        ?.coordinate_system
        ?.radius;

    if (
      Number.isFinite(
        Number(radius)
      )
    ) {
      return Number(radius);
    }

    return 1;
  },


  /* -----------------------------------------
   * 弧の比
   * --------------------------------------- */

  generateArcRatio(source) {

    const sourceRatio =
      source.follow_up
        ?.problems
        ?.find(
          problem =>
            problem.id === 'P2'
        )
        ?.given
        ?.find(
          condition =>
            condition.type ===
            'arc_ratio'
        )
        ?.value;

    /*
     * 元問題の比をそのまま使える場合。
     */
    if (
      Array.isArray(sourceRatio) &&
      sourceRatio.length === 2
    ) {

      const a =
        Number(sourceRatio[0]);

      const b =
        Number(sourceRatio[1]);

      if (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        a > 0 &&
        b > 0
      ) {
        return [
          a,
          b
        ];
      }
    }


    /*
     * 2014型として自然な比。
     */
    return [
      3,
      1
    ];
  },


  /* -----------------------------------------
   * 仮定
   * --------------------------------------- */

  generateGivenConditions(
    parameters
  ) {

    return [

      {
        id: 'C01',

        type: 'concyclic',

        objects: [
          'A',
          'B',
          'C',
          'D'
        ],

        display_text:
          'A，B，C，Dは円Oの円周上'
      },


      {
        id: 'C02',

        type: 'equal_length',

        objects: [
          'AC',
          'AD'
        ],

        display_text:
          'AC＝AD'
      },


      {
        id: 'C03',

        type: 'parallel',

        objects: [
          'BD',
          'CE'
        ],

        display_text:
          'CE∥BD'
      },


      {
        id: 'C04',

        type: 'intersection',

        objects: [
          'BD',
          'AC'
        ],

        result:
          'F'
      },


      {
        id: 'C05',

        type: 'intersection',

        objects: [
          'BD',
          'AE'
        ],

        result:
          'G'
      }

    ];
  },


  /* -----------------------------------------
   * 証明生成
   * --------------------------------------- */

  generateProof(
    parameters
  ) {

    return {

      problem_id:
        'P1',

      target: {

        type:
          'congruence',

        objects: [
          'T2',
          'T3'
        ],

        statement:
          '△ABC≡△AGD'
      },


      target_decomposition: {

        required_conditions: [

          {
            type:
              'equal_length',

            statement:
              'AC＝AD'
          },

          {
            type:
              'equal_angle',

            statement:
              '∠ACB＝∠ADG'
          },

          {
            type:
              'equal_angle',

            statement:
              '∠BAC＝∠GAD'
          }

        ],

        criterion:
          'ASA',

        japanese_criterion:
          '1組の辺とその両端の角がそれぞれ等しい'

      },


      selected_solution: {

        strategy:
          'forward_with_angle_chain',

        steps: [

          {
            id: 'S01',
            order: 1,

            statement:
              'AC＝AD',

            reason:
              '仮定',

            input: [
              'C02'
            ]
          },


          {
            id: 'S02',
            order: 2,

            statement:
              '∠ACB＝∠ADG',

            reason:
              '弧ABに対する円周角は等しい',

            input: [
              'C01'
            ]
          },


          {
            id: 'S03',
            order: 3,

            statement:
              '∠BAC＝∠BDC',

            reason:
              '弧BCに対する円周角は等しい',

            input: [
              'C01'
            ]
          },


          {
            id: 'S04',
            order: 4,

            statement:
              '∠BDC＝∠DCE',

            reason:
              'BD∥CEより錯角は等しい',

            input: [
              'C03'
            ]
          },


          {
            id: 'S05',
            order: 5,

            statement:
              '∠DCE＝∠GAD',

            reason:
              '弧DEに対する円周角は等しい',

            input: [
              'C01'
            ]
          },


          {
            id: 'S06',
            order: 6,

            statement:
              '∠BAC＝∠GAD',

            reason:
              'S03，S04，S05より',

            input: [
              'S03',
              'S04',
              'S05'
            ]
          },


          {
            id: 'S07',
            order: 7,

            statement:
              '△ABC≡△AGD',

            reason:
              '1組の辺とその両端の角がそれぞれ等しい',

            input: [
              'S01',
              'S02',
              'S06'
            ]
          }

        ]

      }

    };
  },


  /* -----------------------------------------
   * (2)
   * --------------------------------------- */

  generateFollowUp(
    parameters
  ) {

    const [
      a,
      b
    ] =
      parameters.arcRatio;


    /*
     * 2014型では
     *
     * 弧AB : 弧BC = 3 : 1
     *
     * のような整数比を利用する。
     */

    const ratioSum =
      a + b;


    /*
     * ∠AFB は、
     * 生成時には単純なランダム値ではなく、
     * 幾何条件を満たす値を選ぶ。
     *
     * 現段階では2014型の
     * 100°を基準とする。
     */

    const angleAFB =
      100;


    return {

      exists:
        true,

      problems: [

        {

          id:
            'P2',

          number:
            '(2)',

          type:
            'angle',

          given: [

            {
              id:
                'C06',

              type:
                'arc_ratio',

              objects: [
                'arc_AB',
                'arc_BC'
              ],

              value: [
                a,
                b
              ],

              display_text:
                `弧AB：弧BC＝${a}：${b}`
            },


            {
              id:
                'C07',

              type:
                'angle',

              object:
                '∠AFB',

              value:
                angleAFB,

              unit:
                'degree'
            }

          ],


          target: {

            type:
              'angle',

            object:
              '∠CAE',

            unit:
              'degree',

            /*
             * 実際の値は geometry_solver
             * から検証する。
             */
            answer:
              null
          },


          uses_proof_result:
            false,

          generated:
            true

        }

      ]

    };
  }

};


/* =========================================================
 * Generator
 * ======================================================= */

export class ProblemGenerator {

  constructor(options = {}) {

    this.registry =
      options.registry ??
      ProblemGenerator
        .createDefaultRegistry();

    this.lastResult =
      null;
  }


  /**
   * デフォルトRegistry
   */
  static createDefaultRegistry() {

    const registry =
      new TemplateRegistry();

    registry.register(
      SHIZUOKA_2014_TEMPLATE
    );

    return registry;
  }


  /**
   * JSONから類題を生成
   */
  generate(source) {

    if (!source) {
      throw new Error(
        '生成元の問題JSONがありません。'
      );
    }


    const context =
      new GenerationContext(
        source
      );


    const template =
      this.registry.find(
        context
      );


    if (!template) {

      throw new Error(
        '対応する生成テンプレートが見つかりません。'
        + '\n'
        + `template_id: ${
            context.generation
              ?.template_id ??
            '(none)'
          }`
      );
    }


    const result =
      template.generate(
        context
      );


    if (!result) {
      throw new Error(
        `Template "${template.id}" `
        + 'から問題を生成できませんでした。'
      );
    }


    /*
     * 生成結果を保持
     */
    this.lastResult =
      result;


    return result;
  }


  /**
   * templateを追加登録する。
   *
   * 2015年型などを追加するときに使用。
   */
  registerTemplate(template) {

    this.registry.register(
      template
    );
  }


  /**
   * 最後に生成した問題
   */
  getLastResult() {

    return this.lastResult;
  }
}


/* =========================================================
 * 補助関数
 * ======================================================= */

/**
 * JSONから直接生成する便利関数
 */
export function generateProblem(
  source
) {

  const generator =
    new ProblemGenerator();

  return generator.generate(
    source
  );
}


/**
 * template_idを取得
 */
export function getTemplateId(
  source
) {

  return source
    ?.generation
    ?.template_id ??
    null;
}


/**
 * 対応テンプレートがあるか
 */
export function canGenerate(
  source
) {

  if (!source) {
    return false;
  }

  const context =
    new GenerationContext(
      source
    );

  const generator =
    new ProblemGenerator();

  return Boolean(
    generator.registry.find(
      context
    )
  );
}
