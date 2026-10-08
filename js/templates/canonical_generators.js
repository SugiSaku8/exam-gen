import { BASE_2015 } from './2015.js';
import { BASE_2016 } from './2016.js';
import { BASE_2017 } from './2017.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seededRandom(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function choice(random, values) {
  return values[Math.floor(random() * values.length)];
}

function transformPoints(points, scale, rotationDeg) {
  const O = points.O ?? points.A ?? { x: 0, y: 0 };
  const rad = rotationDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const out = {};

  for (const [id, p] of Object.entries(points)) {
    const dx = p.x - O.x;
    const dy = p.y - O.y;
    out[id] = {
      ...p,
      id: String(p.id ?? id),
      label: String(p.label ?? p.id ?? id),
      x: O.x + scale * (dx * cos - dy * sin),
      y: O.y + scale * (dx * sin + dy * cos)
    };
  }
  return out;
}

function makeGeometry(source, scale, rotationDeg) {
  const g = source.geometry;
  const coordinates = g.coordinates ?? {};
  const points = transformPoints(coordinates.points ?? {}, scale, rotationDeg);
  const objectSegments = g.objects?.segments ?? [];
  const objectLines = g.objects?.lines ?? [];

  const segments = objectSegments.map(id => ({
    id,
    from: id.slice(0, 1),
    to: id.slice(1, 2)
  })).filter(x => points[x.from] && points[x.to]);

  const lines = objectLines.map(id => ({
    id,
    through: [id.slice(0, 1), id.slice(1, 2)]
  })).filter(x => points[x.through[0]] && points[x.through[1]]);

  const circleSource = g.coordinates?.circle ?? {};
  const circleCenter = circleSource.center ?? 'O';
  const radius = Number(circleSource.radius ?? g.coordinate_system?.radius ?? 1) * scale;

  return {
    coordinate_system: {
      ...(g.coordinate_system ?? {}),
      radius,
      transformed: { scale, rotation_degree: rotationDeg }
    },
    points,
    segments,
    lines,
    circles: [{
      id: circleSource.id ?? 'O1',
      center: circleCenter,
      radius,
      through_points: g.coordinates?.circle?.through_points ?? []
    }],
    triangles: (g.objects?.triangles ?? []).map(id => ({ id })),
    constraints: { valid: true, errors: [], warnings: [] }
  };
}

function scaleLengthValue(value, scale) {
  if (typeof value === 'number') return Number((value * scale).toFixed(4));
  return value;
}

function generateFromBase(source, options, year) {
  const random = seededRandom(options.seed ?? Date.now());
  const scale = options.scale ?? choice(random, [0.85, 1, 1.15, 1.25]);
  const rotation = options.rotation ?? choice(random, [-12, -6, 0, 7, 13]);
  const data = clone(source);
  const geometry = makeGeometry(data, scale, rotation);

  data.metadata = {
    ...data.metadata,
    id: `generated_${year}_math_07`,
    problem_number: 'generated',
    tags: data.metadata.tags ?? []
  };
  data.geometryModel = geometry;
  data.geometry = geometry;
  data.generation = {
    ...(data.generation ?? {}),
    template_id: data.generation?.source_template ?? `SHIZUOKA_${year}_GENERATED`,
    generation_mode: 'rule_based',
    uses_llm: false,
    seed: options.seed ?? null,
    parameters: { scale, rotation }
  };

  if (year === 2015) {
    const radius = 9 * scale;
    const answer = `${(17 * scale / 5).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}π`;
    data.problem.parts[1].question = `ADを延長し、円Oとの交点をHとする。∠CDH=56°、円Oの半径が${radius.toFixed(2).replace(/\.00$/, '')}cmのとき、弧CHの長さを求めなさい。`;
    data.problem.parts[1].target.answer = answer;
    data.follow_up.P2.givens.radius = Number(radius.toFixed(4));
    data.follow_up.P2.answer = answer;
    data.follow_up.P2.substitution = `L=2π×${radius.toFixed(4)}×68/360`;
    data.proof = data.proof;
    data.given_conditions = data.given_conditions.map(c =>
      c.type === 'radius' ? { ...c, value: Number(radius.toFixed(4)), statement: `円Oの半径は${radius.toFixed(4)}cm` } : c
    );
  }

  if (year === 2017) {
    const AD = Number((4 * scale).toFixed(4));
    const AE = Number((2 * scale).toFixed(4));
    const EC = Number((3 * scale).toFixed(4));
    const AG = Number((1.5 * scale).toFixed(4));
    const DG = Number((2.5 * scale).toFixed(4));
    data.problem.parts[1].question = `AD=${AD}cm、AE=${AE}cm、EC=${EC}cmのとき、△CDEの面積は△DGEの面積の何倍か答えなさい。`;
    data.problem.parts[1].target.answer = '12/5';
    data.follow_up.P2.answer = '12/5';
    data.variables.AG.value = String(AG);
    data.variables.DG.value = String(DG);
    data.given_conditions = data.given_conditions.map(c => {
      if (c.id === 'C07') return { ...c, value: AD, statement: `AD=${AD}cm` };
      if (c.id === 'C08') return { ...c, value: AE, statement: `AE=${AE}cm` };
      if (c.id === 'C09') return { ...c, value: EC, statement: `EC=${EC}cm` };
      return c;
    });
  }

  return data;
}

export function generate2015(options = {}) { return generateFromBase(BASE_2015, options, 2015); }
export function generate2016(options = {}) { return generateFromBase(BASE_2016, options, 2016); }
export function generate2017(options = {}) { return generateFromBase(BASE_2017, options, 2017); }
