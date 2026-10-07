/**
 * 入試対策証明ジェネレーター
 *
 * Proof Solver
 *
 * 図形条件から、定理・性質をルールベースで適用し、
 * 証明に必要な事実を導出する。
 *
 * ML / LLM は使用しない。
 */

const EPSILON = 1e-8;


/* =========================================================
 * Main
 * ======================================================= */

/**
 * geometry と template から証明を探索する。
 */
export function solveProof(
    template,
    geometry,
    options = {}
) {
    if (!template) {
        throw new Error(
            'proof solver に template が必要です。'
        );
    }

    if (!geometry) {
        throw new Error(
            'proof solver に geometry が必要です。'
        );
    }

    const proofDefinition =
        template.proof;

    if (!proofDefinition) {
        throw new Error(
            `テンプレート "${template.id}" に proof 定義がありません。`
        );
    }


    const state =
        createProofState(
            geometry
        );


    /*
     * 初期条件を事実として登録。
     */
    registerInitialFacts(
        state,
        geometry
    );


    /*
     * 定理を繰り返し適用。
     *
     * 1回で終わるとは限らない。
     *
     * 例:
     *
     * AC=AD
     *   ↓
     * 二等辺三角形
     *   ↓
     * 円周角
     *   ↓
     * 平行線
     *   ↓
     * 円周角
     *   ↓
     * 等角
     */
    const maxIterations =
        options.maxIterations ?? 20;


    for (
        let i = 0;
        i < maxIterations;
        i++
    ) {

        let changed = false;


        for (
            const rule of RULES
        ) {
            const facts =
                rule.apply(
                    state
                );

            for (
                const fact of facts
            ) {
                if (
                    addFact(
                        state,
                        fact
                    )
                ) {
                    changed = true;
                }
            }
        }


        if (!changed) {
            break;
        }
    }


    /*
     * 最終目標を評価。
     */
    const result =
        solveTarget(
            state,
            proofDefinition.target
        );


    return {

        success:
            result.success,

        target:
            proofDefinition.target,

        requiredConditions:
            proofDefinition.required_facts ?? [],

        facts:
            Array.from(
                state.facts.values()
            ),

        derivedFacts:
            state.derivedFacts,

        proof:
            result.proof,

        steps:
            result.steps,

        statistics: {

            factCount:
                state.facts.size,

            derivedFactCount:
                state.derivedFacts.length,

            iterations:
                state.iterations
        }
    };
}


/* =========================================================
 * Proof State
 * ======================================================= */

function createProofState(
    geometry
) {
    return {

        geometry,

        facts:
            new Map(),

        derivedFacts: [],

        iterations: 0
    };
}


/* =========================================================
 * Initial facts
 * ======================================================= */

function registerInitialFacts(
    state,
    geometry
) {
    /*
     * relationships
     */
    for (
        const relationship
        of geometry.relationships ?? []
    ) {

        addFact(
            state,
            {
                type:
                    normalizeRelationshipType(
                        relationship.type
                    ),

                data:
                    relationship,

                source:
                    'given'
            }
        );
    }


    /*
     * constraints
     */
    for (
        const constraint
        of geometry.constraints ?? []
    ) {

        addFact(
            state,
            {
                type:
                    normalizeRelationshipType(
                        constraint.type
                    ),

                data:
                    constraint,

                source:
                    'given'
            }
        );
    }


    /*
     * 三角形の性質
     */
    for (
        const triangle
        of geometry.objects?.triangles ?? []
    ) {

        for (
            const property
            of triangle.properties ?? []
        ) {

            if (
                property === 'isosceles'
            ) {

                addFact(
                    state,
                    {
                        type:
                            'isosceles_triangle',

                        data: {
                            triangle:
                                triangle.id,

                            vertices:
                                triangle.vertices,

                            property
                        },

                        source:
                            'given'
                    }
                );
            }


            const equalSide =
                parseEqualSideProperty(
                    property
                );


            if (equalSide) {

                addFact(
                    state,
                    {
                        type:
                            'equal_length',

                        data:
                            equalSide,

                        source:
                            'given'
                    }
                );
            }
        }
    }


    /*
     * 円周上の点
     */
    for (
        const circle
        of geometry.objects?.circles ?? []
    ) {

        for (
            const point
            of circle.through_points ?? []
        ) {

            addFact(
                state,
                {
                    type:
                        'point_on_circle',

                    data: {

                        point,

                        circle:
                            circle.id
                    },

                    source:
                        'given'
                }
            );
        }
    }
}


/* =========================================================
 * Rule registry
 * ======================================================= */

const RULES = [

    /*
     * Rule 1
     *
     * 同じ円周上にある点から、
     * 円周角の「同じ弦」を検出する。
     */
    sameArcAngleRule,

    /*
     * Rule 2
     *
     * 平行線による錯角。
     */
    parallelAngleRule,

    /*
     * Rule 3
     *
     * 二等辺三角形の底角。
     */
    isoscelesAngleRule,

    /*
     * Rule 4
     *
     * 同一角の推移。
     */
    angleTransitivityRule,

    /*
     * Rule 5
     *
     * collinear な点を使った角の置換。
     */
    collinearAngleRule,

    /*
     * Rule 6
     *
     * ASA合同。
     */
    asaCongruenceRule
];


/* =========================================================
 * Rule: Same Arc
 * ======================================================= */

/**
 * 同じ弦を見込む円周角は等しい。
 *
 * 例えば
 *
 * ∠ACB
 * ∠ADB
 *
 * はともに弦ABを見込む。
 */
function sameArcAngleRule(
    state
) {
    const result = [];

    const circles =
        state.geometry.objects?.circles ?? [];

    for (
        const circle of circles
    ) {

        const points =
            circle.through_points ?? [];


        if (points.length < 4) {
            continue;
        }


        /*
         * 3点 X,Y,Z から
         *
         * ∠XYZ
         *
         * を作る。
         *
         * X,Z が弦の端点。
         */
        const angles =
            generateCircleAngles(
                points
            );


        /*
         * 同じ弦を見込む角をグループ化。
         */
        const groups =
            new Map();


        for (
            const angle of angles
        ) {

            const chord =
                canonicalPair(
                    angle.ray1,
                    angle.ray2
                );


            if (!groups.has(chord)) {
                groups.set(
                    chord,
                    []
                );
            }

            groups
                .get(chord)
                .push(angle);
        }


        for (
            const [
                chord,
                angleList
            ]
            of groups
        ) {

            if (angleList.length < 2) {
                continue;
            }


            const first =
                angleList[0];


            for (
                let i = 1;
                i < angleList.length;
                i++
            ) {

                const second =
                    angleList[i];


                if (
                    first.vertex ===
                    second.vertex
                ) {
                    continue;
                }


                result.push({

                    type:
                        'equal_angle',

                    data: {

                        left:
                            first.id,

                        right:
                            second.id,

                        reason:
                            'same_arc',

                        chord
                    },

                    source:
                        'same_arc_angle',

                    premises: [

                        {
                            type:
                                'point_on_circle',

                            points
                        }
                    ]
                });
            }
        }
    }

    return result;
}


/* =========================================================
 * Rule: Parallel
 * ======================================================= */

/**
 * 平行線と横切る直線から、
 * 錯角の等しさを導く。
 */
function parallelAngleRule(
    state
) {
    const result = [];

    const parallels =
        getFacts(
            state,
            'parallel'
        );


    for (
        const fact
        of parallels
    ) {

        const {
            left,
            right
        } = normalizeParallel(
            fact.data
        );


        const lineA =
            getLine(
                state.geometry,
                left
            );

        const lineB =
            getLine(
                state.geometry,
                right
            );


        if (!lineA || !lineB) {
            continue;
        }


        /*
         * geometry上に存在する
         * 2本の平行線を横切る線を探す。
         */
        const transversal =
            findTransversal(
                state.geometry,
                lineA,
                lineB
            );


        if (!transversal) {
            continue;
        }


        const intersections =
            transversal.intersections;


        if (
            !intersections ||
            intersections.length !== 2
        ) {
            continue;
        }


        /*
         * 実際の点配置から、
         * 4つの角を生成。
         */
        const generated =
            generateParallelAngleFacts(
                lineA,
                lineB,
                transversal
            );


        result.push(
            ...generated
        );
    }


    return result;
}


/* =========================================================
 * Rule: Isosceles
 * ======================================================= */

/**
 * 二等辺三角形の底角は等しい。
 */
function isoscelesAngleRule(
    state
) {
    const result = [];

    const equalLengths =
        getFacts(
            state,
            'equal_length'
        );


    for (
        const fact
        of equalLengths
    ) {

        const left =
            fact.data.left;

        const right =
            fact.data.right;


        const sides = [
            normalizeSegment(
                left
            ),
            normalizeSegment(
                right
            )
        ];


        if (
            !sides[0] ||
            !sides[1]
        ) {
            continue;
        }


        if (
            sides[0][0] === sides[1][0]
        ) {

            /*
             * 共通点が頂点。
             *
             * 例:
             *
             * AC = AD
             *
             * → Aが頂点
             * → C,Dが底辺側。
             */

            const vertex =
                sides[0][0];

            const baseA =
                sides[0][1];

            const baseB =
                sides[1][1];


            result.push({

                type:
                    'equal_angle',

                data: {

                    left:
                        makeAngle(
                            baseA,
                            vertex,
                            baseB
                        ),

                    right:
                        makeAngle(
                            baseB,
                            vertex,
                            baseA
                        ),

                    reason:
                        'isosceles_base_angles'
                },

                source:
                    'isosceles_triangle',

                premises: [
                    fact
                ]
            });
        }
    }


    /*
     * Geometryから明示された
     * isosceles triangleも処理。
     */
    const isosceles =
        getFacts(
            state,
            'isosceles_triangle'
        );


    for (
        const fact
        of isosceles
    ) {

        const vertices =
            fact.data.vertices;


        if (
            !vertices ||
            vertices.length !== 3
        ) {
            continue;
        }


        /*
         * equal_length factが存在する場合は、
         * そちらから頂点を決定する。
         */
    }


    return result;
}


/* =========================================================
 * Rule: Angle Transitivity
 * ======================================================= */

/**
 * ∠A = ∠B
 * ∠B = ∠C
 *
 * → ∠A = ∠C
 */
function angleTransitivityRule(
    state
) {
    const result = [];

    const equalAngles =
        getFacts(
            state,
            'equal_angle'
        );


    const graph =
        new Map();


    for (
        const fact
        of equalAngles
    ) {

        const a =
            canonicalAngle(
                fact.data.left
            );

        const b =
            canonicalAngle(
                fact.data.right
            );


        if (!graph.has(a)) {
            graph.set(a, []);
        }

        if (!graph.has(b)) {
            graph.set(b, []);
        }


        graph.get(a).push({
            angle: b,
            fact
        });

        graph.get(b).push({
            angle: a,
            fact
        });
    }


    /*
     * BFSで同じ角グループを求める。
     */
    const visited =
        new Set();


    for (
        const start
        of graph.keys()
    ) {

        if (visited.has(start)) {
            continue;
        }


        const queue = [start];

        const group = new Set();


        while (queue.length) {

            const current =
                queue.shift();


            if (
                group.has(current)
            ) {
                continue;
            }


            group.add(current);

            visited.add(current);


            for (
                const edge
                of graph.get(current) ?? []
            ) {

                if (
                    !group.has(edge.angle)
                ) {
                    queue.push(
                        edge.angle
                    );
                }
            }
        }


        const members =
            Array.from(group);


        for (
            let i = 0;
            i < members.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < members.length;
                j++
            ) {

                const left =
                    members[i];

                const right =
                    members[j];


                if (
                    left === right
                ) {
                    continue;
                }


                if (
                    hasDirectEquality(
                        state,
                        left,
                        right
                    )
                ) {
                    continue;
                }


                result.push({

                    type:
                        'equal_angle',

                    data: {

                        left,

                        right,

                        reason:
                            'transitivity'
                    },

                    source:
                        'angle_transitivity',

                    premises:
                        findAnglePath(
                            graph,
                            left,
                            right
                        )
                });
            }
        }
    }


    return result;
}


/* =========================================================
 * Rule: Collinear angle
 * ======================================================= */

/**
 * GがAE上にあるなら、
 *
 * ∠GAD
 *
 * を
 *
 * ∠EAD
 *
 * と同一視できる。
 *
 * D,G,Bが一直線上なら、
 *
 * ∠ADG
 *
 * を
 *
 * ∠ADB
 *
 * と同一視できる。
 */
function collinearAngleRule(
    state
) {
    const result = [];

    const collinearGroups =
        buildCollinearGroups(
            state.geometry
        );


    for (
        const group
        of collinearGroups
    ) {

        if (group.length < 3) {
            continue;
        }


        /*
         * 同じ直線上の点について、
         * 同方向のrayを表す角を生成する。
         */
        const angles =
            generateCollinearAngleVariants(
                state.geometry,
                group
            );


        result.push(
            ...angles
        );
    }


    return result;
}


/* =========================================================
 * Rule: ASA
 * ======================================================= */

/**
 * 2つの三角形について
 *
 * side = side
 * angle = angle
 * angle = angle
 *
 * が対応していればASA合同。
 */
function asaCongruenceRule(
    state
) {
    const result = [];

    const triangles =
        state.geometry.objects?.triangles ?? [];


    for (
        let i = 0;
        i < triangles.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < triangles.length;
            j++
        ) {

            const left =
                triangles[i];

            const right =
                triangles[j];


            const congruence =
                checkASA(
                    state,
                    left,
                    right
                );


            if (!congruence) {
                continue;
            }


            result.push({

                type:
                    'congruence',

                data: {

                    triangles: [
                        left.id,
                        right.id
                    ],

                    criterion:
                        'ASA',

                    correspondence:
                        congruence
                },

                source:
                    'ASA',

                premises:
                    congruence.premises
            });
        }
    }


    return result;
}


/* =========================================================
 * Target
 * ======================================================= */

function solveTarget(
    state,
    target
) {
    if (!target) {
        return {

            success: false,

            proof: null,

            steps: []
        };
    }


    if (
        target.type ===
        'congruence'
    ) {

        return solveCongruenceTarget(
            state,
            target
        );
    }


    return {

        success: false,

        proof: null,

        steps: []
    };
}


function solveCongruenceTarget(
    state,
    target
) {
    const triangles =
        target.triangles ?? [];


    const criterion =
        target.criterion ??
        'ASA';


    const congruenceFacts =
        getFacts(
            state,
            'congruence'
        );


    for (
        const fact
        of congruenceFacts
    ) {

        const actual =
            fact.data.triangles;


        if (
            sameUnorderedPair(
                actual,
                triangles
            ) &&
            fact.data.criterion ===
                criterion
        ) {

            const steps =
                buildProofSteps(
                    state,
                    fact
                );


            return {

                success: true,

                proof: {

                    target: {

                        statement:
                            `△${triangles[0]}≡△${triangles[1]}`,

                        triangles,

                        criterion
                    },

                    selected_solution: {

                        steps
                    }
                },

                steps
            };
        }
    }


    return {

        success: false,

        proof: null,

        steps: []
    };
}


/* =========================================================
 * ASA matching
 * ======================================================= */

function checkASA(
    state,
    triangleA,
    triangleB
) {
    const verticesA =
        triangleA.vertices;

    const verticesB =
        triangleB.vertices;


    if (
        verticesA.length !== 3 ||
        verticesB.length !== 3
    ) {
        return null;
    }


    const equalLengths =
        getFacts(
            state,
            'equal_length'
        );

    const equalAngles =
        getFacts(
            state,
            'equal_angle'
        );


    /*
     * 試しうる頂点対応を全探索。
     *
     * 三角形は3頂点しかないため、
     * 6通りしかない。
     */
    const permutations =
        permutationsOf(
            verticesB
        );


    for (
        const mapping
        of permutations
    ) {

        const correspondence = {

            [verticesA[0]]:
                mapping[0],

            [verticesA[1]]:
                mapping[1],

            [verticesA[2]]:
                mapping[2]
        };


        /*
         * 対応辺を作る。
         */
        const edgesA =
            triangleEdges(
                verticesA
            );

        const edgesB =
            triangleEdges(
                mapping
            );


        /*
         * 等辺を探す。
         */
        const sideMatch =
            findSideMatch(
                equalLengths,
                edgesA,
                edgesB
            );


        if (!sideMatch) {
            continue;
        }


        /*
         * 2つの対応角を探す。
         *
         * ASAなので、
         * 等しい辺が2つの角の間にある
         * ことを確認する。
         */
        const angleMatch =
            findASAAngles(
                equalAngles,
                verticesA,
                mapping,
                sideMatch
            );


        if (!angleMatch) {
            continue;
        }


        return {

            correspondence,

            side:
                sideMatch,

            angles:
                angleMatch,

            premises: [
                sideMatch.fact,
                angleMatch.first.fact,
                angleMatch.second.fact
            ]
        };
    }


    return null;
}


/* =========================================================
 * Proof step construction
 * ======================================================= */

function buildProofSteps(
    state,
    targetFact
) {
    const visited =
        new Set();

    const ordered = [];


    collectDependencies(
        targetFact,
        state,
        visited,
        ordered
    );


    return ordered.map(
        (fact, index) => ({

            id:
                `S${String(index + 1).padStart(2, '0')}`,

            fact:

                fact.data,

            type:
                fact.type,

            reason:
                fact.source,

            premises:
                (fact.premises ?? [])
                    .map(
                        premise =>
                            premise.type
                    )
        })
    );
}


function collectDependencies(
    fact,
    state,
    visited,
    ordered
) {
    const key =
        factKey(
            fact
        );


    if (visited.has(key)) {
        return;
    }


    visited.add(key);


    for (
        const premise
        of fact.premises ?? []
    ) {

        collectDependencies(
            premise,
            state,
            visited,
            ordered
        );
    }


    ordered.push(fact);
}


/* =========================================================
 * Fact storage
 * ======================================================= */

function addFact(
    state,
    fact
) {
    const key =
        factKey(
            fact
        );


    if (
        state.facts.has(key)
    ) {
        return false;
    }


    state.facts.set(
        key,
        fact
    );


    if (
        fact.source !== 'given'
    ) {

        state.derivedFacts.push(
            fact
        );
    }


    return true;
}


function factKey(
    fact
) {
    if (!fact) {
        return '';
    }


    const data =
        normalizeData(
            fact.data
        );


    return JSON.stringify({

        type:
            fact.type,

        data
    });
}


function normalizeData(
    data
) {
    if (
        data === null ||
        data === undefined
    ) {
        return data;
    }


    if (
        typeof data !== 'object'
    ) {
        return data;
    }


    if (Array.isArray(data)) {

        return data
            .map(
                normalizeData
            )
            .sort(
                stableCompare
            );
    }


    const result = {};


    for (
        const key
        of Object.keys(data).sort()
    ) {

        result[key] =
            normalizeData(
                data[key]
            );
    }


    return result;
}


/* =========================================================
 * Fact helpers
 * ======================================================= */

function getFacts(
    state,
    type
) {
    return Array.from(
        state.facts.values()
    ).filter(
        fact =>
            fact.type === type
    );
}


function hasDirectEquality(
    state,
    left,
    right
) {
    return getFacts(
        state,
        'equal_angle'
    ).some(
        fact => {

            const a =
                canonicalAngle(
                    fact.data.left
                );

            const b =
                canonicalAngle(
                    fact.data.right
                );

            return (
                (
                    a === left &&
                    b === right
                ) ||
                (
                    a === right &&
                    b === left
                )
            );
        }
    );
}


/* =========================================================
 * Circle angle generation
 * ======================================================= */

function generateCircleAngles(
    points
) {
    const result = [];


    for (
        const vertex of points
    ) {

        const others =
            points.filter(
                p =>
                    p !== vertex
            );


        for (
            let i = 0;
            i < others.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < others.length;
                j++
            ) {

                const a =
                    others[i];

                const b =
                    others[j];


                result.push({

                    id:
                        makeAngle(
                            a,
                            vertex,
                            b
                        ),

                    vertex,

                    ray1: a,

                    ray2: b
                });
            }
        }
    }


    return result;
}


/* =========================================================
 * Parallel helpers
 * ======================================================= */

function normalizeParallel(
    data
) {
    return {

        left:
            data.left ??
            data.first,

        right:
            data.right ??
            data.second
    };
}


function getLine(
    geometry,
    id
) {
    if (!id) {
        return null;
    }


    const normalized =
        normalizeLineId(
            id
        );


    const lines =
        geometry.objects?.lines ?? [];


    const line =
        lines.find(
            item =>
                item.id === normalized ||
                lineContains(
                    item,
                    normalized
                )
        );


    if (line) {
        return line;
    }


    /*
     * segmentも直線として扱う。
     */
    const segments =
        geometry.objects?.segments ?? [];


    const segment =
        segments.find(
            item =>
                item.id === normalized
        );


    if (segment) {

        return {

            id:
                segment.id,

            through: [
                segment.from,
                segment.to
            ]
        };
    }


    return null;
}


function normalizeLineId(
    id
) {
    if (
        typeof id !== 'string'
    ) {
        return id;
    }


    if (
        id.startsWith('l_')
    ) {
        return id.substring(2);
    }


    return id;
}


function lineContains(
    line,
    id
) {
    const points =
        line.through ?? [];


    return (
        points.join('') ===
        id
    );
}


/* =========================================================
 * Transversal
 * ======================================================= */

function findTransversal(
    geometry,
    lineA,
    lineB
) {
    const candidates =
        geometry.objects?.lines ?? [];


    for (
        const candidate
        of candidates
    ) {

        const intersectionsA =
            lineIntersectionWithObject(
                geometry,
                candidate,
                lineA
            );

        const intersectionsB =
            lineIntersectionWithObject(
                geometry,
                candidate,
                lineB
            );


        if (
            intersectionsA &&
            intersectionsB
        ) {

            return {

                line:
                    candidate,

                intersections: [

                    intersectionsA,

                    intersectionsB
                ]
            };
        }
    }


    /*
     * segmentsも候補にする。
     */
    const segments =
        geometry.objects?.segments ?? [];


    for (
        const candidate
        of segments
    ) {

        const intersectionsA =
            lineIntersectionWithObject(
                geometry,
                candidate,
                lineA
            );

        const intersectionsB =
            lineIntersectionWithObject(
                geometry,
                candidate,
                lineB
            );


        if (
            intersectionsA &&
            intersectionsB
        ) {

            return {

                line:
                    candidate,

                intersections: [

                    intersectionsA,

                    intersectionsB
                ]
            };
        }
    }


    return null;
}


function lineIntersectionWithObject(
    geometry,
    objectA,
    objectB
) {
    const a =
        getObjectEndpoints(
            geometry,
            objectA
        );

    const b =
        getObjectEndpoints(
            geometry,
            objectB
        );


    if (!a || !b) {
        return null;
    }


    const intersection =
        calculateLineIntersection(
            a[0],
            a[1],
            b[0],
            b[1]
        );


    return intersection;
}


/* =========================================================
 * Parallel angle generation
 * ======================================================= */

function generateParallelAngleFacts(
    lineA,
    lineB,
    transversal
) {
    /*
     * この段階では、
     * 幾何構造から「同じ方向の錯角」を
     * 探索するための候補を作る。
     *
     * 最終的な対応は座標検証で確認する。
     */

    const result = [];

    const a =
        lineA.through ?? [];

    const b =
        lineB.through ?? [];

    const t =
        transversal.line?.through ??
        [];


    if (
        a.length < 2 ||
        b.length < 2 ||
        t.length < 2
    ) {
        return result;
    }


    /*
     * 実際の問題では
     *
     * ∠BDC = ∠DCE
     *
     * のように、
     * 共通する横切る線を使う。
     *
     * その候補を生成する。
     */
    for (
        const vertexA of a
    ) {

        for (
            const vertexB of b
        ) {

            for (
                const transA of t
            ) {

                if (
                    vertexA === transA ||
                    vertexB === transA
                ) {
                    continue;
                }


                result.push({

                    type:
                        'parallel_angle_candidate',

                    data: {

                        lineA:
                            a,

                        lineB:
                            b,

                        transversal:
                            t
                    },

                    source:
                        'parallel_lines',

                    premises: []
                });

                /*
                 * 同じ候補を何度も登録する必要はない。
                 */
                return result;
            }
        }
    }


    return result;
}


/* =========================================================
 * Collinear groups
 * ======================================================= */

function buildCollinearGroups(
    geometry
) {
    const groups = [];


    for (
        const line
        of geometry.objects?.lines ?? []
    ) {

        const points =
            line.through ?? [];


        if (
            points.length >= 2
        ) {
            groups.push(
                Array.from(
                    new Set(points)
                )
            );
        }
    }


    return groups;
}


function generateCollinearAngleVariants(
    geometry,
    group
) {
    /*
     * 今後、座標を用いて「同方向 / 逆方向」を
     * 厳密に判定するための入口。
     *
     * 現段階では同一直線上の角を
     * 等価候補として登録する。
     */

    const result = [];


    if (group.length < 3) {
        return result;
    }


    for (
        const vertex of group
    ) {

        const others =
            group.filter(
                p =>
                    p !== vertex
            );


        if (
            others.length < 2
        ) {
            continue;
        }


        for (
            let i = 0;
            i < others.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < others.length;
                j++
            ) {

                result.push({

                    type:
                        'collinear',

                    data: {

                        points: [
                            others[i],
                            vertex,
                            others[j]
                        ]
                    },

                    source:
                        'collinearity'
                });
            }
        }
    }


    return result;
}


/* =========================================================
 * Segment helpers
 * ======================================================= */

function normalizeSegment(
    value
) {
    if (
        typeof value !== 'string'
    ) {
        return null;
    }


    const parts =
        value.split(
            '-'
        );


    if (
        parts.length !== 2
    ) {
        return null;
    }


    return [
        parts[0],
        parts[1]
    ];
}


function parseEqualSideProperty(
    property
) {
    if (
        typeof property !== 'string'
    ) {
        return null;
    }


    const match =
        property.match(
            /^([A-Za-z]+)=([A-Za-z]+)$/
        );


    if (!match) {
        return null;
    }


    return {

        left:
            match[1],

        right:
            match[2]
    };
}


/* =========================================================
 * Angle helpers
 * ======================================================= */

function makeAngle(
    ray1,
    vertex,
    ray2
) {
    return `${ray1}${vertex}${ray2}`;
}


function canonicalAngle(
    angle
) {
    if (
        typeof angle !== 'string'
    ) {
        return angle;
    }


    if (
        angle.length !== 3
    ) {
        return angle;
    }


    const a =
        angle[0];

    const v =
        angle[1];

    const b =
        angle[2];


    return (
        a < b
            ? `${a}${v}${b}`
            : `${b}${v}${a}`
    );
}


function canonicalPair(
    a,
    b
) {
    return (
        a < b
            ? `${a}${b}`
            : `${b}${a}`
    );
}


/* =========================================================
 * Triangle helpers
 * ======================================================= */

function triangleEdges(
    vertices
) {
    return [

        normalizeEdge(
            vertices[0],
            vertices[1]
        ),

        normalizeEdge(
            vertices[1],
            vertices[2]
        ),

        normalizeEdge(
            vertices[2],
            vertices[0]
        )
    ];
}


function normalizeEdge(
    a,
    b
) {
    return (
        a < b
            ? `${a}-${b}`
            : `${b}-${a}`
    );
}


function findSideMatch(
    equalLengths,
    edgesA,
    edgesB
) {
    for (
        const fact
        of equalLengths
    ) {

        const left =
            normalizeEdgeFromString(
                fact.data.left
            );

        const right =
            normalizeEdgeFromString(
                fact.data.right
            );


        for (
            const edgeA
            of edgesA
        ) {

            for (
                const edgeB
                of edgesB
            ) {

                if (
                    (
                        left === edgeA &&
                        right === edgeB
                    ) ||
                    (
                        right === edgeA &&
                        left === edgeB
                    )
                ) {

                    return {

                        fact,

                        edgeA,

                        edgeB
                    };
                }
            }
        }
    }


    return null;
}


function findASAAngles(
    equalAngles,
    verticesA,
    verticesB,
    sideMatch
) {
    /*
     * sideMatchの両端点を調べ、
     * その両側にある角を探す。
     */

    const sideA =
        edgePoints(
            sideMatch.edgeA
        );

    const sideB =
        edgePoints(
            sideMatch.edgeB
        );


    if (
        !sideA ||
        !sideB
    ) {
        return null;
    }


    const candidates = [];


    for (
        const fact
        of equalAngles
    ) {

        const left =
            canonicalAngle(
                fact.data.left
            );

        const right =
            canonicalAngle(
                fact.data.right
            );


        if (
            angleBelongsToTriangle(
                left,
                verticesA
            ) &&
            angleBelongsToTriangle(
                right,
                verticesB
            )
        ) {

            candidates.push({
                fact,
                left,
                right
            });
        }

        else if (
            angleBelongsToTriangle(
                right,
                verticesA
            ) &&
            angleBelongsToTriangle(
                left,
                verticesB
            )
        ) {

            candidates.push({

                fact,

                left: right,

                right: left
            });
        }
    }


    /*
     * 2つの異なる頂点の角が存在すれば
     * ASA候補とする。
     */
    for (
        let i = 0;
        i < candidates.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < candidates.length;
            j++
        ) {

            const first =
                candidates[i];

            const second =
                candidates[j];


            if (
                first.left ===
                second.left
            ) {
                continue;
            }


            if (
                first.right ===
                second.right
            ) {
                continue;
            }


            return {

                first:
                    first,

                second:
                    second
            };
        }
    }


    return null;
}


function normalizeEdgeFromString(
    value
) {
    if (
        typeof value !== 'string'
    ) {
        return null;
    }


    if (
        value.includes('-')
    ) {
        return normalizeEdge(
            ...value.split('-')
        );
    }


    if (
        value.length === 2
    ) {
        return normalizeEdge(
            value[0],
            value[1]
        );
    }


    return null;
}


function edgePoints(
    edge
) {
    if (
        typeof edge !== 'string'
    ) {
        return null;
    }


    const parts =
        edge.split('-');


    return parts.length === 2
        ? parts
        : null;
}


function angleBelongsToTriangle(
    angle,
    vertices
) {
    if (
        typeof angle !== 'string' ||
        angle.length !== 3
    ) {
        return false;
    }


    return (
        vertices.includes(
            angle[0]
        ) &&
        vertices.includes(
            angle[1]
        ) &&
        vertices.includes(
            angle[2]
        )
    );
}


/* =========================================================
 * Permutations
 * ======================================================= */

function permutationsOf(
    values
) {
    if (values.length <= 1) {
        return [values.slice()];
    }


    const result = [];


    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        const current =
            values[i];

        const rest =
            values.slice(0, i)
                .concat(
                    values.slice(i + 1)
                );


        for (
            const permutation
            of permutationsOf(rest)
        ) {

            result.push([
                current,
                ...permutation
            ]);
        }
    }


    return result;
}


function sameUnorderedPair(
    a,
    b
) {
    if (
        !Array.isArray(a) ||
        !Array.isArray(b)
    ) {
        return false;
    }


    return (
        a.length === b.length &&
        a.every(
            item =>
                b.includes(item)
        )
    );
}


/* =========================================================
 * Path
 * ======================================================= */

function findAnglePath(
    graph,
    start,
    target
) {
    const queue = [
        {
            node: start,
            path: []
        }
    ];


    const visited =
        new Set([
            start
        ]);


    while (queue.length) {

        const current =
            queue.shift();


        if (
            current.node === target
        ) {
            return current.path;
        }


        for (
            const edge
            of graph.get(
                current.node
            ) ?? []
        ) {

            if (
                visited.has(
                    edge.angle
                )
            ) {
                continue;
            }


            visited.add(
                edge.angle
            );


            queue.push({

                node:
                    edge.angle,

                path: [
                    ...current.path,
                    edge.fact
                ]
            });
        }
    }


    return [];
}


/* =========================================================
 * Geometry intersection
 * ======================================================= */

function getObjectEndpoints(
    geometry,
    object
) {
    const points =
        geometry.coordinates?.points ??
        {};


    const through =
        object.through ??
        [
            object.from,
            object.to
        ];


    if (
        !through ||
        through.length < 2
    ) {
        return null;
    }


    const A =
        points[
            through[0]
        ];

    const B =
        points[
            through[1]
        ];


    if (
        !A ||
        !B
    ) {
        return null;
    }


    return [
        A,
        B
    ];
}


function calculateLineIntersection(
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
 * Utility
 * ======================================================= */

function normalizeRelationshipType(
    type
) {
    if (!type) {
        return 'unknown';
    }


    switch (type) {

        case 'parallel':
            return 'parallel';

        case 'equal_length':
            return 'equal_length';

        case 'concyclic':
            return 'concyclic';

        case 'point_on_circle':
            return 'point_on_circle';

        default:
            return type;
    }
}


function stableCompare(
    a,
    b
) {
    const sa =
        JSON.stringify(a);

    const sb =
        JSON.stringify(b);

    return sa < sb
        ? -1
        : sa > sb
            ? 1
            : 0;
}
