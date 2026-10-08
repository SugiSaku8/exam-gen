/**
 * geometry_solver.js
 *
 * 類題生成用の幾何計算エンジン。
 *
 * 方針:
 * - MLを使用しない
 * - 数学的制約から座標を直接構成する
 * - 2014年型を最初のテンプレートとして扱う
 * - GeometryModelをDrawerへ渡せる形式にする
 *
 * 座標系:
 *   x → 右
 *   y → 上
 *
 * 円:
 *   center = (cx, cy)
 *   radius = r
 *
 * 点:
 *   { id, x, y, role, ... }
 */


/* =========================================================
 * 基本ユーティリティ
 * ========================================================= */

const EPSILON = 1e-9;


/**
 * 数値判定
 */
function isFiniteNumber(value) {
  return Number.isFinite(value);
}


/**
 * degree → radian
 */
export function degToRad(degree) {
  return degree * Math.PI / 180;
}


/**
 * radian → degree
 */
export function radToDeg(radian) {
  return radian * 180 / Math.PI;
}


/**
 * degreeを0〜360へ正規化
 */
export function normalizeAngle(degree) {
  let result = degree % 360;

  if (result < 0) {
    result += 360;
  }

  return result;
}


/**
 * 角度差
 */
export function angleDifference(a, b) {
  let d =
    normalizeAngle(a) -
    normalizeAngle(b);

  if (d > 180) {
    d -= 360;
  }

  if (d < -180) {
    d += 360;
  }

  return Math.abs(d);
}


/**
 * 数値を丸める
 */
export function roundNumber(
  value,
  digits = 12
) {
  const factor =
    10 ** digits;

  return Math.round(
    value * factor
  ) / factor;
}


/**
 * 点を作る
 */
export function point(
  id,
  x,
  y,
  options = {}
) {
  return {
    id,
    x,
    y,
    role:
      options.role ??
      'point',

    label:
      options.label ??
      id,

    label_offset:
      options.label_offset ??
      {
        x: 0,
        y: -18
      },

    ...options
  };
}


/**
 * 2点間距離
 */
export function distance(a, b) {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}


/**
 * 2点間距離の二乗
 */
export function distanceSquared(a, b) {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  return dx * dx + dy * dy;
}


/**
 * 3点がほぼ一直線か
 */
export function collinear(
  a,
  b,
  c,
  epsilon = EPSILON
) {
  const cross =
    (b.x - a.x) *
      (c.y - a.y)
    -
    (b.y - a.y) *
      (c.x - a.x);

  return Math.abs(cross) < epsilon;
}


/**
 * 2ベクトルの外積
 */
export function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}


/**
 * 2ベクトルの内積
 */
export function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}


/* =========================================================
 * 円
 * ========================================================= */

/**
 * 円周上の点
 *
 * angleは数学座標系で、
 * x軸正方向から反時計回り。
 */
export function pointOnCircle(
  id,
  center,
  radius,
  angle,
  options = {}
) {
  const theta =
    degToRad(angle);

  const x =
    center.x +
    radius * Math.cos(theta);

  const y =
    center.y +
    radius * Math.sin(theta);

  return point(
    id,
    roundNumber(x),
    roundNumber(y),
    {
      role:
        options.role ??
        'circle_point',

      angle,
      ...options
    }
  );
}


/**
 * 点が円周上にあるか
 */
export function isOnCircle(
  p,
  center,
  radius,
  tolerance = 1e-7
) {
  return Math.abs(
    distance(p, center) - radius
  ) < tolerance;
}


/**
 * 円周上の点の偏角
 */
export function angleOfPoint(
  point,
  center
) {
  return normalizeAngle(
    radToDeg(
      Math.atan2(
        point.y - center.y,
        point.x - center.x
      )
    )
  );
}


/* =========================================================
 * 直線
 * ========================================================= */

/**
 * 2点から直線を作る。
 *
 * 形式:
 *
 *   p + t * d
 */
export function createLine(
  a,
  b,
  options = {}
) {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  const length =
    Math.hypot(dx, dy);

  if (length < EPSILON) {
    throw new Error(
      `同一点から直線を作れません: ${a.id}, ${b.id}`
    );
  }

  return {
    a,
    b,

    direction: {
      x: dx,
      y: dy
    },

    length,

    ...options
  };
}


/**
 * 点 + 方向ベクトルから直線を作る
 */
export function createLineFromDirection(
  origin,
  direction,
  options = {}
) {
  const length =
    Math.hypot(
      direction.x,
      direction.y
    );

  if (length < EPSILON) {
    throw new Error(
      '方向ベクトルが0です。'
    );
  }

  const b = {
    id: `${origin.id}_direction`,
    x:
      origin.x +
      direction.x,

    y:
      origin.y +
      direction.y
  };

  return createLine(
    origin,
    b,
    options
  );
}


/**
 * 2直線の交点。
 *
 * line1:
 *   p + t*r
 *
 * line2:
 *   q + u*s
 */
export function intersectLines(
  line1,
  line2,
  tolerance = EPSILON
) {
  const p = line1.a;
  const q = line2.a;

  const r = {
    x:
      line1.b.x -
      line1.a.x,

    y:
      line1.b.y -
      line1.a.y
  };

  const s = {
    x:
      line2.b.x -
      line2.a.x,

    y:
      line2.b.y -
      line2.a.y
  };

  const denominator =
    cross(
      r.x,
      r.y,
      s.x,
      s.y
    );

  if (
    Math.abs(denominator)
    < tolerance
  ) {
    return null;
  }

  const qMinusP = {
    x:
      q.x - p.x,

    y:
      q.y - p.y
  };

  const t =
    cross(
      qMinusP.x,
      qMinusP.y,
      s.x,
      s.y
    ) / denominator;

  const x =
    p.x +
    t * r.x;

  const y =
    p.y +
    t * r.y;

  return {
    x: roundNumber(x),
    y: roundNumber(y),
    t
  };
}


/**
 * 2点を通る直線上にある点を、
 * 指定した方向・距離で作る。
 */
export function translatePoint(
  p,
  dx,
  dy,
  id = `${p.id}_translated`,
  options = {}
) {
  return point(
    id,
    roundNumber(p.x + dx),
    roundNumber(p.y + dy),
    options
  );
}


/* =========================================================
 * 平行線
 * ========================================================= */

/**
 * 点を通り、指定直線と平行な直線
 */
export function parallelThrough(
  p,
  referenceLine,
  options = {}
) {
  const dx =
    referenceLine.b.x -
    referenceLine.a.x;

  const dy =
    referenceLine.b.y -
    referenceLine.a.y;

  const q = {
    id: `${p.id}_parallel`,
    x:
      p.x + dx,

    y:
      p.y + dy
  };

  return createLine(
    p,
    q,
    {
      parallel_to:
        referenceLine,

      ...options
    }
  );
}


/* =========================================================
 * 線分と円の交点
 * ========================================================= */

/**
 * 直線と円の交点を求める。
 *
 * 直線:
 *   P + tD
 *
 * 円:
 *   |X-C| = r
 *
 * 戻り値:
 *   0〜2個の点
 */
export function intersectLineCircle(
  line,
  center,
  radius
) {
  const px =
    line.a.x;

  const py =
    line.a.y;

  const dx =
    line.b.x -
    line.a.x;

  const dy =
    line.b.y -
    line.a.y;

  const fx =
    px - center.x;

  const fy =
    py - center.y;

  const a =
    dx * dx +
    dy * dy;

  const b =
    2 * (
      fx * dx +
      fy * dy
    );

  const c =
    fx * fx +
    fy * fy -
    radius * radius;

  const discriminant =
    b * b -
    4 * a * c;

  if (
    discriminant < -EPSILON
  ) {
    return [];
  }

  if (
    Math.abs(discriminant)
    < EPSILON
  ) {
    const t =
      -b / (2 * a);

    return [
      {
        x:
          roundNumber(
            px + t * dx
          ),

        y:
          roundNumber(
            py + t * dy
          ),

        t
      }
    ];
  }

  const sqrtD =
    Math.sqrt(
      Math.max(
        0,
        discriminant
      )
    );

  const t1 =
    (-b - sqrtD) /
    (2 * a);

  const t2 =
    (-b + sqrtD) /
    (2 * a);

  return [
    {
      x:
        roundNumber(
          px + t1 * dx
        ),

      y:
        roundNumber(
          py + t1 * dy
        ),

      t: t1
    },

    {
      x:
        roundNumber(
          px + t2 * dx
        ),

      y:
        roundNumber(
          py + t2 * dy
        ),

      t: t2
    }
  ];
}


/**
 * 直線と円の交点から、
 * 指定条件に合う点を選択する。
 */
export function selectCircleIntersection(
  intersections,
  selector
) {
  if (!intersections.length) {
    return null;
  }

  if (
    typeof selector === 'function'
  ) {
    return selector(
      intersections
    );
  }

  if (
    selector === 'first'
  ) {
    return intersections[0];
  }

  if (
    selector === 'second'
  ) {
    return intersections[1] ?? null;
  }

  return intersections[0];
}


/* =========================================================
 * 2014年型構造
 *
 * A,B,C,D,E が同一円周上
 * AC = AD
 * CE || BD
 *
 * F = AC ∩ BD
 * G = AE ∩ BD
 *
 * という構造を座標から構築する。
 * ========================================================= */


/**
 * 2014年型の円周点を構築する。
 *
 * 重要:
 *
 * AC = AD
 *
 * を満たすには、同一円上で
 *
 *   central angle(A,C)
 * =
 *   central angle(A,D)
 *
 * とすればよい。
 *
 * したがって、
 *
 *   D = AからCと同じ円周角距離
 *
 * となるように角度を配置する。
 *
 * さらにCE || BDについては、
 * 「先にB,C,Dを決めてEを円との交点として求める」
 * 方法を取る。
 */
export function build2014Geometry(
  parameters = {}
) {
  const radius =
    Number(
      parameters.radius ??
      1
    );

  const center =
    point(
      'O',
      0,
      0,
      {
        role:
          'circle_center'
      }
    );


  /*
   * 基準角。
   *
   * 既定値は2014型の見た目に
   * なりやすい配置。
   *
   * generator側から変更可能。
   */
  const angleA =
    Number(
      parameters.angleA ??
      90
    );

  const angleB =
    Number(
      parameters.angleB ??
      264
    );

  const angleC =
    Number(
      parameters.angleC ??
      222
    );


  /*
   * A, B, C
   */
  const A =
    pointOnCircle(
      'A',
      center,
      radius,
      angleA,
      {
        role:
          'circle_point'
      }
    );

  const B =
    pointOnCircle(
      'B',
      center,
      radius,
      angleB,
      {
        role:
          'circle_point'
      }
    );

  const C =
    pointOnCircle(
      'C',
      center,
      radius,
      angleC,
      {
        role:
          'circle_point'
      }
    );


  /*
   * AC = AD
   *
   * Aを基準としてCと反対側へ
   * 同じ中心角距離を取る。
   *
   * 例えば
   *
   * A=90°
   * C=222°
   *
   * なら
   *
   * D=318°
   *
   * となる。
   */
  const deltaAC =
    normalizeSignedAngle(
      angleC - angleA
    );

  const angleD =
    normalizeAngle(
      angleA - deltaAC
    );

  const D =
    pointOnCircle(
      'D',
      center,
      radius,
      angleD,
      {
        role:
          'circle_point'
      }
    );


  /*
   * BD
   */
  const lineBD =
    createLine(
      B,
      D,
      {
        id: 'l_BD'
      }
    );


  /*
   * Cを通りBDと平行な直線
   */
  const lineCE =
    parallelThrough(
      C,
      lineBD,
      {
        id: 'l_CE'
      }
    );


  /*
   * CEと円の交点
   */
  const CEIntersections =
    intersectLineCircle(
      lineCE,
      center,
      radius
    );


  /*
   * C自身を除いた方をEとする。
   */
  const EData =
    selectOtherIntersection(
      CEIntersections,
      C,
      center,
      radius
    );


  if (!EData) {
    throw new Error(
      '2014年型: CEと円のもう一つの交点Eを構成できません。'
    );
  }


  const E =
    point(
      'E',
      EData.x,
      EData.y,
      {
        role:
          'circle_point'
      }
    );


  /*
   * AC
   */
  const lineAC =
    createLine(
      A,
      C,
      {
        id: 'l_AC'
      }
    );


  /*
   * AE
   */
  const lineAE =
    createLine(
      A,
      E,
      {
        id: 'l_AE'
      }
    );


  /*
   * F = AC ∩ BD
   */
  const FData =
    intersectLines(
      lineAC,
      lineBD
    );

  if (!FData) {
    throw new Error(
      '2014年型: F = AC∩BD を構成できません。'
    );
  }

  const F =
    point(
      'F',
      FData.x,
      FData.y,
      {
        role:
          'intersection',

        definition:
          'AC∩BD'
      }
    );


  /*
   * G = AE ∩ BD
   */
  const GData =
    intersectLines(
      lineAE,
      lineBD
    );

  if (!GData) {
    throw new Error(
      '2014年型: G = AE∩BD を構成できません。'
    );
  }

  const G =
    point(
      'G',
      GData.x,
      GData.y,
      {
        role:
          'intersection',

        definition:
          'AE∩BD'
      }
    );


  /*
   * GeometryModel
   */
  const geometry = {
    coordinate_system: {
      type:
        'exact_euclidean_model',

      primary_model:
        'unit_circle',

      radius,

      origin:
        'O=(0,0)',

      axis:
        'x right, y up'
    },


    points: new Map([
      ['O', center],
      ['A', A],
      ['B', B],
      ['C', C],
      ['D', D],
      ['E', E],
      ['F', F],
      ['G', G]
    ]),


    segments: [
      segment('AB', A, B),
      segment('AC', A, C),
      segment('AD', A, D),
      segment('AE', A, E),
      segment('BC', B, C),
      segment('BD', B, D),
      segment('CD', C, D),
      segment('CE', C, E)
    ],


    lines: [
      lineModel(
        'l_BD',
        lineBD
      ),

      lineModel(
        'l_CE',
        lineCE
      ),

      lineModel(
        'l_AE',
        lineAE
      )
    ],


    circles: [
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
    ],


    triangles: [
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
    ]
  };


  return geometry;
}


/* =========================================================
 * GeometryModel生成用ヘルパー
 * ========================================================= */

function segment(
  id,
  a,
  b,
  style = {}
) {
  return {
    id,

    start:
      a.id,

    end:
      b.id,

    a,
    b,

    style
  };
}


function lineModel(
  id,
  line,
  style = {}
) {
  return {
    id,

    through: [
      line.a.id,
      line.b.id
    ],

    a:
      line.a,

    b:
      line.b,

    style
  };
}


/**
 * signed angle
 *
 * -180〜180
 */
function normalizeSignedAngle(
  degree
) {
  let result =
    normalizeAngle(degree);

  if (result > 180) {
    result -= 360;
  }

  return result;
}


/**
 * 円との交点から、
 * 元の点ではない方を選ぶ。
 */
function selectOtherIntersection(
  intersections,
  originalPoint,
  center,
  radius
) {
  if (!intersections.length) {
    return null;
  }

  if (intersections.length === 1) {
    return intersections[0];
  }

  const distances =
    intersections.map(
      p =>
        distanceSquared(
          p,
          originalPoint
        )
    );

  if (
    distances[0] >
    distances[1]
  ) {
    return intersections[0];
  }

  return intersections[1];
}


/* =========================================================
 * 幾何検証
 * ========================================================= */

/**
 * 2本の線が平行か
 */
export function areParallel(
  line1,
  line2,
  tolerance = 1e-7
) {
  const ax =
    line1.b.x -
    line1.a.x;

  const ay =
    line1.b.y -
    line1.a.y;

  const bx =
    line2.b.x -
    line2.a.x;

  const by =
    line2.b.y -
    line2.a.y;

  return Math.abs(
    cross(
      ax,
      ay,
      bx,
      by
    )
  ) < tolerance;
}


/**
 * 2つの長さが等しいか
 */
export function equalLength(
  a,
  b,
  c,
  d,
  tolerance = 1e-7
) {
  return Math.abs(
    distance(a, b) -
    distance(c, d)
  ) < tolerance;
}


/**
 * GeometryModelを検証する。
 *
 * 2014年型の条件を
 * 「座標が正しいか」という観点から確認する。
 */
export function validate2014Geometry(
  geometry,
  options = {}
) {
  const tolerance =
    options.tolerance ??
    1e-7;

  const errors = [];
  const warnings = [];

  const points =
    geometry?.points;

  if (!(points instanceof Map)) {
    errors.push(
      'pointsがMapではありません。'
    );

    return {
      valid: false,
      errors,
      warnings
    };
  }


  const O =
    points.get('O');

  const A =
    points.get('A');

  const B =
    points.get('B');

  const C =
    points.get('C');

  const D =
    points.get('D');

  const E =
    points.get('E');

  const F =
    points.get('F');

  const G =
    points.get('G');


  /*
   * 必須点
   */
  for (
    const id of [
      'O',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G'
    ]
  ) {
    if (!points.get(id)) {
      errors.push(
        `点${id}が存在しません。`
      );
    }
  }

  if (errors.length) {
    return {
      valid: false,
      errors,
      warnings
    };
  }


  /*
   * 半径
   */
  const circle =
    geometry.circles?.find(
      c => c.id === 'O1'
    );

  if (!circle) {
    errors.push(
      '円O1がありません。'
    );
  }


  /*
   * 円周上
   */
  if (circle) {
    for (
      const id of [
        'A',
        'B',
        'C',
        'D',
        'E'
      ]
    ) {
      const p =
        points.get(id);

      if (
        !isOnCircle(
          p,
          O,
          circle.radius,
          tolerance
        )
      ) {
        errors.push(
          `${id}が円O1上にありません。`
        );
      }
    }
  }


  /*
   * AC = AD
   */
  if (
    !equalLength(
      A,
      C,
      A,
      D,
      tolerance
    )
  ) {
    errors.push(
      'AC = AD が成立していません。'
    );
  }


  /*
   * CE || BD
   */
  const lineBD =
    createLine(B, D);

  const lineCE =
    createLine(C, E);

  if (
    !areParallel(
      lineBD,
      lineCE,
      tolerance
    )
  ) {
    errors.push(
      'CE ∥ BD が成立していません。'
    );
  }


  /*
   * F = AC ∩ BD
   */
  const FExpected =
    intersectLines(
      createLine(A, C),
      createLine(B, D)
    );

  if (!FExpected) {
    errors.push(
      'ACとBDが交差していません。'
    );
  }
  else if (
    distance(
      F,
      FExpected
    ) > tolerance
  ) {
    errors.push(
      'Fの座標がAC∩BDと一致していません。'
    );
  }


  /*
   * G = AE ∩ BD
   */
  const GExpected =
    intersectLines(
      createLine(A, E),
      createLine(B, D)
    );

  if (!GExpected) {
    errors.push(
      'AEとBDが交差していません。'
    );
  }
  else if (
    distance(
      G,
      GExpected
    ) > tolerance
  ) {
    errors.push(
      'Gの座標がAE∩BDと一致していません。'
    );
  }


  /*
   * 退化チェック
   */
  if (
    distance(A, C)
    < tolerance
  ) {
    errors.push(
      'ACが退化しています。'
    );
  }

  if (
    distance(A, D)
    < tolerance
  ) {
    errors.push(
      'ADが退化しています。'
    );
  }

  if (
    distance(B, D)
    < tolerance
  ) {
    errors.push(
      'BDが退化しています。'
    );
  }


  /*
   * 警告
   */
  if (
    Math.abs(
      distance(F, B)
    ) < tolerance ||
    Math.abs(
      distance(F, D)
    ) < tolerance
  ) {
    warnings.push(
      'FがBDの端点付近にあります。'
    );
  }

  if (
    Math.abs(
      distance(G, B)
    ) < tolerance ||
    Math.abs(
      distance(G, D)
    ) < tolerance
  ) {
    warnings.push(
      'GがBDの端点付近にあります。'
    );
  }


  return {
    valid:
      errors.length === 0,

    errors,

    warnings
  };
}


/* =========================================================
 * 汎用エントリポイント
 * ========================================================= */

/**
 * テンプレート名から幾何図形を生成。
 *
 * 今後:
 *
 *   CIRCLE_DIAMETER_AA
 *   CIRCLE_ISOSCELES_AA
 *   ...
 *
 * を追加できる。
 */
export function solveGeometry(
  templateId,
  parameters = {}
) {
  switch (templateId) {

    case
      'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001':
    case
      'CIRCLE_ISOSCELES_PARALLEL_ASA':

      return build2014Geometry(
        parameters
      );


    default:
      throw new Error(
        `未知のgeometry templateです: ${templateId}`
      );
  }
}


/**
 * 生成 + 検証。
 *
 * problem_generator.jsからは
 * 基本的にこれを呼ぶ。
 */
export function generateGeometry(
  templateId,
  parameters = {}
) {
  const geometry =
    solveGeometry(
      templateId,
      parameters
    );

  const validation =
    templateId.includes(
      'ISOSCELES_PARALLEL_ASA'
    )
      ? validate2014Geometry(
          geometry
        )
      : {
          valid: true,
          errors: [],
          warnings: []
        };


  if (!validation.valid) {
    const message =
      [
        `生成した図形が不正です。`,
        ...validation.errors
      ].join('\n');

    throw new Error(message);
  }


  geometry.constraints =
    validation;

  return geometry;
}


/* =========================================================
 * JSON geometry形式への変換
 * ========================================================= */

/**
 * GeometryModelを、
 * JSONへ保存しやすい形式へ変換。
 *
 * MapはJSON.stringifyできないため、
 * pointsをObjectへ変換する。
 */
export function geometryToJSON(
  geometry
) {
  if (!geometry) {
    return null;
  }

  const points = {};

  for (
    const [id, p]
    of geometry.points
  ) {
    points[id] = {
      x:
        roundNumber(p.x),

      y:
        roundNumber(p.y),

      exact: [
        String(
          roundNumber(p.x)
        ),
        String(
          roundNumber(p.y)
        )
      ],

      role:
        p.role ??
        'point',

      ...(p.label
        ? {
            label: p.label
          }
        : {})
    };
  }


  return {
    coordinate_system:
      geometry.coordinate_system,

    points,

    segments:
      geometry.segments.map(
        s => ({
          id: s.id,
          from:
            s.start,
          to:
            s.end
        })
      ),

    lines:
      geometry.lines.map(
        line => ({
          id: line.id,

          through:
            line.through
        })
      ),

    circles:
      geometry.circles.map(
        circle => ({
          ...circle
        })
      ),

    triangles:
      geometry.triangles ??
      [],

    constraints:
      geometry.constraints ??
      {
        valid: true,
        errors: [],
        warnings: []
      }
  };
}
