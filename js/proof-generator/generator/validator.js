/**
 * 入試対策証明ジェネレーター
 *
 * Validator
 *
 * 生成された問題が数学的・構造的に正しいかを検証する。
 *
 * ML / LLM は使用しない。
 */

const EPSILON = 1e-7;


/* =========================================================
 * Main
 * ======================================================= */

/**
 * 問題全体を検証する。
 */
export function validateGeneratedProblem(
    template,
    parameters,
    geometry,
    proofResult = null
) {
    const checks = [];

    /*
     * 1. geometry
     */
    checks.push(
        validateGeometry(
            geometry
        )
    );


    /*
     * 2. template structure
     */
    checks.push(
        validateTemplateStructure(
            template,
            geometry
        )
    );


    /*
     * 3. mathematical constraints
     */
    checks.push(
        validateMathematicalConstraints(
            geometry
        )
    );


    /*
     * 4. intersections
     */
    checks.push(
        validateIntersections(
            geometry
        )
    );


    /*
     * 5. proof
     */
    if (proofResult) {

        checks.push(
            validateProof(
                template,
                proofResult
            )
        );
    }


    /*
     * 6. generated parameters
     */
    checks.push(
        validateParameters(
            template,
            parameters
        )
    );


    const allChecks =
        flattenChecks(
            checks
        );


    const errors =
        allChecks.filter(
            check =>
                check.level === 'error'
        );


    const warnings =
        allChecks.filter(
            check =>
                check.level === 'warning'
        );


    return {

        valid:
            errors.length === 0,

        errors,

        warnings,

        checks:
            allChecks,

        score:
            calculateValidationScore(
                allChecks
            )
    };
}


/* =========================================================
 * Geometry
 * ======================================================= */

export function validateGeometry(
    geometry
) {
    const checks = [];


    if (!geometry) {

        return {

            category:
                'geometry',

            level:
                'error',

            code:
                'GEOMETRY_MISSING',

            message:
                'geometryが存在しません。'
        };
    }


    /*
     * coordinates
     */
    const points =
        geometry.coordinates?.points;


    if (!points) {

        checks.push({

            category:
                'geometry',

            level:
                'error',

            code:
                'COORDINATES_MISSING',

            message:
                'geometry.coordinates.points が存在しません。'
        });

        return checks;
    }


    /*
     * 全点の座標を検査
     */
    for (
        const [
            id,
            point
        ]
        of Object.entries(points)
    ) {

        if (
            !Number.isFinite(point.x) ||
            !Number.isFinite(point.y)
        ) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'INVALID_POINT',

                message:
                    `点${id}の座標が不正です。`
            });

            continue;
        }


        checks.push({

            category:
                'geometry',

            level:
                'ok',

            code:
                'POINT_VALID',

            message:
                `点${id}の座標は正常です。`
        });
    }


    /*
     * 点の重複
     */
    const pointIds =
        Object.keys(points);


    for (
        let i = 0;
        i < pointIds.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < pointIds.length;
            j++
        ) {

            const a =
                points[
                    pointIds[i]
                ];

            const b =
                points[
                    pointIds[j]
                ];


            const distance =
                distanceBetween(
                    a,
                    b
                );


            if (
                distance <
                EPSILON
            ) {

                checks.push({

                    category:
                        'geometry',

                    level:
                        'error',

                    code:
                        'DUPLICATE_POINTS',

                    message:
                        `点${pointIds[i]}と` +
                        `点${pointIds[j]}が重なっています。`
                });
            }
        }
    }


    /*
     * objects存在確認
     */
    const objects =
        geometry.objects;


    if (!objects) {

        checks.push({

            category:
                'geometry',

            level:
                'error',

            code:
                'OBJECTS_MISSING',

            message:
                'geometry.objectsがありません。'
        });

        return checks;
    }


    /*
     * segment
     */
    for (
        const segment
        of objects.segments ?? []
    ) {

        const a =
            getPoint(
                points,
                segment.from
            );

        const b =
            getPoint(
                points,
                segment.to
            );


        if (!a || !b) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'INVALID_SEGMENT_ENDPOINT',

                message:
                    `線分${segment.id}の端点が` +
                    '存在しません。'
            });

            continue;
        }


        if (
            distanceBetween(a, b) <
            EPSILON
        ) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'DEGENERATE_SEGMENT',

                message:
                    `線分${segment.id}が退化しています。`
            });
        }
    }


    /*
     * line
     */
    for (
        const line
        of objects.lines ?? []
    ) {

        const through =
            line.through ?? [];


        if (
            through.length < 2
        ) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'INVALID_LINE',

                message:
                    `直線${line.id}に2点の定義がありません。`
            });

            continue;
        }


        const a =
            getPoint(
                points,
                through[0]
            );

        const b =
            getPoint(
                points,
                through[1]
            );


        if (!a || !b) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'INVALID_LINE_ENDPOINT',

                message:
                    `直線${line.id}の端点が存在しません。`
            });

            continue;
        }


        if (
            distanceBetween(a, b) <
            EPSILON
        ) {

            checks.push({

                category:
                    'geometry',

                level:
                    'error',

                code:
                    'DEGENERATE_LINE',

                message:
                    `直線${line.id}が退化しています。`
            });
        }
    }


    return checks;
}


/* =========================================================
 * Template structure
 * ======================================================= */

export function validateTemplateStructure(
    template,
    geometry
) {
    const checks = [];


    if (!template) {

        return {

            category:
                'structure',

            level:
                'error',

            code:
                'TEMPLATE_MISSING',

            message:
                'templateがありません。'
        };
    }


    if (!template.id) {

        checks.push({

            category:
                'structure',

            level:
                'error',

            code:
                'TEMPLATE_ID_MISSING',

            message:
                'template.idがありません。'
        });
    }


    const requiredObjects = {

        points:
            template.geometry?.objects?.points,

        segments:
            template.geometry?.objects?.segments,

        lines:
            template.geometry?.objects?.lines,

        circles:
            template.geometry?.objects?.circles,

        triangles:
            template.geometry?.objects?.triangles
    };


    /*
     * templateのオブジェクト数だけでなく、
     * 実際のgeometryに存在するか確認する。
     */
    for (
        const [
            type,
            definitions
        ]
        of Object.entries(
            requiredObjects
        )
    ) {

        if (!definitions) {
            continue;
        }


        const actual =
            geometry.objects?.[
                type
            ] ?? [];


        const actualIds =
            new Set(
                actual.map(
                    item =>
                        typeof item === 'string'
                            ? item
                            : item.id
                )
            );


        for (
            const definition
            of definitions
        ) {

            const id =
                typeof definition === 'string'
                    ? definition
                    : definition.id;


            if (!actualIds.has(id)) {

                checks.push({

                    category:
                        'structure',

                    level:
                        'error',

                    code:
                        'OBJECT_MISSING',

                    message:
                        `${type}の${id}が` +
                        '生成geometryに存在しません。'
                });
            }
        }
    }


    return checks;
}


/* =========================================================
 * Mathematical constraints
 * ======================================================= */

export function validateMathematicalConstraints(
    geometry
) {
    const checks = [];


    const relationships =
        geometry.relationships ?? [];


    const constraints =
        geometry.constraints ?? [];


    /*
     * relationship + constraint
     * を統合。
     */
    const allConstraints = [

        ...relationships,

        ...constraints
    ];


    for (
        const constraint
        of allConstraints
    ) {

        switch (
            constraint.type
        ) {

            case 'equal_length':

                checks.push(
                    validateEqualLength(
                        geometry,
                        constraint
                    )
                );

                break;


            case 'parallel':

                checks.push(
                    validateParallel(
                        geometry,
                        constraint
                    )
                );

                break;


            case 'concyclic':

                checks.push(
                    validateConcyclic(
                        geometry,
                        constraint
                    )
                );

                break;


            case 'point_on_circle':

                checks.push(
                    validatePointOnCircle(
                        geometry,
                        constraint
                    )
                );

                break;
        }
    }


    /*
     * 明示されている円も検査。
     */
    for (
        const circle
        of geometry.objects?.circles ?? []
    ) {

        checks.push(
            ...validateCircle(
                geometry,
                circle
            )
        );
    }


    return checks;
}


/* =========================================================
 * Equal length
 * ======================================================= */

function validateEqualLength(
    geometry,
    constraint
) {
    const left =
        getSegmentPoints(
            geometry,
            constraint.left
        );

    const right =
        getSegmentPoints(
            geometry,
            constraint.right
        );


    if (!left || !right) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'EQUAL_LENGTH_REFERENCE_ERROR',

            message:
                `長さ比較対象が存在しません: ` +
                `${constraint.left} = ${constraint.right}`
        };
    }


    const leftLength =
        distanceBetween(
            left[0],
            left[1]
        );

    const rightLength =
        distanceBetween(
            right[0],
            right[1]
        );


    const difference =
        Math.abs(
            leftLength -
            rightLength
        );


    if (
        difference >
        EPSILON
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'EQUAL_LENGTH_FAILED',

            message:
                `${constraint.left} = ` +
                `${constraint.right} ` +
                `が成立しません。`,

            details: {

                leftLength,

                rightLength,

                difference
            }
        };
    }


    return {

        category:
            'mathematics',

        level:
            'ok',

        code:
            'EQUAL_LENGTH_VALID',

        message:
            `${constraint.left} = ` +
            `${constraint.right} が成立しています。`
    };
}


/* =========================================================
 * Parallel
 * ======================================================= */

function validateParallel(
    geometry,
    constraint
) {
    const left =
        getLinePoints(
            geometry,
            constraint.left
        );

    const right =
        getLinePoints(
            geometry,
            constraint.right
        );


    if (!left || !right) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'PARALLEL_REFERENCE_ERROR',

            message:
                `平行線の参照先が存在しません: ` +
                `${constraint.left} ∥ ${constraint.right}`
        };
    }


    const v1 =
        vector(
            left[0],
            left[1]
        );

    const v2 =
        vector(
            right[0],
            right[1]
        );


    /*
     * 外積が0なら平行。
     */
    const cross =
        crossProduct(
            v1,
            v2
        );


    const normalizedCross =
        Math.abs(cross) /
        (
            vectorLength(v1) *
            vectorLength(v2)
        );


    if (
        normalizedCross >
        EPSILON
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'PARALLEL_FAILED',

            message:
                `${constraint.left} ∥ ` +
                `${constraint.right} が成立しません。`,

            details: {

                normalizedCross
            }
        };
    }


    return {

        category:
            'mathematics',

        level:
            'ok',

        code:
            'PARALLEL_VALID',

        message:
            `${constraint.left} ∥ ` +
            `${constraint.right} が成立しています。`
    };
}


/* =========================================================
 * Concyclic
 * ======================================================= */

function validateConcyclic(
    geometry,
    constraint
) {
    const points =
        constraint.points ?? [];


    if (
        points.length < 3
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'CONCYCLIC_TOO_FEW_POINTS',

            message:
                '共円判定に必要な点が不足しています。'
        };
    }


    const coordinates =
        points.map(
            id =>
                getPoint(
                    geometry.coordinates.points,
                    id
                )
        );


    if (
        coordinates.some(
            point =>
                !point
        )
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'CONCYCLIC_POINT_MISSING',

            message:
                '共円判定対象の点が存在しません。'
        };
    }


    const circle =
        constraint.circle
            ? (
                geometry.objects?.circles ?? []
            ).find(
                item =>
                    item.id ===
                    constraint.circle
            )
            : null;


    if (!circle) {

        /*
         * 円の指定がない場合は、
         * 最初の3点から円を求める。
         */
        const circumcircle =
            calculateCircumcircle(
                coordinates[0],
                coordinates[1],
                coordinates[2]
            );


        if (!circumcircle) {

            return {

                category:
                    'mathematics',

                level:
                    'error',

                code:
                    'CIRCUMCIRCLE_FAILED',

                message:
                    '基準となる円を構成できません。'
            };
        }


        for (
            let i = 3;
            i < coordinates.length;
            i++
        ) {

            const distance =
                distanceBetween(
                    coordinates[i],
                    circumcircle.center
                );


            if (
                Math.abs(
                    distance -
                    circumcircle.radius
                ) >
                EPSILON
            ) {

                return {

                    category:
                        'mathematics',

                    level:
                        'error',

                    code:
                        'CONCYCLIC_FAILED',

                    message:
                        '指定された点が同一円周上にありません.'
                };
            }
        }


        return {

            category:
                'mathematics',

            level:
                'ok',

            code:
                'CONCYCLIC_VALID',

            message:
                '指定された点は同一円周上にあります。'
        };
    }


    const center =
        getPoint(
            geometry.coordinates.points,
            circle.center
        );


    const radius =
        circle.radius;


    if (
        !center ||
        !Number.isFinite(radius)
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'CIRCLE_REFERENCE_ERROR',

            message:
                `円${circle.id}の定義が不正です。`
        };
    }


    for (
        const point of coordinates
    ) {

        const distance =
            distanceBetween(
                point,
                center
            );


        if (
            Math.abs(
                distance -
                radius
            ) >
            EPSILON
        ) {

            return {

                category:
                    'mathematics',

                level:
                    'error',

                code:
                    'CONCYCLIC_FAILED',

                message:
                    '円周上の点が円から外れています.',

                details: {

                    distance,

                    radius
                }
            };
        }
    }


    return {

        category:
            'mathematics',

        level:
            'ok',

        code:
            'CONCYCLIC_VALID',

        message:
            'すべての点が指定された円周上にあります。'
    };
}


/* =========================================================
 * Point on circle
 * ======================================================= */

function validatePointOnCircle(
    geometry,
    constraint
) {
    const point =
        getPoint(
            geometry.coordinates.points,
            constraint.point
        );


    const circle =
        (
            geometry.objects?.circles ?? []
        ).find(
            item =>
                item.id ===
                constraint.circle
        );


    if (!point || !circle) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'POINT_CIRCLE_REFERENCE_ERROR',

            message:
                '点または円が存在しません。'
        };
    }


    const center =
        getPoint(
            geometry.coordinates.points,
            circle.center
        );


    const distance =
        distanceBetween(
            point,
            center
        );


    if (
        Math.abs(
            distance -
            circle.radius
        ) >
        EPSILON
    ) {

        return {

            category:
                'mathematics',

            level:
                'error',

            code:
                'POINT_NOT_ON_CIRCLE',

            message:
                `点${constraint.point}が` +
                `円${constraint.circle}上にありません。`
        };
    }


    return {

        category:
            'mathematics',

        level:
            'ok',

        code:
            'POINT_ON_CIRCLE_VALID',

        message:
            `点${constraint.point}は` +
            `円${constraint.circle}上にあります。`
    };
}


/* =========================================================
 * Circle
 * ======================================================= */

function validateCircle(
    geometry,
    circle
) {
    const checks = [];


    const center =
        getPoint(
            geometry.coordinates.points,
            circle.center
        );


    if (!center) {

        checks.push({

            category:
                'mathematics',

            level:
                'error',

            code:
                'CIRCLE_CENTER_MISSING',

            message:
                `円${circle.id}の中心が存在しません。`
        });

        return checks;
    }


    const through =
        circle.through_points ?? [];


    if (
        through.length === 0
    ) {

        checks.push({

            category:
                'mathematics',

            level:
                'warning',

            code:
                'CIRCLE_NO_THROUGH_POINTS',

            message:
                `円${circle.id}に円周上の点がありません。`
        });

        return checks;
    }


    const radius =
        circle.radius ??
        distanceBetween(
            center,
            getPoint(
                geometry.coordinates.points,
                through[0]
            )
        );


    for (
        const id
        of through
    ) {

        const point =
            getPoint(
                geometry.coordinates.points,
                id
            );


        if (!point) {

            checks.push({

                category:
                    'mathematics',

                level:
                    'error',

                code:
                    'CIRCLE_POINT_MISSING',

                message:
                    `円${circle.id}の点${id}が` +
                    '存在しません。'
            });

            continue;
        }


        const distance =
            distanceBetween(
                center,
                point
            );


        if (
            Math.abs(
                distance -
                radius
            ) >
            EPSILON
        ) {

            checks.push({

                category:
                    'mathematics',

                level:
                    'error',

                code:
                    'CIRCLE_RADIUS_FAILED',

                message:
                    `点${id}が円${circle.id}上にありません。`
            });
        }
    }


    return checks;
}


/* =========================================================
 * Intersections
 * ======================================================= */

export function validateIntersections(
    geometry
) {
    const checks = [];


    const points =
        geometry.coordinates?.points ?? {};


    for (
        const intersection
        of geometry.intersections ?? []
    ) {

        const point =
            points[
                intersection.id
            ];


        if (!point) {

            checks.push({

                category:
                    'intersection',

                level:
                    'error',

                code:
                    'INTERSECTION_POINT_MISSING',

                message:
                    `交点${intersection.id}の` +
                    '座標がありません。'
            });

            continue;
        }


        const lines =
            intersection.lines ?? [];


        if (
            lines.length !== 2
        ) {

            checks.push({

                category:
                    'intersection',

                level:
                    'error',

                code:
                    'INTERSECTION_LINE_COUNT',

                message:
                    `交点${intersection.id}の` +
                    '直線指定が不正です。'
            });

            continue;
        }


        const first =
            getLinePoints(
                geometry,
                lines[0]
            );

        const second =
            getLinePoints(
                geometry,
                lines[1]
            );


        if (!first || !second) {

            checks.push({

                category:
                    'intersection',

                level:
                    'error',

                code:
                    'INTERSECTION_LINE_MISSING',

                message:
                    `交点${intersection.id}の` +
                    '直線が存在しません。'
            });

            continue;
        }


        const calculated =
            lineIntersection(
                first[0],
                first[1],
                second[0],
                second[1]
            );


        if (!calculated) {

            checks.push({

                category:
                    'intersection',

                level:
                    'error',

                code:
                    'PARALLEL_INTERSECTION',

                message:
                    `交点${intersection.id}を構成する` +
                    '2直線が平行です。'
            });

            continue;
        }


        const distance =
            distanceBetween(
                point,
                calculated
            );


        if (
            distance >
            EPSILON
        ) {

            checks.push({

                category:
                    'intersection',

                level:
                    'error',

                code:
                    'INTERSECTION_COORDINATE_FAILED',

                message:
                    `交点${intersection.id}の座標が` +
                    '直線の交点と一致しません。',

                details: {

                    distance
                }
            });

            continue;
        }


        checks.push({

            category:
                'intersection',

            level:
                'ok',

            code:
                'INTERSECTION_VALID',

            message:
                `交点${intersection.id}は正常です。`
        });
    }


    return checks;
}


/* =========================================================
 * Proof validation
 * ======================================================= */

export function validateProof(
    template,
    proofResult
) {
    const checks = [];


    if (!proofResult) {

        checks.push({

            category:
                'proof',

            level:
                'error',

            code:
                'PROOF_MISSING',

            message:
                '証明結果がありません。'
        });

        return checks;
    }


    if (!proofResult.success) {

        checks.push({

            category:
                'proof',

            level:
                'error',

            code:
                'PROOF_FAILED',

            message:
                '証明目標を導出できませんでした。'
        });

        return checks;
    }


    const target =
        template.proof?.target;


    if (!target) {

        checks.push({

            category:
                'proof',

            level:
                'warning',

            code:
                'PROOF_TARGET_MISSING',

            message:
                'テンプレートに証明目標がありません。'
        });

        return checks;
    }


    /*
     * 目標の一致
     */
    const actual =
        proofResult.target;


    if (
        actual?.type !==
        target.type
    ) {

        checks.push({

            category:
                'proof',

            level:
                'error',

            code:
                'PROOF_TARGET_TYPE_MISMATCH',

            message:
                '証明目標の種類が一致しません。'
        });
    }


    /*
     * criterion
     */
    if (
        target.criterion &&
        actual?.criterion !==
            target.criterion
    ) {

        checks.push({

            category:
                'proof',

            level:
                'error',

            code:
                'PROOF_CRITERION_MISMATCH',

            message:
                '合同条件が一致しません。'
        });
    }


    /*
     * 証明ステップ
     */
    if (
        !Array.isArray(
            proofResult.steps
        ) ||
        proofResult.steps.length === 0
    ) {

        checks.push({

            category:
                'proof',

            level:
                'error',

            code:
                'PROOF_STEPS_EMPTY',

            message:
                '証明ステップがありません。'
        });

        return checks;
    }


    /*
     * 循環参照
     */
    const ids =
        new Set();


    for (
        const step
        of proofResult.steps
    ) {

        if (
            ids.has(step.id)
        ) {

            checks.push({

                category:
                    'proof',

                level:
                    'error',

                code:
                    'DUPLICATE_PROOF_STEP',

                message:
                    `証明ステップ${step.id}が重複しています。`
            });
        }


        ids.add(
            step.id
        );
    }


    /*
     * 最低限の証明長チェック。
     */
    if (
        proofResult.steps.length <
        2
    ) {

        checks.push({

            category:
                'proof',

            level:
                'warning',

            code:
                'PROOF_TOO_SHORT',

            message:
                '証明ステップが少なすぎます。'
        });
    }


    if (
        proofResult.steps.length >
        20
    ) {

        checks.push({

            category:
                'proof',

            level:
                'warning',

            code:
                'PROOF_TOO_LONG',

            message:
                '証明ステップが多すぎます。'
        });
    }


    checks.push({

        category:
            'proof',

        level:
            'ok',

        code:
            'PROOF_VALID',

        message:
            '証明目標がルールエンジンによって導出されています。'
    });


    return checks;
}


/* =========================================================
 * Parameter validation
 * ======================================================= */

export function validateParameters(
    template,
    parameters
) {
    const checks = [];


    if (!parameters) {

        return {

            category:
                'parameters',

            level:
                'error',

            code:
                'PARAMETERS_MISSING',

            message:
                '生成パラメータがありません。'
        };
    }


    /*
     * 角度の基本検査
     */
    if (parameters.angles) {

        for (
            const [
                name,
                value
            ]
            of Object.entries(
                parameters.angles
            )
        ) {

            if (
                !Number.isFinite(value)
            ) {

                checks.push({

                    category:
                        'parameters',

                    level:
                        'error',

                    code:
                        'INVALID_PARAMETER',

                    message:
                        `角度${name}が不正です。`
                });
            }
        }
    }


    /*
     * 角度範囲
     */
    const constraints =
        template
            ?.parameter_model
            ?.constraints;


    if (
        constraints &&
        parameters.derivedAngles
    ) {

        const AFB =
            parameters.derivedAngles.AFB;

        const CAE =
            parameters.derivedAngles.CAE;


        if (
            AFB < constraints.angle_AFB.min ||
            AFB > constraints.angle_AFB.max
        ) {

            checks.push({

                category:
                    'parameters',

                level:
                    'error',

                code:
                    'ANGLE_AFB_OUT_OF_RANGE',

                message:
                    '∠AFBが許容範囲外です。'
            });
        }


        if (
            CAE < constraints.angle_CAE.min ||
            CAE > constraints.angle_CAE.max
        ) {

            checks.push({

                category:
                    'parameters',

                level:
                    'error',

                code:
                    'ANGLE_CAE_OUT_OF_RANGE',

                message:
                    '∠CAEが許容範囲外です。'
            });
        }
    }


    if (
        checks.length === 0
    ) {

        checks.push({

            category:
                'parameters',

            level:
                'ok',

            code:
                'PARAMETERS_VALID',

            message:
                '生成パラメータは正常です。'
        });
    }


    return checks;
}


/* =========================================================
 * Score
 * ======================================================= */

function calculateValidationScore(
    checks
) {
    let score = 100;


    for (
        const check
        of checks
    ) {

        if (
            check.level ===
            'error'
        ) {
            score -= 20;
        }

        else if (
            check.level ===
            'warning'
        ) {
            score -= 5;
        }
    }


    return Math.max(
        0,
        score
    );
}


/* =========================================================
 * Utilities
 * ======================================================= */

function flattenChecks(
    values
) {
    const result = [];


    for (
        const value
        of values
    ) {

        if (
            Array.isArray(value)
        ) {

            result.push(
                ...value
            );
        }

        else if (value) {

            result.push(
                value
            );
        }
    }


    return result;
}


function getPoint(
    points,
    id
) {
    if (
        !points ||
        !id
    ) {
        return null;
    }


    return points[id] ?? null;
}


function getSegmentPoints(
    geometry,
    id
) {
    if (
        !id ||
        typeof id !== 'string'
    ) {
        return null;
    }


    const normalized =
        normalizeEdge(
            id
        );


    const segments =
        geometry.objects?.segments ?? [];


    const segment =
        segments.find(
            item =>
                normalizeEdge(
                    item.id
                ) === normalized
        );


    if (!segment) {

        /*
         * "AC"のような2文字表記にも対応。
         */
        if (
            id.length === 2
        ) {

            return [

                getPoint(
                    geometry.coordinates.points,
                    id[0]
                ),

                getPoint(
                    geometry.coordinates.points,
                    id[1]
                )
            ];
        }


        return null;
    }


    return [

        getPoint(
            geometry.coordinates.points,
            segment.from
        ),

        getPoint(
            geometry.coordinates.points,
            segment.to
        )
    ];
}


function getLinePoints(
    geometry,
    id
) {
    if (
        !id
    ) {
        return null;
    }


    let normalized =
        String(id);


    if (
        normalized.startsWith('l_')
    ) {
        normalized =
            normalized.substring(2);
    }


    const lines =
        geometry.objects?.lines ?? [];


    const line =
        lines.find(
            item =>
                item.id === id ||
                item.id === `l_${normalized}` ||
                item.id === normalized
        );


    if (line) {

        const through =
            line.through ?? [];


        if (
            through.length < 2
        ) {
            return null;
        }


        return [

            getPoint(
                geometry.coordinates.points,
                through[0]
            ),

            getPoint(
                geometry.coordinates.points,
                through[1]
            )
        ];
    }


    /*
     * BD / CEなどの短縮表記。
     */
    if (
        normalized.length === 2
    ) {

        return [

            getPoint(
                geometry.coordinates.points,
                normalized[0]
            ),

            getPoint(
                geometry.coordinates.points,
                normalized[1]
            )
        ];
    }


    /*
     * segmentsも直線として利用可能。
     */
    const segment =
        (
            geometry.objects?.segments ?? []
        ).find(
            item =>
                item.id === normalized
        );


    if (segment) {

        return [

            getPoint(
                geometry.coordinates.points,
                segment.from
            ),

            getPoint(
                geometry.coordinates.points,
                segment.to
            )
        ];
    }


    return null;
}


function normalizeEdge(
    id
) {
    if (
        typeof id !== 'string'
    ) {
        return id;
    }


    if (
        id.includes('-')
    ) {

        const [
            a,
            b
        ] =
            id.split('-');


        return (
            a < b
                ? `${a}-${b}`
                : `${b}-${a}`
        );
    }


    if (
        id.length === 2
    ) {

        const a =
            id[0];

        const b =
            id[1];


        return (
            a < b
                ? `${a}-${b}`
                : `${b}-${a}`
        );
    }


    return id;
}


/* =========================================================
 * Vector
 * ======================================================= */

function vector(
    a,
    b
) {
    return {

        x:
            b.x - a.x,

        y:
            b.y - a.y
    };
}


function vectorLength(
    v
) {
    return Math.sqrt(
        v.x * v.x +
        v.y * v.y
    );
}


function crossProduct(
    a,
    b
) {
    return (
        a.x * b.y -
        a.y * b.x
    );
}


/* =========================================================
 * Distance
 * ======================================================= */

function distanceBetween(
    a,
    b
) {
    if (!a || !b) {
        return Infinity;
    }


    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


/* =========================================================
 * Line intersection
 * ======================================================= */

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
        Math.abs(
            denominator
        ) <
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
 * Circumcircle
 * ======================================================= */

function calculateCircumcircle(
    A,
    B,
    C
) {
    const denominator =
        2 *
        (
            A.x *
            (B.y - C.y) +

            B.x *
            (C.y - A.y) +

            C.x *
            (A.y - B.y)
        );


    if (
        Math.abs(
            denominator
        ) <
        EPSILON
    ) {
        return null;
    }


    const A2 =
        A.x * A.x +
        A.y * A.y;

    const B2 =
        B.x * B.x +
        B.y * B.y;

    const C2 =
        C.x * C.x +
        C.y * C.y;


    const x =
        (
            A2 *
            (B.y - C.y) +

            B2 *
            (C.y - A.y) +

            C2 *
            (A.y - B.y)
        ) /
        denominator;


    const y =
        (
            A2 *
            (C.x - B.x) +

            B2 *
            (A.x - C.x) +

            C2 *
            (B.x - A.x)
        ) /
        denominator;


    const center = {
        x,
        y
    };


    return {

        center,

        radius:
            distanceBetween(
                center,
                A
            )
    };
}
