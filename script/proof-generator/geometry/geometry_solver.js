/**
 * Geometry Solver
 *
 * JSONに記述された構成条件から、描画用の2次元座標を再構成する。
 *
 * 重要:
 * - drawer.js は幾何学を解かない。
 * - このモジュールは「入試図形として成立する代表座標」を作る。
 * - exact_coordinates が将来追加された場合は、それを最優先する。
 */

const EPS = 1e-9;

export function buildGeometryModel(geometry, generation = {}, metadata = {}) {
  const exact = geometry?.coordinate_system?.exact_coordinates;

  if (exact && typeof exact === "object") {
    return buildFromExactCoordinates(geometry, exact);
  }

  const templateId = generation?.template_id ?? "";

  if (templateId.includes("DIAMETER_ISOSCELES_AA")) {
    return build2015DiameterIsosceles(geometry);
  }

  if (templateId.includes("CIRCLE_ISOSCELES_PARALLEL_ASA")) {
    return build2014CircleIsoscelesParallel(geometry);
  }

  // 年度・template_idがまだ登録されていない場合も、
  // 最低限の構造だけは復元する。
  return buildGenericSchematic(geometry, metadata);
}

function buildFromExactCoordinates(geometry, exact) {
  const points = new Map();

  for (const point of geometry?.objects?.points ?? []) {
    const value = exact[point.id];
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) {
      points.set(point.id, { x: value.x, y: value.y });
    }
  }

  return finalizeModel(geometry, points, "exact");
}

/**
 * 2015:
 *
 * BCを円の直径とする。
 * DをBC上に置く。
 * BA=BD を満たすAを円周上に作る。
 * ADに平行な直線をCから引き、円との交点をEとする。
 * BEとADの交点F、BEとACの交点G、
 * ADと円のもう一つの交点Hを作る。
 */
function build2015DiameterIsosceles(geometry) {
  const R = 1;
  const O = { x: 0, y: 0 };
  const B = { x: -R, y: 0 };
  const C = { x: R, y: 0 };

  // Dを直径上の内部に置く。
  // 固定値ではなく正規化された代表値。
  const d = -0.22 * R;
  const D = { x: d, y: 0 };

  // BA = BD。
  // Aは「中心O・半径R」の円と
  // 「中心B・半径BD」の円の交点。
  const BD = distance(B, D);
  const ACandidates = circleCircleIntersections(O, R, B, BD);

  // 上側を採用。図が上下反転しないための決定規則。
  const A = ACandidates
    .filter(p => p.y > 0)
    .sort((p, q) => q.y - p.y)[0];

  if (!A) {
    throw new Error("2015 geometry: A の構成に失敗しました。");
  }

  const ad = sub(D, A);

  // Cを通りADに平行な直線と円の交点。
  const eCandidates = lineCircleIntersections(C, ad, O, R);
  const E = eCandidates
    .filter(p => distance(p, C) > EPS)
    .sort((p, q) => distance(q, C) - distance(p, C))[0];

  if (!E) {
    throw new Error("2015 geometry: E の構成に失敗しました。");
  }

  // F = BE ∩ AD
  const F = lineLineIntersection(B, sub(E, B), A, ad);

  // G = BE ∩ AC
  const G = lineLineIntersection(B, sub(E, B), A, sub(C, A));

  // H = AD と円のもう一つの交点
  const hCandidates = lineCircleIntersections(A, ad, O, R);
  const H = hCandidates
    .filter(p => distance(p, A) > EPS)
    .sort((p, q) => distance(q, A) - distance(p, A))[0];

  const points = new Map([
    ["O", O],
    ["A", A],
    ["B", B],
    ["C", C],
    ["D", D],
    ["E", E],
    ["F", F],
    ["G", G],
    ["H", H]
  ]);

  return finalizeModel(geometry, points, "generated-2015");
}

/**
 * 2014:
 *
 * 円周上にA,B,C,Dを置き、AC=ADを保証する。
 * BDを引き、Cを通ってBDに平行な直線を引く。
 * その円とのもう一つの交点をEとする。
 * F=AC∩BD、G=AE∩BD。
 *
 * Aを基準にC,Dを対称位置にすることでAC=ADを厳密に満たす。
 */
function build2014CircleIsoscelesParallel(geometry) {
  const R = 1;
  const O = { x: 0, y: 0 };

  const A = polar(R, -90);
  const C = polar(R, 150);
  const D = polar(R, 30);

  // BDの位置によって図が極端にならないように選ぶ。
  const B = polar(R, 240);

  const bd = sub(D, B);

  // Cを通りBDに平行な直線と円の交点E。
  const eCandidates = lineCircleIntersections(C, bd, O, R);
  const E = eCandidates
    .filter(p => distance(p, C) > EPS)
    .sort((p, q) => distance(q, C) - distance(p, C))[0];

  if (!E) {
    throw new Error("2014 geometry: E の構成に失敗しました。");
  }

  const F = lineLineIntersection(A, sub(C, A), B, bd);
  const G = lineLineIntersection(A, sub(E, A), B, bd);

  const points = new Map([
    ["O", O],
    ["A", A],
    ["B", B],
    ["C", C],
    ["D", D],
    ["E", E],
    ["F", F],
    ["G", G]
  ]);

  return finalizeModel(geometry, points, "generated-2014");
}

function buildGenericSchematic(geometry, metadata) {
  const points = new Map();
  const list = geometry?.objects?.points ?? [];

  // 円がある場合はまず円を作る。
  const circle = geometry?.objects?.circles?.[0];
  const radius = 1;

  if (circle?.center) {
    points.set(circle.center, { x: 0, y: 0 });
  }

  const circlePointIds = list
    .filter(p => p.role === "circle_point")
    .map(p => p.id);

  circlePointIds.forEach((id, i) => {
    const angle = -90 + i * (360 / Math.max(circlePointIds.length, 1));
    points.set(id, polar(radius, angle));
  });

  // 残りの点は単純な交点近似ではなく、既知点の平均付近へ置く。
  // 新テンプレート追加時には専用solverへ移す。
  for (const point of list) {
    if (points.has(point.id)) continue;
    const known = [...points.values()];
    const base = known.length ? centroid(known) : { x: 0, y: 0 };
    points.set(point.id, {
      x: base.x + 0.15 * Math.cos(points.size),
      y: base.y + 0.15 * Math.sin(points.size)
    });
  }

  return finalizeModel(geometry, points, "generic");
}

function finalizeModel(geometry, points, source) {
  const circles = (geometry?.objects?.circles ?? []).map(circle => {
    const center = points.get(circle.center);
    let radius = 1;

    const candidates = (circle.through_points ?? [])
      .map(id => points.get(id))
      .filter(Boolean);

    if (center && candidates.length) {
      radius = average(
        candidates.map(p => distance(center, p))
      );
    }

    return {
      id: circle.id,
      center: circle.center,
      radius
    };
  });

  const segments = (geometry?.objects?.segments ?? []).map(s => ({
    id: s.id,
    from: s.from,
    to: s.to
  }));

  const lines = (geometry?.objects?.lines ?? []).map(line => ({
    id: line.id,
    through: line.through
  }));

  const constraints = validateGeometry(geometry, points, circles);

  return {
    source,
    points,
    segments,
    lines,
    circles,
    constraints
  };
}

/* ---------- geometry primitives ---------- */

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(values) {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

function centroid(points) {
  return {
    x: average(points.map(p => p.x)),
    y: average(points.map(p => p.y))
  };
}

function polar(r, deg) {
  const rad = deg * Math.PI / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function lineLineIntersection(p, v, q, w) {
  const det = cross(v, w);

  if (Math.abs(det) < EPS) return null;

  const t = cross(sub(q, p), w) / det;
  return add(p, scale(v, t));
}

function lineCircleIntersections(p, v, center, radius) {
  const a = dot(v, v);

  if (a < EPS) return [];

  const m = sub(p, center);
  const b = 2 * dot(m, v);
  const c = dot(m, m) - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < -EPS) return [];

  const d = Math.sqrt(Math.max(0, discriminant));

  const t1 = (-b - d) / (2 * a);
  const t2 = (-b + d) / (2 * a);

  return [
    add(p, scale(v, t1)),
    add(p, scale(v, t2))
  ];
}

function circleCircleIntersections(c0, r0, c1, r1) {
  const d = distance(c0, c1);

  if (
    d < EPS ||
    d > r0 + r1 + EPS ||
    d < Math.abs(r0 - r1) - EPS
  ) {
    return [];
  }

  const ex = (c1.x - c0.x) / d;
  const ey = (c1.y - c0.y) / d;

  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;

  if (h2 < -EPS) return [];

  const h = Math.sqrt(Math.max(0, h2));
  const base = {
    x: c0.x + a * ex,
    y: c0.y + a * ey
  };

  return [
    { x: base.x - h * ey, y: base.y + h * ex },
    { x: base.x + h * ey, y: base.y - h * ex }
  ];
}

/* ---------- validation ---------- */

function validateGeometry(geometry, points, circles) {
  const errors = [];
  const warnings = [];

  for (const rel of geometry?.relationships ?? []) {
    if (rel.type === "equal_length") {
      const [s1, s2] = rel.objects ?? [];
      const a = segmentEndpoints(s1, geometry, points);
      const b = segmentEndpoints(s2, geometry, points);

      if (a && b) {
        const l1 = distance(a[0], a[1]);
        const l2 = distance(b[0], b[1]);

        if (Math.abs(l1 - l2) > 1e-7) {
          errors.push(`${s1}=${s2} を満たしていません。`);
        }
      }
    }

    if (rel.type === "parallel") {
      const [s1, s2] = rel.objects ?? [];
      const a = segmentEndpoints(s1, geometry, points);
      const b = segmentEndpoints(s2, geometry, points);

      if (a && b) {
        const va = sub(a[1], a[0]);
        const vb = sub(b[1], b[0]);

        const norm = Math.hypot(va.x, va.y) * Math.hypot(vb.x, vb.y);
        if (norm > EPS && Math.abs(cross(va, vb)) / norm > 1e-7) {
          errors.push(`${s1}∥${s2} を満たしていません。`);
        }
      }
    }

    if (rel.type === "concyclic") {
      const circle = circles[0];
      if (!circle) continue;

      const center = points.get(circle.center);
      if (!center) continue;

      for (const id of rel.objects ?? []) {
        const p = points.get(id);
        if (!p) continue;

        if (Math.abs(distance(center, p) - circle.radius) > 1e-7) {
          errors.push(`${id} が円周上にありません。`);
        }
      }
    }
  }

  for (const intersection of geometry?.intersections ?? []) {
    const result = points.get(intersection.result);
    if (!result) continue;

    const [left, right] = intersection.lines ?? [];
    const l1 = findLine(left, geometry);
    const l2 = findLine(right, geometry);

    if (l1 && l2) {
      const p1 = points.get(l1.through[0]);
      const p2 = points.get(l1.through[1]);
      const q1 = points.get(l2.through[0]);
      const q2 = points.get(l2.through[1]);

      if (p1 && p2 && q1 && q2) {
        const e1 = distancePointToLine(result, p1, p2);
        const e2 = distancePointToLine(result, q1, q2);

        if (e1 > 1e-7 || e2 > 1e-7) {
          warnings.push(`${intersection.result} の交点条件を確認してください。`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function segmentEndpoints(id, geometry, points) {
  const segment = (geometry?.objects?.segments ?? []).find(s => s.id === id);
  if (segment) {
    const a = points.get(segment.from);
    const b = points.get(segment.to);
    return a && b ? [a, b] : null;
  }

  // 「BD」のような暗黙の線分表現も許容。
  if (typeof id === "string" && id.length === 2) {
    const a = points.get(id[0]);
    const b = points.get(id[1]);
    return a && b ? [a, b] : null;
  }

  return null;
}

function findLine(id, geometry) {
  return (geometry?.objects?.lines ?? []).find(l =>
    l.id === id || l.id === `l_${id}`
  ) ?? null;
}

function distancePointToLine(p, a, b) {
  const v = sub(b, a);
  const w = sub(p, a);
  const len = Math.hypot(v.x, v.y);

  return len < EPS ? distance(p, a) : Math.abs(cross(v, w)) / len;
}
