/**
 * geometry_solver.js
 *
 * JSONに記述された幾何条件から、
 * Drawerがそのまま描画できるGeometryModelを構築する。
 *
 * 役割:
 *
 * JSON
 *   ↓
 * 座標・点・線・円を解決
 *   ↓
 * GeometryModel
 *   ↓
 * Drawer
 *
 * 重要:
 * - JSONに保存されたexactな座標式は保持する
 * - 描画時に使用するx/yだけ数値化する
 * - 線分・直線の端点はPointオブジェクトとして解決する
 * - 円の半径は中心と通過点から計算する
 */

export function buildGeometryModel(
  geometry,
  generation = {},
  metadata = {}
) {

  if (!geometry) {
    throw new Error(
      'geometry_solver: geometry がありません。'
    );
  }

  /*
   * geometry.objects が存在する場合は
   * JSONからGeometryModelを構築する。
   */
  if (
    geometry.objects &&
    Array.isArray(geometry.objects.points)
  ) {

    return buildExplicitGeometry(
      geometry,
      generation,
      metadata
    );
  }

  /*
   * objects が存在しない場合は、
   * generation情報などから簡易Geometryを生成する。
   */
  return buildGeneratedGeometry(
    geometry,
    generation,
    metadata
  );
}


/* =========================================================
 * Explicit Geometry
 * ======================================================= */

/**
 * JSONに明示されたGeometryから構築する。
 */
function buildExplicitGeometry(
  geometry,
  generation,
  metadata
) {

  const points =
    buildPointsFromCoordinates(
      geometry
    );

  const segments =
    buildSegments(
      geometry,
      points
    );

  const lines =
    buildLines(
      geometry,
      points
    );

  const circles =
    buildCircles(
      geometry,
      points
    );

  const triangles =
    buildTriangles(
      geometry,
      points
    );

  const constraints =
    validateGeometry(
      geometry,
      points
    );

  return {

    type: 'GeometryModel',

    metadata: {
      ...metadata
    },

    source:
      geometry,

    points,

    segments,

    lines,

    circles,

    triangles,

    constraints
  };
}


/* =========================================================
 * Points
 * ======================================================= */

/**
 * geometry.objects.points
 *
 * ↓
 *
 * Map<string, Point>
 */
function buildPointsFromCoordinates(
  geometry
) {

  const result =
    new Map();

  const pointDefinitions =
    geometry.objects?.points ?? [];

  for (
    const definition
    of pointDefinitions
  ) {

    const id =
      definition.id;

    if (!id) {
      continue;
    }

    /*
     * coordinate_ref:
     *
     * geometry.coordinates.points.A
     */
    const coordinate =
      resolvePath(
        geometry,
        definition.coordinate_ref
      );

    if (!coordinate) {

      console.warn(
        `geometry_solver: 点 ${id} の座標が見つかりません。`,
        definition.coordinate_ref
      );

      continue;
    }

    const x =
      evaluateCoordinate(
        coordinate.x
      );

    const y =
      evaluateCoordinate(
        coordinate.y
      );

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {

      console.warn(
        `geometry_solver: 点 ${id} の座標を数値化できません。`,
        coordinate
      );

      continue;
    }

    const point = {

      id,

      /*
       * Drawerが使用する数値座標
       */
      x,
      y,

      /*
       * JSONに書かれているexact表現
       */
      exact:
        coordinate.exact ?? null,

      /*
       * 数学的な意味
       */
      role:
        definition.role ??
        coordinate.role ??
        null,

      definition:
        coordinate.definition ??
        null,

      /*
       * 元の座標情報も保持
       */
      coordinate: {
        x:
          coordinate.x,

        y:
          coordinate.y
      }
    };

    /*
     * labelがJSONに存在する場合は保持。
     */
    if (
      definition.label !== undefined
    ) {

      point.label =
        definition.label;
    }

    /*
     * ラベル位置
     */
    if (
      definition.label_offset
    ) {

      point.label_offset =
        definition.label_offset;
    }

    /*
     * style
     */
    if (
      definition.style
    ) {

      point.style =
        definition.style;
    }

    result.set(
      id,
      point
    );
  }

  /*
   * objects.pointsに記載されていない点が
   * coordinates.pointsに存在する場合も追加する。
   *
   * 2014年のF/Gなど、
   * geometry.coordinates側には存在するが
   * objects.pointsの定義状況によっては
   * 抜ける可能性があるため。
   */
  const coordinatePoints =
    geometry.coordinates?.points;

  if (
    coordinatePoints &&
    typeof coordinatePoints === 'object'
  ) {

    for (
      const [id, coordinate]
      of Object.entries(
        coordinatePoints
      )
    ) {

      if (
        result.has(id)
      ) {
        continue;
      }

      const x =
        evaluateCoordinate(
          coordinate.x
        );

      const y =
        evaluateCoordinate(
          coordinate.y
        );

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        continue;
      }

      result.set(
        id,
        {
          id,

          x,
          y,

          exact:
            coordinate.exact ?? null,

          role:
            coordinate.role ??
            null,

          definition:
            coordinate.definition ??
            null,

          coordinate: {
            x:
              coordinate.x,

            y:
              coordinate.y
          }
        }
      );
    }
  }

  return result;
}


/* =========================================================
 * Segments
 * ======================================================= */

/**
 * 線分を構築する。
 *
 * JSON:
 *
 * {
 *   "id": "AB",
 *   "from": "A",
 *   "to": "B"
 * }
 *
 * ↓
 *
 * {
 *   id: "AB",
 *   a: Point(A),
 *   b: Point(B),
 *   start: Point(A),
 *   end: Point(B)
 * }
 */
function buildSegments(
  geometry,
  points
) {

  const result = [];

  const definitions =
    geometry.objects?.segments ?? [];

  for (
    const segment
    of definitions
  ) {

    const a =
      resolvePoint(
        points,
        segment.from ??
        segment.start ??
        segment.a
      );

    const b =
      resolvePoint(
        points,
        segment.to ??
        segment.end ??
        segment.b
      );

    if (!a || !b) {

      console.warn(
        `geometry_solver: 線分 ${segment.id} の端点を解決できません。`,
        segment
      );

      continue;
    }

    result.push({

      id:
        segment.id,

      /*
       * Drawer用
       */
      a,
      b,

      /*
       * 互換性用
       */
      start:
        a,

      end:
        b,

      /*
       * 元データ
       */
      source:
        segment
    });
  }

  return result;
}


/* =========================================================
 * Lines
 * ======================================================= */

/**
 * 無限直線を構築する。
 *
 * JSON:
 *
 * {
 *   "id": "l_BD",
 *   "through": ["B", "D"]
 * }
 */
function buildLines(
  geometry,
  points
) {

  const result = [];

  const definitions =
    geometry.objects?.lines ?? [];

  for (
    const line
    of definitions
  ) {

    const through =
      Array.isArray(
        line.through
      )
        ? line.through
        : [];

    const a =
      resolvePoint(
        points,
        line.a ??
        line.start ??
        through[0]
      );

    const b =
      resolvePoint(
        points,
        line.b ??
        line.end ??
        through[1]
      );

    if (!a || !b) {

      console.warn(
        `geometry_solver: 直線 ${line.id} の端点を解決できません。`,
        line
      );

      continue;
    }

    result.push({

      id:
        line.id,

      /*
       * Drawer用
       */
      a,
      b,

      /*
       * 互換性用
       */
      start:
        a,

      end:
        b,

      /*
       * 元のthrough情報
       */
      through: [
        a,
        b
      ],

      /*
       * 元データ
       */
      source:
        line
    });
  }

  return result;
}


/* =========================================================
 * Circles
 * ======================================================= */

/**
 * 円を構築する。
 *
 * JSON:
 *
 * {
 *   "id": "O1",
 *   "center": "O",
 *   "through_points": ["A","B","C"]
 * }
 *
 * 円の半径がJSONに存在しない場合、
 * center → through_points[0]
 * から計算する。
 */
function buildCircles(
  geometry,
  points
) {

  const result = [];

  const definitions =
    geometry.objects?.circles ?? [];

  for (
    const circle
    of definitions
  ) {

    const center =
      resolvePoint(
        points,
        circle.center
      );

    if (!center) {

      console.warn(
        `geometry_solver: 円 ${circle.id} の中心を解決できません。`,
        circle
      );

      continue;
    }

    const throughIds =
      Array.isArray(
        circle.through_points
      )
        ? circle.through_points
        : [];

    const through =
      throughIds
        .map(
          id =>
            resolvePoint(
              points,
              id
            )
        )
        .filter(Boolean);

    /*
     * JSONにradiusが直接書かれている場合は
     * それを優先。
     */
    let radius =
      evaluateCoordinate(
        circle.radius
      );

    /*
     * radiusがない場合、
     * 最初の通過点から計算。
     */
    if (
      !Number.isFinite(radius) &&
      through.length > 0
    ) {

      radius =
        distance(
          center,
          through[0]
        );
    }

    if (
      !Number.isFinite(radius)
    ) {

      console.warn(
        `geometry_solver: 円 ${circle.id} の半径を計算できません。`,
        circle
      );

      continue;
    }

    result.push({

      id:
        circle.id,

      center:
        center.id,

      /*
       * Drawerが使用
       */
      radius,

      /*
       * 通過点
       */
      through:

        through.map(
          point =>
            point.id
        ),

      throughPoints:
        through,

      /*
       * 元データ
       */
      source:
        circle
    });
  }

  return result;
}


/* =========================================================
 * Triangles
 * ======================================================= */

function buildTriangles(
  geometry,
  points
) {

  const result = [];

  const definitions =
    geometry.objects?.triangles ?? [];

  for (
    const triangle
    of definitions
  ) {

    const vertices =
      Array.isArray(
        triangle.vertices
      )
        ? triangle.vertices
            .map(
              id =>
                resolvePoint(
                  points,
                  id
                )
            )
            .filter(Boolean)
        : [];

    result.push({

      id:
        triangle.id,

      vertices,

      properties:
        triangle.properties ?? [],

      source:
        triangle
    });
  }

  return result;
}


/* =========================================================
 * Point Resolver
 * ======================================================= */

function resolvePoint(
  points,
  value
) {

  if (!value) {
    return null;
  }

  /*
   * すでにPointオブジェクトなら
   * そのまま返す。
   */
  if (
    typeof value === 'object' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  ) {

    return value;
  }

  /*
   * IDならMapから取得。
   */
  if (
    typeof value === 'string'
  ) {

    return points.get(value) ?? null;
  }

  return null;
}


/* =========================================================
 * Path Resolver
 * ======================================================= */

/**
 * "geometry.coordinates.points.A"
 *
 * のようなパスを解決する。
 */
function resolvePath(
  root,
  path
) {

  if (
    !root ||
    !path
  ) {
    return null;
  }

  if (
    typeof path !== 'string'
  ) {
    return null;
  }

  const normalized =
    path
      .replace(
        /^geometry\./,
        ''
      );

  const parts =
    normalized.split('.');

  let current =
    root;

  /*
   * geometryから始まる場合。
   */
  if (
    parts[0] === 'geometry'
  ) {

    parts.shift();
  }

  for (
    const part
    of parts
  ) {

    if (
      current === null ||
      current === undefined
    ) {
      return null;
    }

    current =
      current[part];
  }

  return current ?? null;
}


/* =========================================================
 * Coordinate Evaluation
 * ======================================================= */

/**
 * 座標式を数値化する。
 *
 * 対応:
 *
 * 0
 * "0"
 * "cos(38°)"
 * "-cos(38°)"
 * "sin(38°)"
 * "-sin(38°)"
 * "sqrt(2)"
 */
function evaluateCoordinate(
  expression
) {

  if (
    expression === null ||
    expression === undefined
  ) {

    return NaN;
  }

  if (
    typeof expression === 'number'
  ) {

    return expression;
  }

  if (
    typeof expression !== 'string'
  ) {

    return NaN;
  }

  const value =
    expression.trim();

  if (!value) {
    return NaN;
  }

  /*
   * 通常の数値
   */
  const numeric =
    Number(value);

  if (
    Number.isFinite(numeric)
  ) {

    return numeric;
  }

  /*
   * cos(38°)
   */
  const cosMatch =
    value.match(
      /^(-?)cos\(\s*([-+]?\d+(?:\.\d+)?)°\s*\)$/
    );

  if (cosMatch) {

    const sign =
      cosMatch[1] === '-'
        ? -1
        : 1;

    const angle =
      Number(
        cosMatch[2]
      );

    return (
      sign *
      Math.cos(
        angle *
        Math.PI /
        180
      )
    );
  }

  /*
   * sin(38°)
   */
  const sinMatch =
    value.match(
      /^(-?)sin\(\s*([-+]?\d+(?:\.\d+)?)°\s*\)$/
    );

  if (sinMatch) {

    const sign =
      sinMatch[1] === '-'
        ? -1
        : 1;

    const angle =
      Number(
        sinMatch[2]
      );

    return (
      sign *
      Math.sin(
        angle *
        Math.PI /
        180
      )
    );
  }

  /*
   * sqrt(number)
   */
  const sqrtMatch =
    value.match(
      /^sqrt\(\s*([-+]?\d+(?:\.\d+)?)\s*\)$/
    );

  if (sqrtMatch) {

    return Math.sqrt(
      Number(
        sqrtMatch[1]
      )
    );
  }

  /*
   * π
   */
  if (
    value === 'π' ||
    value === 'pi'
  ) {

    return Math.PI;
  }

  /*
   * kπ のような簡単な表現
   */
  const piMatch =
    value.match(
      /^([-+]?\d+(?:\.\d+)?)\s*(?:π|pi)$/
    );

  if (piMatch) {

    return (
      Number(
        piMatch[1]
      ) *
      Math.PI
    );
  }

  console.warn(
    `geometry_solver: 未対応の座標式です: ${expression}`
  );

  return NaN;
}


/* =========================================================
 * Geometry Utilities
 * ======================================================= */

function distance(
  a,
  b
) {

  if (!a || !b) {
    return NaN;
  }

  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}


/* =========================================================
 * Validation
 * ======================================================= */

function validateGeometry(
  geometry,
  points
) {

  const errors = [];

  const warnings = [];

  /*
   * 線分の検証
   */
  for (
    const segment
    of geometry.objects?.segments ?? []
  ) {

    const a =
      segment.from ??
      segment.start ??
      segment.a;

    const b =
      segment.to ??
      segment.end ??
      segment.b;

    if (
      !points.has(a)
    ) {

      errors.push(
        `線分 ${segment.id}: 点 ${a} が存在しません。`
      );
    }

    if (
      !points.has(b)
    ) {

      errors.push(
        `線分 ${segment.id}: 点 ${b} が存在しません。`
      );
    }
  }

  /*
   * 直線の検証
   */
  for (
    const line
    of geometry.objects?.lines ?? []
  ) {

    const through =
      line.through ?? [];

    if (
      through.length < 2
    ) {

      errors.push(
        `直線 ${line.id}: through が2点未満です。`
      );

      continue;
    }

    if (
      !points.has(
        through[0]
      )
    ) {

      errors.push(
        `直線 ${line.id}: 点 ${through[0]} が存在しません。`
      );
    }

    if (
      !points.has(
        through[1]
      )
    ) {

      errors.push(
        `直線 ${line.id}: 点 ${through[1]} が存在しません。`
      );
    }
  }

  /*
   * 円の検証
   */
  for (
    const circle
    of geometry.objects?.circles ?? []
  ) {

    if (
      !points.has(
        circle.center
      )
    ) {

      errors.push(
        `円 ${circle.id}: 中心 ${circle.center} が存在しません。`
      );
    }

    for (
      const point
      of circle.through_points ?? []
    ) {

      if (
        !points.has(point)
      ) {

        errors.push(
          `円 ${circle.id}: 通過点 ${point} が存在しません。`
        );
      }
    }
  }

  /*
   * 座標点数
   */
  if (
    points.size === 0
  ) {

    errors.push(
      '座標点が1つもありません。'
    );
  }

  /*
   * incidence情報
   */
  if (
    !Array.isArray(
      geometry.incidence
    )
  ) {

    warnings.push(
      'incidence情報がありません。'
    );
  }

  /*
   * intersections情報
   */
  if (
    !Array.isArray(
      geometry.intersections
    )
  ) {

    warnings.push(
      'intersections情報がありません。'
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
 * Generated Geometry
 * ======================================================= */

/**
 * JSONに明示的な座標モデルがない場合の
 * フォールバック。
 *
 * 現段階では「過去問復元」が主目的なので、
 * 将来的にはここを
 *
 * generateGeometry()
 *
 * として発展させる。
 */
function buildGeneratedGeometry(
  geometry,
  generation,
  metadata
) {

  /*
   * 2014年の簡易フォールバック
   */
  if (
    metadata.year === 2014
  ) {

    return generate2014Fallback(
      geometry,
      generation,
      metadata
    );
  }

  /*
   * 2015年の簡易フォールバック
   */
  if (
    metadata.year === 2015
  ) {

    return generate2015Fallback(
      geometry,
      generation,
      metadata
    );
  }

  /*
   * 最低限の空Geometry
   */
  return {

    type: 'GeometryModel',

    metadata: {
      ...metadata
    },

    source:
      geometry,

    points:
      new Map(),

    segments: [],

    lines: [],

    circles: [],

    triangles: [],

    constraints: {
      valid: true,
      errors: [],
      warnings: [
        '明示的な座標モデルがないため、Geometryを生成できませんでした。'
      ]
    }
  };
}


/* =========================================================
 * 2014 Fallback
 * ======================================================= */

function generate2014Fallback(
  geometry,
  generation,
  metadata
) {

  /*
   * 正規化された単位円モデル。
   *
   * 実際の2014年JSONに座標が存在する場合は
   * buildExplicitGeometry()が使用されるため、
   * 通常ここには来ない。
   */

  const points =
    new Map();

  const definitions = {

    O: [0, 0],

    A: [0, 1],

    B: [
      -Math.cos(
        6 *
        Math.PI /
        180
      ),
      -Math.sin(
        6 *
        Math.PI /
        180
      )
    ],

    C: [
      -Math.cos(
        38 *
        Math.PI /
        180
      ),
      -Math.sin(
        38 *
        Math.PI /
        180
      )
    ],

    D: [
      Math.cos(
        38 *
        Math.PI /
        180
      ),
      -Math.sin(
        38 *
        Math.PI /
        180
      )
    ],

    E: [
      Math.cos(
        70 *
        Math.PI /
        180
      ),
      -Math.sin(
        70 *
        Math.PI /
        180
      )
    ]
  };

  for (
    const [id, coordinate]
    of Object.entries(
      definitions
    )
  ) {

    points.set(
      id,
      {
        id,
        x: coordinate[0],
        y: coordinate[1]
      }
    );
  }

  /*
   * F = AC ∩ BD
   * G = AE ∩ BD
   */
  const F =
    lineIntersection(
      points.get('A'),
      points.get('C'),
      points.get('B'),
      points.get('D')
    );

  const G =
    lineIntersection(
      points.get('A'),
      points.get('E'),
      points.get('B'),
      points.get('D')
    );

  if (F) {

    points.set(
      'F',
      {
        id: 'F',
        x: F.x,
        y: F.y,
        role: 'intersection',
        definition: 'AC∩BD'
      }
    );
  }

  if (G) {

    points.set(
      'G',
      {
        id: 'G',
        x: G.x,
        y: G.y,
        role: 'intersection',
        definition: 'AE∩BD'
      }
    );
  }

  const segments =
    makeSegments(
      [
        ['AB', 'A', 'B'],
        ['AC', 'A', 'C'],
        ['AD', 'A', 'D'],
        ['AE', 'A', 'E'],
        ['BC', 'B', 'C'],
        ['BD', 'B', 'D'],
        ['CD', 'C', 'D'],
        ['CE', 'C', 'E']
      ],
      points
    );

  const lines =
    makeLines(
      [
        ['l_BD', 'B', 'D'],
        ['l_CE', 'C', 'E'],
        ['l_AE', 'A', 'E']
      ],
      points
    );

  return {

    type: 'GeometryModel',

    metadata: {
      ...metadata
    },

    source:
      geometry,

    points,

    segments,

    lines,

    circles: [
      {
        id: 'O1',
        center: 'O',
        radius: 1,
        through: [
          'A',
          'B',
          'C',
          'D',
          'E'
        ]
      }
    ],

    triangles: [],

    constraints: {
      valid: true,
      errors: [],
      warnings: []
    }
  };
}


/* =========================================================
 * 2015 Fallback
 * ======================================================= */

function generate2015Fallback(
  geometry,
  generation,
  metadata
) {

  /*
   * 2015年については
   * 実座標モデルが追加された時点で
   * Explicit Geometryへ移行する。
   */

  return {

    type: 'GeometryModel',

    metadata: {
      ...metadata
    },

    source:
      geometry,

    points:
      new Map(),

    segments: [],

    lines: [],

    circles: [],

    triangles: [],

    constraints: {

      valid: true,

      errors: [],

      warnings: [
        '2015年の座標モデルが未設定です。'
      ]
    }
  };
}


/* =========================================================
 * Helper: makeSegments
 * ======================================================= */

function makeSegments(
  definitions,
  points
) {

  const result = [];

  for (
    const [
      id,
      aId,
      bId
    ]
    of definitions
  ) {

    const a =
      points.get(aId);

    const b =
      points.get(bId);

    if (!a || !b) {
      continue;
    }

    result.push({

      id,

      a,

      b,

      start:
        a,

      end:
        b
    });
  }

  return result;
}


/* =========================================================
 * Helper: makeLines
 * ======================================================= */

function makeLines(
  definitions,
  points
) {

  const result = [];

  for (
    const [
      id,
      aId,
      bId
    ]
    of definitions
  ) {

    const a =
      points.get(aId);

    const b =
      points.get(bId);

    if (!a || !b) {
      continue;
    }

    result.push({

      id,

      a,

      b,

      start:
        a,

      end:
        b,

      through: [
        a,
        b
      ]
    });
  }

  return result;
}


/* =========================================================
 * Line Intersection
 * ======================================================= */

function lineIntersection(
  a,
  b,
  c,
  d
) {

  if (
    !a ||
    !b ||
    !c ||
    !d
  ) {

    return null;
  }

  const x1 = a.x;
  const y1 = a.y;

  const x2 = b.x;
  const y2 = b.y;

  const x3 = c.x;
  const y3 = c.y;

  const x4 = d.x;
  const y4 = d.y;

  const denominator =
    (
      x1 - x2
    ) *
    (
      y3 - y4
    ) -
    (
      y1 - y2
    ) *
    (
      x3 - x4
    );

  if (
    Math.abs(
      denominator
    ) < 1e-12
  ) {

    return null;
  }

  const px =
    (
      (
        x1 * y2 -
        y1 * x2
      ) *
      (
        x3 - x4
      ) -
      (
        x1 - x2
      ) *
      (
        x3 * y4 -
        y3 * x4
      )
    ) /
    denominator;

  const py =
    (
      (
        x1 * y2 -
        y1 * x2
      ) *
      (
        y3 - y4
      ) -
      (
        y1 - y2
      ) *
      (
        x3 * y4 -
        y3 * x4
      )
    ) /
    denominator;

  return {
    x: px,
    y: py
  };
}
