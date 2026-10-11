/**
 * Independent numeric/geometric validator.
 * It recomputes relations from stored coordinates and does not consume the
 * generator's own validation.geometry.checks result.
 */
const EPS = 1e-6;
const normAngle = d => ((d % 360) + 360) % 360;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = v => Math.hypot(v.x, v.y);
const distance = (a, b) => length(sub(a, b));
const polar = p => normAngle(deg(Math.atan2(p.y, p.x)));
const close = (a, b, tolerance = EPS) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
const angle = (a, b, c) => {
  const u = sub(a, b), v = sub(c, b), denominator = length(u) * length(v);
  if (denominator <= EPS) return NaN;
  return deg(Math.acos(Math.max(-1, Math.min(1, dot(u, v) / denominator))));
};
const lineIntersection = (a, b, c, d) => {
  const u = sub(b, a), v = sub(d, c), denominator = cross(u, v);
  if (Math.abs(denominator) <= EPS) return null;
  const t = cross(sub(c, a), v) / denominator;
  return { x: a.x + t * u.x, y: a.y + t * u.y };
};
const pointOnLine = (p, a, b, tolerance = EPS) => Math.abs(cross(sub(p, a), sub(b, a))) <= tolerance;
const minorAngle = (a, b) => {
  const delta = Math.abs(polar(a) - polar(b));
  return Math.min(delta, 360 - delta);
};
const onMinorArc = (p, a, b) => {
  const ap = normAngle(polar(p) - polar(a));
  const ab = normAngle(polar(b) - polar(a));
  if (ab <= 180) return ap <= ab + EPS;
  const bp = normAngle(polar(p) - polar(b));
  return bp <= 360 - ab + EPS;
};

function pointMap(problem, variant = 'P1') {
  const coordinates = problem?.geometry?.coordinates;
  if (coordinates?.points) return { ...coordinates.points, ...(coordinates.variants?.[variant]?.points ?? {}) };
  const modelPoints = problem?.geometryModel?.points;
  if (modelPoints instanceof Map) return Object.fromEntries([...modelPoints.entries()].map(([id, p]) => [id, p]));
  if (modelPoints && typeof modelPoints === 'object') return modelPoints;
  return {};
}

function addCheck(checks, name, valid, details = null, actual = null, expected = null) {
  checks.push({ name, valid: Boolean(valid), ...(actual == null ? {} : { actual }), ...(expected == null ? {} : { expected }), ...(details == null ? {} : { details }) });
}

function parseAngleEquality(statement) {
  const m = /∠([A-Z]{3})\s*=\s*∠([A-Z]{3})/.exec(String(statement ?? '').replace(/\s/g, ''));
  return m ? [m[1], m[2]] : null;
}
function parseAngleValue(statement) {
  const m = /∠([A-Z]{3})\s*=\s*(\d+(?:\.\d+)?)°?/.exec(String(statement ?? '').replace(/\s/g, ''));
  return m ? { angle: m[1], value: Number(m[2]) } : null;
}
function parseSideEqualities(statement) {
  const text = String(statement ?? '').replace(/\s/g, '');
  return [...text.matchAll(/(?=([A-Z]{2})=([A-Z]{2}))/g)].map(m => [m[1], m[2]]).filter(([a, b]) => a[0] !== a[1] && b[0] !== b[1]);
}
function parsePointList(statement) {
  const m = /([A-Z](?:\s*[,、]\s*[A-Z]){1,})/.exec(String(statement ?? ''));
  return m ? m[1].split(/\s*[,、]\s*/).filter(x => /^[A-Z]$/.test(x)) : [];
}
function parseLineIntersection(statement) {
  const m = /([A-Z])\s*=\s*([A-Z]{2})\s*∩\s*([A-Z]{2})/.exec(String(statement ?? '').replace(/\s/g, ''));
  return m ? { point: m[1], line1: m[2], line2: m[3] } : null;
}
function parseParallel(statement) {
  const m = /([A-Z]{2})\s*(?:∥|parallel\s+to)\s*([A-Z]{2})/i.exec(String(statement ?? ''));
  return m ? [m[1], m[2]] : null;
}
function parseCollinear(statement) {
  const text = String(statement ?? '');
  const m = /([A-Z](?:\s*[,、]\s*[A-Z]){2,}).{0,12}(?:一直線上|collinear)/i.exec(text);
  return m ? m[1].split(/\s*[,、]\s*/).filter(x => /^[A-Z]$/.test(x)) : [];
}
function resolveSegment(name, points) {
  if (!/^[A-Z]{2}$/.test(name ?? '') || !points[name[0]] || !points[name[1]]) return null;
  return [points[name[0]], points[name[1]]];
}
function angleFromLabel(label, points) {
  if (!/^[A-Z]{3}$/.test(label ?? '') || !points[label[0]] || !points[label[1]] || !points[label[2]]) return NaN;
  return angle(points[label[0]], points[label[1]], points[label[2]]);
}
function checkConditions(problem, checks) {
  const conditions = Array.isArray(problem?.given_conditions) ? problem.given_conditions : [];
  const scopes = ['P1', 'P2'];
  for (const condition of conditions) {
    const type = String(condition?.type ?? '').toLowerCase();
    const statement = String(condition?.statement ?? condition?.display_text ?? '');
    const variants = condition?.part ? [condition.part] : scopes;
    for (const variant of variants) {
      const points = pointMap(problem, variant);
      if (['concyclic', 'incidence'].includes(type)) {
        if (/circle|円周上|on the circle|on circle/i.test(statement)) {
          const names = parsePointList(statement);
          const center = points.O ?? { x: 0, y: 0 };
          const declaredRadius = Number(problem?.geometry?.coordinate_system?.radius ?? 1);
          const inferredRadius = names.length && points[names[0]] ? distance(points[names[0]], center) : NaN;
          const radius = Number.isFinite(inferredRadius) && inferredRadius > EPS ? inferredRadius : declaredRadius;
          for (const name of names) {
            if (!points[name]) { addCheck(checks, `${condition.id ?? type}/${variant}: 点${name}の円周条件`, false, '座標がありません。'); continue; }
            addCheck(checks, `${condition.id ?? type}/${variant}: 点${name}の円周条件`, close(distance(points[name], center), radius), null, distance(points[name], center), radius);
          }
        }
        const arc = /([A-Z])\s*(?:lies|is|は).*?(?:arc|弧)\s*([A-Z])([A-Z])/i.exec(statement);
        if (arc && points[arc[1]] && points[arc[2]] && points[arc[3]]) {
          addCheck(checks, `${condition.id ?? type}/${variant}: 点${arc[1]}が弧上`, onMinorArc(points[arc[1]], points[arc[2]], points[arc[3]]));
        }
      }
      if (['equal_length', 'length_equality', 'equal_side'].includes(type)) {
        for (const [left, right] of parseSideEqualities(statement)) {
          const a = resolveSegment(left, points), b = resolveSegment(right, points);
          if (!a || !b) { addCheck(checks, `${condition.id ?? type}/${variant}: ${left}=${right}`, false, '線分の座標がありません。'); continue; }
          const la = distance(...a), lb = distance(...b);
          addCheck(checks, `${condition.id ?? type}/${variant}: ${left}=${right}`, close(la, lb), null, la, lb);
        }
      }
      if (type === 'parallel') {
        const pair = parseParallel(statement);
        if (pair) {
          const a = resolveSegment(pair[0], points), b = resolveSegment(pair[1], points);
          if (!a || !b) addCheck(checks, `${condition.id ?? type}/${variant}: ${pair.join('∥')}`, false, '平行判定に必要な点がありません。');
          else {
            const crossValue = Math.abs(cross(sub(a[1], a[0]), sub(b[1], b[0])));
            addCheck(checks, `${condition.id ?? type}/${variant}: ${pair.join('∥')}`, crossValue <= EPS, null, crossValue, 0);
          }
        }
      }
      if (type === 'collinear') {
        const names = parseCollinear(statement);
        if (names.length >= 3) {
          const origin = points[names[0]], end = points[names[1]];
          const missing = names.filter(n => !points[n]);
          const errors = names.slice(2).filter(n => origin && end && points[n] && !pointOnLine(points[n], origin, end));
          addCheck(checks, `${condition.id ?? type}/${variant}: ${names.join(',')}の一直線性`, !missing.length && !errors.length, missing.length ? `座標なし: ${missing.join(',')}` : errors.length ? `直線上にない点: ${errors.join(',')}` : null);
        }
      }
      if (type === 'angle_equality' || type === 'angle_equal' || type === 'equal_angle') {
        const pair = parseAngleEquality(statement);
        if (pair) {
          const a = angleFromLabel(pair[0], points), b = angleFromLabel(pair[1], points);
          addCheck(checks, `${condition.id ?? type}/${variant}: ∠${pair[0]}=∠${pair[1]}`, close(a, b, 1e-4), null, a, b);
        }
      }
      if (type === 'angle' || type === 'angle_right') {
        const value = parseAngleValue(statement);
        if (value) {
          const actual = angleFromLabel(value.angle, points);
          addCheck(checks, `${condition.id ?? type}/${variant}: ∠${value.angle}`, close(actual, value.value, 1e-4), null, actual, value.value);
        }
      }
      if (type === 'diameter') {
        const m = /([A-Z])([A-Z]).{0,30}(?:diameter|直径)/i.exec(statement);
        if (m && points[m[1]] && points[m[2]]) {
          const center = points.O ?? { x: 0, y: 0 };
          const inferredRadius = points[m[1]] ? distance(points[m[1]], center) : NaN;
          const radius = Number.isFinite(inferredRadius) && inferredRadius > EPS ? inferredRadius : Number(problem?.geometry?.coordinate_system?.radius ?? 1);
          const chord = distance(points[m[1]], points[m[2]]);
          const midpoint = { x: (points[m[1]].x + points[m[2]].x) / 2, y: (points[m[1]].y + points[m[2]].y) / 2 };
          addCheck(checks, `${condition.id ?? type}/${variant}: ${m[1]}${m[2]}が直径`, close(chord, 2 * radius) && distance(midpoint, center) <= EPS, null, chord, 2 * radius);
        }
      }
      if (type === 'arc_ratio') {
        const m = /arc\s*([A-Z]{2})\s*:\s*arc\s*([A-Z]{2})\s*=\s*(\d+)\s*:\s*(\d+)/i.exec(statement);
        if (m) {
          const left = resolveSegment(m[1], points), right = resolveSegment(m[2], points);
          if (!left || !right) addCheck(checks, `${condition.id ?? type}/${variant}: 弧の比`, false, '弧の端点座標がありません。');
          else {
            const actualLeft = minorAngle(left[0], left[1]), actualRight = minorAngle(right[0], right[1]);
            addCheck(checks, `${condition.id ?? type}/${variant}: 弧の比`, close(actualLeft / actualRight, Number(m[3]) / Number(m[4]), 1e-4), null, actualLeft / actualRight, Number(m[3]) / Number(m[4]));
          }
        }
      }
      if (type === 'arc_length') {
        const m = /arc\s*([A-Z]{2})\s*=\s*(\d+(?:\.\d+)?)π\s*cm/i.exec(statement);
        if (m) {
          const segment = resolveSegment(m[1], points);
          if (!segment) addCheck(checks, `${condition.id ?? type}/${variant}: 弧長`, false, '弧の端点座標がありません。');
          else {
            const radius = Number(problem?.geometry?.coordinate_system?.physical_radius_cm ?? 0);
            const coefficient = radius * minorAngle(segment[0], segment[1]) / 180;
            addCheck(checks, `${condition.id ?? type}/${variant}: 弧長`, close(coefficient, Number(m[2]), 1e-4), null, coefficient, Number(m[2]));
          }
        }
      }
      if (type === 'radius') {
        const m = /radius\s*O\s*=\s*(\d+(?:\.\d+)?)\s*cm/i.exec(statement);
        if (m) {
          const actual = Number(problem?.geometry?.coordinate_system?.physical_radius_cm ?? NaN);
          addCheck(checks, `${condition.id ?? type}/${variant}: 半径`, close(actual, Number(m[1])), null, actual, Number(m[1]));
        }
      }
      if (type === 'intersection') {
        const item = parseLineIntersection(statement);
        if (item) {
          const s1 = resolveSegment(item.line1, points), s2 = resolveSegment(item.line2, points), p = points[item.point];
          if (!s1 || !s2 || !p) addCheck(checks, `${condition.id ?? type}/${variant}: ${statement}`, false, '交点の座標がありません。');
          else {
            const expected = lineIntersection(s1[0], s1[1], s2[0], s2[1]);
            addCheck(checks, `${condition.id ?? type}/${variant}: ${statement}`, Boolean(expected) && distance(expected, p) <= 1e-4, null, expected ? distance(expected, p) : NaN, 0);
          }
        }
      }
    }
  }
}

function checkProofTarget(problem, checks) {
  const rawTarget = problem?.proof?.target ?? problem?.proof?.P1?.target ?? problem?.proof?.P1?.goal ?? problem?.proof?.selected_solution?.target ?? problem?.problem?.statement?.parts?.find(p => p.id === 'P1')?.target ?? '';
  const target = typeof rawTarget === 'string' ? rawTarget : rawTarget?.statement ?? rawTarget?.conclusion ?? '';
  const variant = 'P1', points = pointMap(problem, variant);
  if (!target) return;
  const sideEquality = parseSideEqualities(target);
  if (sideEquality.length === 1) {
    const [left, right] = sideEquality[0], a = resolveSegment(left, points), b = resolveSegment(right, points);
    if (a && b) addCheck(checks, `証明目標 ${left}=${right}`, close(distance(...a), distance(...b)), null, distance(...a), distance(...b));
    return;
  }
  const sim = /△([A-Z]{3})(∽|∼|相似|≡|合同)△?([A-Z]{3})/.exec(target);
  if (sim) {
    const [, first, relation, second] = sim;
    const trianglePoints = (vertices) => [...vertices].map(v => points[v]);
    const a = trianglePoints(first), b = trianglePoints(second);
    if (a.some(p => !p) || b.some(p => !p)) { addCheck(checks, `証明目標 ${target}`, false, '三角形の点座標がありません。'); return; }
    const lengths = (p) => [distance(p[0], p[1]), distance(p[1], p[2]), distance(p[2], p[0])];
    const la = lengths(a), lb = lengths(b);
    const congruent = relation === '≡' || relation === '合同';
    const ratios = la.map((v, i) => v / lb[i]);
    const valid = congruent ? la.every((v, i) => close(v, lb[i], 1e-4)) : ratios.every(v => close(v, ratios[0], 1e-4));
    addCheck(checks, `証明目標 ${target}`, valid, null, congruent ? Math.max(...la.map((v, i) => Math.abs(v - lb[i]))) : Math.max(...ratios) - Math.min(...ratios), 0);
  }
}

function checkAnswer(problem, checks) {
  const part = problem?.problem?.statement?.parts?.find(p => p.id === 'P2') ?? problem?.problem?.parts?.find(p => p.id === 'P2') ?? problem?.problem?.parts?.[1];
  const followup = problem?.follow_up?.problems?.[0] ?? problem?.follow_up?.P2 ?? problem?.follow_up;
  const answer = String(part?.answer ?? part?.target?.answer ?? followup?.answer ?? '');
  const target = String(part?.target?.statement ?? part?.target ?? followup?.target ?? followup?.question ?? '');
  if (!answer || !target) return;
  const points = pointMap(problem, 'P2');
  const angleTarget = /∠([A-Z]{3})/.exec(target);
  if (angleTarget && /\d+(?:\.\d+)?°/.test(answer)) {
    const actual = angleFromLabel(angleTarget[1], points), expected = Number(/(\d+(?:\.\d+)?)°/.exec(answer)[1]);
    addCheck(checks, `P2答案 ${target}`, close(actual, expected, 1e-4), null, actual, expected);
    return;
  }
  if (/弧|arc/i.test(target) && /π/.test(answer)) {
    const arc = /([A-Z])([A-Z])/.exec(target.replace(/小さい方|の長さ|長さ|arc/gi, ''));
    const coefficient = /(?:(\d+)π(?:\/(\d+))?|π(?:\/(\d+))?)/.exec(answer);
    if (arc && coefficient) {
      const a = points[arc[1]], b = points[arc[2]], radius = Number(problem?.geometry?.coordinate_system?.physical_radius_cm ?? NaN);
      const numerator = Number(coefficient[1] ?? 1), denominator = Number(coefficient[2] ?? coefficient[3] ?? 1);
      const actual = radius * minorAngle(a, b) / 180, expected = numerator / denominator;
      addCheck(checks, `P2答案 ${target}`, close(actual, expected, 1e-4), null, actual, expected);
    }
  }
}

export function validateProblemGeometry(problem) {
  const hasCoordinates = Boolean(problem?.geometry?.coordinates?.points || problem?.geometryModel?.points || problem?.geometry?.points);
  if (!hasCoordinates) {
    const hasModel = Boolean(problem?.geometryModel?.points || problem?.geometry?.points);
    return {
      version: '1.0.0', independent: true,
      status: hasModel ? 'structural-only' : 'not-applicable', valid: null,
      check_count: 0, passed_count: 0, failed_count: 0, checks: [], errors: [],
      note: hasModel ? 'GeometryModelの座標から検証します。' : 'この問題形式には独立検証用の座標データがありません。'
    };
  }
  const checks = [];
  const variants = ['P1', 'P2'];
  for (const variant of variants) {
    const points = pointMap(problem, variant);
    const entries = Object.entries(points);
    if (!entries.length) continue;
    for (const [id, p] of entries) {
      const valid = Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y));
      addCheck(checks, `${variant}: 点${id}の座標が有限`, valid, valid ? null : '座標が有限値ではありません。');
    }
    const triangles = problem?.geometry?.triangles ?? [];
    for (const triangle of triangles) {
      const vertices = Array.isArray(triangle) ? triangle : triangle?.vertices;
      if (!Array.isArray(vertices) || vertices.length !== 3) continue;
      const ps = vertices.map(v => points[v]);
      if (ps.some(p => !p)) { addCheck(checks, `${variant}: △${vertices.join('')}の非退化`, false, '三角形の点座標がありません。'); continue; }
      const area2 = Math.abs(cross(sub(ps[1], ps[0]), sub(ps[2], ps[0])));
      addCheck(checks, `${variant}: △${vertices.join('')}の非退化`, area2 > EPS, null, area2, 0);
    }
  }
  checkConditions(problem, checks);
  checkProofTarget(problem, checks);
  checkAnswer(problem, checks);
  const failures = checks.filter(c => !c.valid);
  return {
    version: '1.0.0',
    independent: true,
    status: failures.length === 0 ? 'validated' : 'failed',
    valid: failures.length === 0,
    check_count: checks.length,
    passed_count: checks.length - failures.length,
    failed_count: failures.length,
    checks,
    errors: failures.map(f => `${f.name}${f.details ? `: ${f.details}` : ''}${f.actual != null ? ` (actual=${f.actual}, expected=${f.expected})` : ''}`),
    note: '生成器自身のvalidation.geometry.checksは参照せず、保存済み座標から関係を再計算しています。'
  };
}
