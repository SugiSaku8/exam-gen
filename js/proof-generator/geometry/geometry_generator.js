/**
 * 入試対策証明ジェネレーター
 *
 * Geometry Generator
 *
 * パラメータから数学的に成立する図形を構築する。
 *
 * ML / LLM は使用しない。
 */

const EPSILON = 1e-10;


/* =========================================================
 * Main
 * ======================================================= */

/**
 * 問題テンプレートと生成パラメータから
 * geometry JSONを生成する。
 */
export function generateGeometry(
    template,
    parameters
) {
    if (!template) {
        throw new Error(
            'geometry生成にテンプレートが必要です。'
        );
    }

    if (!parameters) {
        throw new Error(
            'geometry生成にパラメータが必要です。'
        );
    }

    const model =
        template.construction?.model;

    switch (model) {

        case 'symmetric_circle_parallel':

            return generateSymmetricCircleParallel(
                template,
                parameters
            );

        default:

            throw new Error(
                `未対応のgeometry construction modelです: ${model}`
            );
    }
}


/* =========================================================
 * CIRCLE_ISOSCELES_PARALLEL_ASA_001
 * ======================================================= */

function generateSymmetricCircleParallel(
    template,
    parameters
) {
    const radius =
        parameters.radius ?? 1;

    const angles =
        parameters.angles;

    if (!angles) {
        throw new Error(
            'parameters.angles がありません。'
        );
    }


    const {
        A,
        B,
        C,
        D,
        E
    } = angles;


    /*
     * -----------------------------------------------------
     * 円周上の点
     * -----------------------------------------------------
     */

    const pointCoordinates = {

        O: {
            x: 0,
            y: 0,

            exact: ['0', '0'],

            role: 'circle_center'
        },

        A: createCirclePoint(
            A,
            radius
        ),

        B: createCirclePoint(
            B,
            radius
        ),

        C: createCirclePoint(
            C,
            radius
        ),

        D: createCirclePoint(
            D,
            radius
        ),

        E: createCirclePoint(
            E,
            radius
        )
    };


    /*
     * -----------------------------------------------------
     * 交点
     *
     * F = AC ∩ BD
     * G = AE ∩ BD
     * -----------------------------------------------------
     */

    const F =
        lineIntersection(
            pointCoordinates.A,
            pointCoordinates.C,
            pointCoordinates.B,
            pointCoordinates.D
        );

    const G =
        lineIntersection(
            pointCoordinates.A,
            pointCoordinates.E,
            pointCoordinates.B,
            pointCoordinates.D
        );


    if (!F) {
        throw new Error(
            'F = AC∩BD を構成できませんでした。'
        );
    }

    if (!G) {
        throw new Error(
            'G = AE∩BD を構成できませんでした。'
        );
    }


    pointCoordinates.F = {

        x: F.x,
        y: F.y,

        exact: [
            formatNumber(F.x),
            formatNumber(F.y)
        ],

        role: 'intersection',

        definition: 'AC∩BD'
    };


    pointCoordinates.G = {

        x: G.x,
        y: G.y,

        exact: [
            formatNumber(G.x),
            formatNumber(G.y)
        ],

        role: 'intersection',

        definition: 'AE∩BD'
    };


    /*
     * -----------------------------------------------------
     * objects.points
     * -----------------------------------------------------
     */

    const points = [

        createPointObject(
            'A',
            'circle_point'
        ),

        createPointObject(
            'B',
            'circle_point'
        ),

        createPointObject(
            'C',
            'circle_point'
        ),

        createPointObject(
            'D',
            'circle_point'
        ),

        createPointObject(
            'E',
            'circle_point'
        ),

        createPointObject(
            'F',
            'intersection',
            'AC∩BD'
        ),

        createPointObject(
            'G',
            'intersection',
            'AE∩BD'
        ),

        createPointObject(
            'O',
            'circle_center'
        )
    ];


    /*
     * -----------------------------------------------------
     * segments
     * -----------------------------------------------------
     */

    const segments = [

        createSegment('AB', 'A', 'B'),

        createSegment('AC', 'A', 'C'),

        createSegment('AD', 'A', 'D'),

        createSegment('AE', 'A', 'E'),

        createSegment('BC', 'B', 'C'),

        createSegment('BD', 'B', 'D'),

        createSegment('CD', 'C', 'D'),

        createSegment('CE', 'C', 'E')
    ];


    /*
     * -----------------------------------------------------
     * lines
     * -----------------------------------------------------
     */

    const lines = [

        {
            id: 'l_BD',

            through: [
                'B',
                'D'
            ]
        },

        {
            id: 'l_CE',

            through: [
                'C',
                'E'
            ]
        },

        {
            id: 'l_AE',

            through: [
                'A',
                'E'
            ]
        }
    ];


    /*
     * -----------------------------------------------------
     * circles
     * -----------------------------------------------------
     */

    const circles = [

        {
            id: 'O1',

            center: 'O',

            radius,

            through_points: [
                'A',
                'B',
                'C',
                'D',
                'E'
            ]
        }
    ];


    /*
     * -----------------------------------------------------
     * triangles
     * -----------------------------------------------------
     */

    const triangles = [

        {
            id: 'T1',

            vertices: [
                'A',
                'C',
                'D'
            ],

            properties: [
                'isosceles',
                'AC=AD'
            ]
        },

        {
            id: 'T2',

            vertices: [
                'A',
                'B',
                'C'
            ]
        },

        {
            id: 'T3',

            vertices: [
                'A',
                'G',
                'D'
            ]
        }
    ];


    /*
     * -----------------------------------------------------
     * incidence
     * -----------------------------------------------------
     */

    const incidence = [

        {
            point: 'F',
            object: 'AC'
        },

        {
            point: 'F',
            object: 'BD'
        },

        {
            point: 'G',
            object: 'AE'
        },

        {
            point: 'G',
            object: 'BD'
        },

        {
            point: 'A',
            object: 'O1'
        },

        {
            point: 'B',
            object: 'O1'
        },

        {
            point: 'C',
            object: 'O1'
        },

        {
            point: 'D',
            object: 'O1'
        },

        {
            point: 'E',
            object: 'O1'
        }
    ];


    /*
     * -----------------------------------------------------
     * intersections
     * -----------------------------------------------------
     */

    const intersections = [

        {
            id: 'F',
            lines: [
                'AC',
                'BD'
            ]
        },

        {
            id: 'G',
            lines: [
                'AE',
                'BD'
            ]
        }
    ];


    /*
     * -----------------------------------------------------
     * relationships
     * -----------------------------------------------------
     */

    const relationships = [

        {
            type: 'concyclic',

            points: [
                'A',
                'B',
                'C',
                'D',
                'E'
            ],

            circle: 'O1'
        },

        {
            type: 'equal_length',

            left: 'AC',

            right: 'AD'
        },

        {
            type: 'parallel',

            left: 'BD',

            right: 'CE'
        }
    ];


    /*
     * -----------------------------------------------------
     * constraints
     * -----------------------------------------------------
     */

    const constraints = [

        {
            type: 'point_on_circle',

            point: 'A',

            circle: 'O1'
        },

        {
            type: 'point_on_circle',

            point: 'B',

            circle: 'O1'
        },

        {
            type: 'point_on_circle',

            point: 'C',

            circle: 'O1'
        },

        {
            type: 'point_on_circle',

            point: 'D',

            circle: 'O1'
        },

        {
            type: 'point_on_circle',

            point: 'E',

            circle: 'O1'
        },

        {
            type: 'equal_length',

            left: 'AC',

            right: 'AD'
        },

        {
            type: 'parallel',

            left: 'BD',

            right: 'CE'
        }
    ];


    /*
     * -----------------------------------------------------
     * coordinates
     * -----------------------------------------------------
     */

    const coordinates = {

        system: {

            type: 'exact_euclidean_model',

            primary_model: 'unit_circle',

            radius,

            origin: 'O=(0,0)',

            axis: 'x right, y up'
        },

        points: pointCoordinates
    };


    /*
     * -----------------------------------------------------
     * 最終geometry
     * -----------------------------------------------------
     */

    return {

        coordinate_system: {

            type: 'exact_euclidean_model',

            primary_model: 'unit_circle',

            radius,

            origin: 'O=(0,0)',

            axis: 'x right, y up',

            basis:
                'generated from CIRCLE_ISOSCELES_PARALLEL_ASA_001',

            important_note:
                'AC=ADを対称配置により構成し、' +
                'CE∥BDを平行弦の構成により保証する。'
        },

        coordinates,

        objects: {

            points,

            segments,

            lines,

            circles,

            triangles
        },

        incidence,

        intersections,

        relationships,

        constraints,

        generation: {

            template:
                template.id,

            parameters
        }
    };
}


/* =========================================================
 * Circle point
 * ======================================================= */

function createCirclePoint(
    angle,
    radius = 1
) {
    const radians =
        angle *
        Math.PI /
        180;


    const x =
        radius *
        Math.cos(radians);

    const y =
        radius *
        Math.sin(radians);


    return {

        x,
        y,

        exact:
            createExactCoordinate(
                angle
            ),

        role: 'circle_point',

        angle
    };
}


/* =========================================================
 * Exact coordinate expression
 * ======================================================= */

/**
 * 円周上の座標を、
 *
 * -cos(6°)
 * -sin(38°)
 * cos(38°)
 *
 * のような現在のJSON形式に変換する。
 *
 * 90° / 180°などは
 * 0, 1, -1
 * に簡約する。
 */

function createExactCoordinate(
    angle
) {
    const normalized =
        normalizeAngle(angle);


    const quadrant =
        getQuadrant(normalized);


    const reference =
        getReferenceAngle(normalized);


    let x;
    let y;


    /*
     * x = cos(theta)
     */

    switch (quadrant) {

        case 0:
            x =
                exactCos(
                    reference
                );

            y =
                exactSin(
                    reference
                );

            break;


        case 1:
            x =
                exactCos(
                    180 - normalized
                );

            y =
                exactSin(
                    180 - normalized
                );

            break;


        case 2:
            x =
                `-${exactCos(
                    normalized - 180
                )}`;

            y =
                `-${exactSin(
                    normalized - 180
                )}`;

            break;


        case 3:
            x =
                exactCos(
                    360 - normalized
                );

            y =
                `-${exactSin(
                    360 - normalized
                )}`;

            break;


        default:
            throw new Error(
                '未知の象限です。'
            );
    }


    return [
        simplifyExact(x),
        simplifyExact(y)
    ];
}


/* =========================================================
 * Exact trig
 * ======================================================= */

function exactCos(
    angle
) {
    const a =
        normalizeAngle(angle);

    if (approximately(a, 0)) {
        return '1';
    }

    if (approximately(a, 90)) {
        return '0';
    }

    if (approximately(a, 180)) {
        return '-1';
    }

    if (approximately(a, 270)) {
        return '0';
    }

    return `cos(${formatAngle(a)}°)`;
}


function exactSin(
    angle
) {
    const a =
        normalizeAngle(angle);

    if (approximately(a, 0)) {
        return '0';
    }

    if (approximately(a, 90)) {
        return '1';
    }

    if (approximately(a, 180)) {
        return '0';
    }

    if (approximately(a, 270)) {
        return '-1';
    }

    return `sin(${formatAngle(a)}°)`;
}


/* =========================================================
 * Angle utilities
 * ======================================================= */

function getQuadrant(
    angle
) {
    const a =
        normalizeAngle(angle);

    if (a >= 0 && a < 90) {
        return 0;
    }

    if (a >= 90 && a < 180) {
        return 1;
    }

    if (a >= 180 && a < 270) {
        return 2;
    }

    return 3;
}


function getReferenceAngle(
    angle
) {
    const a =
        normalizeAngle(angle);

    if (a <= 90) {
        return a;
    }

    if (a <= 180) {
        return 180 - a;
    }

    if (a <= 270) {
        return a - 180;
    }

    return 360 - a;
}


function normalizeAngle(
    angle
) {
    let result =
        angle % 360;

    if (result < 0) {
        result += 360;
    }

    return result;
}


function formatAngle(
    angle
) {
    if (Number.isInteger(angle)) {
        return String(angle);
    }

    return String(
        Number(
            angle.toFixed(10)
        )
    );
}


/* =========================================================
 * Geometry objects
 * ======================================================= */

function createPointObject(
    id,
    role,
    definition = null
) {
    const result = {

        id,

        role,

        coordinate_ref:
            `geometry.coordinates.points.${id}`
    };


    if (definition) {
        result.definition =
            definition;
    }


    return result;
}


function createSegment(
    id,
    from,
    to
) {
    return {

        id,

        from,

        to
    };
}


/* =========================================================
 * Line intersection
 * ======================================================= */

/**
 * 直線ABとCDの交点。
 *
 * 線分ではなく「無限直線」の交点を求める。
 */

function lineIntersection(
    A,
    B,
    C,
    D
) {
    const denominator =
        (
            B.x - A.x
        ) *
        (
            D.y - C.y
        ) -
        (
            B.y - A.y
        ) *
        (
            D.x - C.x
        );


    if (
        Math.abs(denominator) <
        EPSILON
    ) {
        return null;
    }


    const t =
        (
            (
                C.x - A.x
            ) *
            (
                D.y - C.y
            ) -
            (
                C.y - A.y
            ) *
            (
                D.x - C.x
            )
        ) /
        denominator;


    return {

        x:
            A.x +
            t *
            (
                B.x - A.x
            ),

        y:
            A.y +
            t *
            (
                B.y - A.y
            )
    };
}


/* =========================================================
 * Number formatting
 * ======================================================= */

function formatNumber(
    value
) {
    if (
        Math.abs(value) <
        EPSILON
    ) {
        return '0';
    }

    return String(
        Number(
            value.toFixed(10)
        )
    );
}


function simplifyExact(
    expression
) {
    if (expression === '--1') {
        return '1';
    }

    if (expression === '--0') {
        return '0';
    }

    return expression;
}


function approximately(
    a,
    b
) {
    return (
        Math.abs(a - b) <
        EPSILON
    );
}
