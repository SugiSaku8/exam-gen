/**
 * 入試対策証明ジェネレーター
 *
 * 問題生成用パラメータ生成器
 *
 * ML・LLMは使用しない。
 *
 * 「ランダムに点を置く」のではなく、
 * 数学的に成立するパラメータだけを生成する。
 */


/* =========================================================
 * Seeded Random
 * ======================================================= */

export class SeededRandom {

    constructor(seed = Date.now()) {

        this.seed =
            normalizeSeed(seed);
    }


    next() {

        /*
         * xorshift32
         *
         * 軽量で再現可能な疑似乱数。
         */

        let x = this.seed;

        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;

        this.seed = x >>> 0;

        return this.seed / 0x100000000;
    }


    integer(min, max) {

        if (max < min) {
            throw new Error(
                '乱数範囲が不正です。'
            );
        }

        return Math.floor(
            this.next() *
            (max - min + 1)
        ) + min;
    }


    choice(values) {

        if (!Array.isArray(values) || values.length === 0) {
            throw new Error(
                'choice() に空の配列が渡されました。'
            );
        }

        return values[
            this.integer(0, values.length - 1)
        ];
    }


    boolean() {

        return this.next() < 0.5;
    }
}


/* =========================================================
 * Seed normalization
 * ======================================================= */

function normalizeSeed(seed) {

    if (typeof seed === 'number') {

        return (
            Math.abs(
                Math.floor(seed)
            ) >>> 0
        ) || 1;
    }

    if (typeof seed === 'string') {

        let hash = 2166136261;

        for (let i = 0; i < seed.length; i++) {

            hash ^= seed.charCodeAt(i);

            hash =
                Math.imul(
                    hash,
                    16777619
                );
        }

        return (
            hash >>> 0
        ) || 1;
    }

    return 1;
}


/* =========================================================
 * メイン
 * ======================================================= */

export function generateParameters(
    template,
    options = {}
) {

    if (!template) {
        throw new Error(
            'パラメータ生成にテンプレートが必要です。'
        );
    }

    const model =
        template.parameter_model;

    if (!model) {
        throw new Error(
            `テンプレート "${template.id}" に ` +
            'parameter_model がありません。'
        );
    }


    const seed =
        options.seed ??
        Date.now();

    const random =
        new SeededRandom(seed);


    switch (model.type) {

        case 'symmetric_circle_001':

            return generateSymmetricCircle001(
                model,
                random,
                seed,
                options
            );

        default:

            throw new Error(
                `未対応のparameter_modelです: ${model.type}`
            );
    }
}


/* =========================================================
 * CIRCLE_ISOSCELES_PARALLEL_ASA_001
 * ======================================================= */

function generateSymmetricCircle001(
    model,
    random,
    seed,
    options
) {

    const maxAttempts =
        options.maxAttempts ?? 100;


    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        /*
         * Aは90°に固定。
         *
         * 2014年型では
         *
         * A = 90°
         * B = 180° + b
         * C = 180° + c
         * D = 360° - c
         *
         * と置く。
         */

        const A =
            model.A_angle.value;


        /*
         * 弧AB:弧BCの比。
         *
         * 2:1
         * 3:1
         * 4:1
         *
         * から選択。
         */

        const arcRatio =
            options.arcRatio ??
            random.choice(
                model.arc_ratio.values
            );


        /*
         * B = 180 + b
         */

        const b =
            options.B_offset ??
            randomEven(
                random,
                model.B_offset.min,
                model.B_offset.max
            );


        const B =
            normalizeAngle(
                180 + b
            );


        /*
         * 弧AB
         */

        const arcAB =
            positiveArc(
                A,
                B
            );


        /*
         * arcAB : arcBC = arcRatio : 1
         *
         * よって
         *
         * arcBC = arcAB / arcRatio
         *
         * C = B + arcBC
         */

        const arcBC =
            arcAB / arcRatio;


        /*
         * 入試問題として扱いやすくするため、
         * 弧BCは整数になるものだけ採用。
         */

        if (!isInteger(arcBC)) {
            continue;
        }


        const c =
            b + arcBC;


        const C =
            normalizeAngle(
                180 + c
            );


        /*
         * DはOAに関してCと対称。
         *
         * したがって
         *
         * AC = AD
         *
         * が自動的に成立する。
         */

        const D =
            normalizeAngle(
                2 * A - C
            );


        /*
         * BDに平行なCを通る弦の
         * もう一つの端点E。
         *
         * 円上の弦の方向は、
         * 両端点の偏角の平均で決まる。
         *
         * そのため
         *
         * E = B + D - C
         *
         * とすれば
         *
         * CE ∥ BD
         *
         * となる。
         */

        const E =
            normalizeAngle(
                B + D - C
            );


        /*
         * 円周上の順序を確認。
         *
         * A < B < C < E < D
         */

        if (
            !(A < B &&
              B < C &&
              C < E &&
              E < D)
        ) {
            continue;
        }


        /*
         * 弧の大きさを計算。
         */

        const arcCD =
            positiveArc(
                C,
                D
            );

        const arcCE =
            positiveArc(
                C,
                E
            );


        /*
         * 基本的な図形条件。
         */

        const constraints =
            model.constraints;


        if (
            arcBC <
            constraints.minimum_arc_BC
        ) {
            continue;
        }


        if (
            arcCD <
            constraints.minimum_arc_CD
        ) {
            continue;
        }


        if (
            arcCE <
            constraints.minimum_arc_CE
        ) {
            continue;
        }


        /*
         * F = AC ∩ BD
         *
         * 弦の交点の角。
         *
         * ∠AFB
         * = 1/2(弧AB + 弧CD)
         */

        const angleAFB =
            (
                arcAB +
                arcCD
            ) / 2;


        /*
         * ∠CAE
         * = 1/2 弧CE
         */

        const angleCAE =
            arcCE / 2;


        /*
         * 入試問題として扱いやすい角度か確認。
         */

        if (
            angleAFB <
                constraints.angle_AFB.min ||
            angleAFB >
                constraints.angle_AFB.max
        ) {
            continue;
        }


        if (
            angleCAE <
                constraints.angle_CAE.min ||
            angleCAE >
                constraints.angle_CAE.max
        ) {
            continue;
        }


        /*
         * 角度を整数に限定。
         */

        if (
            !isInteger(angleAFB) ||
            !isInteger(angleCAE)
        ) {
            continue;
        }


        /*
         * ここまで来たら採用。
         */

        return {

            seed,

            attempt,

            model:
                'symmetric_circle_001',

            radius:
                model.radius.value,

            angles: {

                A,
                B,
                C,
                D,
                E
            },

            arcs: {

                AB: arcAB,

                BC: arcBC,

                CD: arcCD,

                CE: arcCE
            },

            arcRatio: {

                AB: arcRatio,

                BC: 1
            },

            derivedAngles: {

                AFB: angleAFB,

                CAE: angleCAE
            },

            symmetry: {

                axis: 'OA',

                source: 'C',

                result: 'D',

                property: 'AC=AD'
            },

            parallel: {

                first: 'BD',

                second: 'CE',

                property: 'BD∥CE'
            }
        };
    }


    throw new Error(
        `有効なパラメータを生成できませんでした。` +
        `試行回数: ${maxAttempts}`
    );
}


/* =========================================================
 * Utilities
 * ======================================================= */

function randomEven(
    random,
    min,
    max
) {

    const first =
        min % 2 === 0
            ? min
            : min + 1;

    const last =
        max % 2 === 0
            ? max
            : max - 1;

    if (first > last) {
        throw new Error(
            '偶数パラメータの範囲が不正です。'
        );
    }

    const count =
        ((last - first) / 2) + 1;

    return (
        first +
        2 * random.integer(0, count - 1)
    );
}


function normalizeAngle(angle) {

    let result =
        angle % 360;

    if (result < 0) {
        result += 360;
    }

    return result;
}


/**
 * counter-clockwise方向の正の弧
 */
function positiveArc(
    from,
    to
) {

    return normalizeAngle(
        to - from
    );
}


function isInteger(value) {

    return (
        Math.abs(
            value -
            Math.round(value)
        ) < 1e-9
    );
}
