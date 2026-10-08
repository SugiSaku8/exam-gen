/**
 * 入試対策証明ジェネレーター
 *
 * 問題生成テンプレート管理
 *
 * 年度ではなく「問題構造」を管理する。
 *
 * 例:
 * CIRCLE_ISOSCELES_PARALLEL_ASA_001
 *
 * ・円
 * ・二等辺三角形
 * ・平行線
 * ・円周角
 * ・角の連鎖
 * ・ASAによる合同
 *
 * という構造を1つのテンプレートとして扱う。
 */

const templates = new Map();


/* =========================================================
 * 共通テンプレート定義
 * ======================================================= */

const CIRCLE_ISOSCELES_PARALLEL_ASA_001 = {
    id: 'CIRCLE_ISOSCELES_PARALLEL_ASA_001',

    version: '1.0.0',

    family: 'circle_geometry',

    name: '円・二等辺三角形・平行線・ASA合同',

    description:
        '円周上の二等辺三角形と平行線を利用し、' +
        '円周角・平行線の錯角から2つの三角形の合同を証明する問題。',

    /* ---------------------------------------------
     * Geometry
     * ------------------------------------------- */

    geometry: {

        coordinate_system: {
            type: 'exact_euclidean_model',

            primary_model: 'unit_circle',

            radius: 1,

            orientation: 'counterclockwise',

            construction_model:
                'Aを円周上に置き、AC=ADとなるようDを構成する。' +
                'BDに平行な直線をCから引き、円との交点をEとする。'
        },

        objects: {

            points: [
                'A',
                'B',
                'C',
                'D',
                'E',
                'F',
                'G',
                'O'
            ],

            segments: [
                ['A', 'B'],
                ['A', 'C'],
                ['A', 'D'],
                ['A', 'E'],
                ['B', 'C'],
                ['B', 'D'],
                ['C', 'D'],
                ['C', 'E']
            ],

            lines: [
                ['B', 'D'],
                ['C', 'E'],
                ['A', 'E']
            ],

            circles: [
                {
                    id: 'O1',
                    center: 'O',
                    through: [
                        'A',
                        'B',
                        'C',
                        'D',
                        'E'
                    ]
                }
            ],

            triangles: [
                {
                    id: 'ABC',
                    vertices: ['A', 'B', 'C']
                },
                {
                    id: 'AGD',
                    vertices: ['A', 'G', 'D']
                },
                {
                    id: 'ACD',
                    vertices: ['A', 'C', 'D']
                }
            ]
        }
    },


    /* ---------------------------------------------
     * Construction
     * ------------------------------------------- */

    construction: {

        model: 'symmetric_circle_parallel',

        steps: [

            {
                type: 'create_circle',
                id: 'O1'
            },

            {
                type: 'place_point',
                id: 'A',
                on: 'O1'
            },

            {
                type: 'place_point',
                id: 'C',
                on: 'O1'
            },

            {
                type: 'symmetric_point',
                id: 'D',

                source: 'C',

                axis: 'OA',

                property: 'AC=AD'
            },

            {
                type: 'place_point',
                id: 'B',
                on: 'O1'
            },

            {
                type: 'parallel_chord',

                through: 'C',

                parallel_to: ['B', 'D'],

                result: 'E'
            },

            {
                type: 'intersection',

                lines: [
                    ['A', 'C'],
                    ['B', 'D']
                ],

                result: 'F'
            },

            {
                type: 'intersection',

                lines: [
                    ['A', 'E'],
                    ['B', 'D']
                ],

                result: 'G'
            }
        ]
    },


    /* ---------------------------------------------
     * Parameters
     * ------------------------------------------- */

    parameter_model: {

        type: 'symmetric_circle_001',

        radius: {
            type: 'fixed',
            value: 1
        },

        A_angle: {
            type: 'fixed',
            value: 90
        },

        arc_ratio: {
            type: 'choice',

            values: [
                2,
                3,
                4
            ]
        },

        B_offset: {

            type: 'integer',

            min: 2,
            max: 30,

            step: 2
        },

        constraints: {

            minimum_arc_BC: 20,

            minimum_arc_CD: 60,

            minimum_arc_CE: 30,

            angle_AFB: {
                min: 80,
                max: 120
            },

            angle_CAE: {
                min: 15,
                max: 60
            }
        }
    },


    /* ---------------------------------------------
     * Proof
     * ------------------------------------------- */

    proof: {

        type: 'triangle_congruence',

        target: {

            type: 'congruence',

            triangles: [
                'ABC',
                'AGD'
            ],

            criterion: 'ASA'
        },

        required_facts: [

            {
                type: 'equal_length',

                left: 'AC',
                right: 'AD'
            },

            {
                type: 'equal_angle',

                left: 'ACB',
                right: 'ADG'
            },

            {
                type: 'equal_angle',

                left: 'BAC',
                right: 'GAD'
            }
        ]
    },


    /* ---------------------------------------------
     * Output
     * ------------------------------------------- */

    output: {

        include_follow_up: true,

        include_angle_problem: true,

        difficulty: 'standard',

        points: 9
    }
};


/* =========================================================
 * 登録
 * ======================================================= */

export function registerTemplate(template) {

    if (!template || typeof template !== 'object') {
        throw new TypeError(
            'テンプレートはオブジェクトである必要があります。'
        );
    }

    if (!template.id) {
        throw new Error(
            'テンプレートIDが指定されていません。'
        );
    }

    if (templates.has(template.id)) {
        throw new Error(
            `テンプレート "${template.id}" は既に登録されています。`
        );
    }

    templates.set(template.id, template);

    return template;
}


/* =========================================================
 * 取得
 * ======================================================= */

export function getTemplate(id) {

    const template = templates.get(id);

    if (!template) {
        throw new Error(
            `問題生成テンプレートが見つかりません: ${id}`
        );
    }

    return template;
}


/* =========================================================
 * 存在確認
 * ======================================================= */

export function hasTemplate(id) {
    return templates.has(id);
}


/* =========================================================
 * 一覧
 * ======================================================= */

export function listTemplates() {

    return Array.from(
        templates.values()
    ).map(template => ({
        id: template.id,
        version: template.version,
        family: template.family,
        name: template.name,
        description: template.description
    }));
}


/* =========================================================
 * 初期テンプレート登録
 * ======================================================= */

registerTemplate(
    CIRCLE_ISOSCELES_PARALLEL_ASA_001
);
