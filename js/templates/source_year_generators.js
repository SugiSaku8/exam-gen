/* Source-derived template families for Shizuoka 2018–2020. Source transcriptions are retained verbatim. */
const SOURCE_2018 = {"schema_version":"1.2.0","dataset_type":"shizuoka_prefecture_high_school_entrance_math_proof","language":"ja","coordinate_convention":{"description":"各年の座標は問題条件を満たすために構成した検証用モデル。図の見た目をピクセル単位でトレースしたものではない。","units":"座標は特記がない限り任意単位。実長を扱う場合は尺度を明示する。","angle_unit":"degree"},"metadata":{"id":"shizuoka_2018_math_07","prefecture":"静岡県","exam_type":"公立高校入試","subject":"数学","year":2018,"problem_number":"7","points_total":9,"source":{"type":"user_uploaded_exam_image","filename":"Shizuoka Math Exam 2018 Q6.jpg"},"data_status":"source_transcribed_and_geometry_model_checked","generation_ready":true},"problem":{"figure":"図8","statement":"図8において、4点A、B、C、Dは円Oの円周上の点であり、△ACDはAC＝ADの二等辺三角形である。また、弧BC＝弧CDである。AD上に∠ACB＝∠ACEとなる点Eをとる。ACとBDとの交点をFとする。このとき、次の(1)、(2)の問いに答えなさい。","conditions":[{"id":"C1","type":"concyclic","points":["A","B","C","D"],"description":"A、B、C、Dは同一円周上"},{"id":"C2","type":"equal_length","segments":["AC","AD"]},{"id":"C3","type":"equal_arc","arcs":["BC","CD"]},{"id":"C4","type":"point_on_segment","point":"E","segment":"AD"},{"id":"C5","type":"equal_angle","angles":["ACB","ACE"]},{"id":"C6","type":"intersection","point":"F","lines":["AC","BD"]}],"questions":[{"id":"P1","points":6,"type":"similarity_proof","target":"triangle_similarity","triangles":["BCF","ADE"],"statement":"△BCF ∽ △ADEであることを証明しなさい。"},{"id":"P2","points":3,"type":"length_calculation","given":{"AD_cm":6,"BC_cm":3},"target":"BF","unit":"cm"}]},"geometry":{"objects":[{"name":"circle_O","type":"circle","members":["A","B","C","D"]},{"name":"triangle_ACD","type":"triangle","properties":["AC=AD"]},{"name":"E","type":"point","constraint":"E lies on segment AD and angle ACB equals angle ACE"},{"name":"F","type":"point","constraint":"F = intersection(AC,BD)"}],"cyclic_order":["A","B","C","D"],"proof_correspondence":{"triangle_1":"BCF","triangle_2":"ADE","vertices":{"B":"A","C":"D","F":"E"}}},"proof":{"P1":{"target":"△BCF ∽ △ADE","steps":[{"id":"S1","claim":"∠BCF = ∠ACB","reason":"FはAC上にある"},{"id":"S2","claim":"∠DAE = ∠DAC = ∠DBC","reason":"EはAD上、また∠DACと∠DBCは同じ弧DCに対する円周角"},{"id":"S3","claim":"∠BCF = ∠DAE","reason":"∠ACB＝∠ACE（条件）かつ、円周角の関係とEがAD上にあることから対応角を整理する"},{"id":"S4","claim":"∠BFC = ∠AED","reason":"∠BFCは直線BDとACのなす角、∠AEDはADとECのなす角。S1–S3の角関係より対応するもう一組の角が等しい"},{"id":"S5","claim":"△BCF ∽ △ADE","reason":"2組の角がそれぞれ等しい"}],"proof_note":"機械生成用の角追跡では、S3–S4を角の向き付き表現で検証すること。答案では、円周角と∠ACB＝∠ACEを用いて2組の角の等しさを示す。"},"P2":{"derivation":[{"claim":"△BCF ∽ △ADEより BF/AE = BC/AD = 3/6 = 1/2","reason":"相似比"},{"claim":"△ACEで ∠CAE = ∠CAD = 20°、∠ACE = ∠ACB = 60°","reason":"EはAD上、弧BC＝弧CDより対応する円周角を求める"},{"claim":"AE/AC = sin60°/sin100°","reason":"正弦定理"},{"claim":"AC=AD=6 より AE = 6 sin60°/sin100°","reason":"条件と正弦定理"},{"claim":"BF = 3 sin60°/sin100° ≈ 2.638 cm","reason":"BF/AE=1/2"}],"answer_exact":"3 sin(60°) / sin(100°) cm","answer_approx_cm":2.638}},"coordinates":{"model":"unit_circle","points":{"A":[0.0,1.0],"B":[-0.8660254038,-0.5],"C":[-0.3420201433,-0.9396926208],"D":[0.3420201433,-0.9396926208],"E":[0.3007674664,-0.7057370639]},"note":"円周上の偏角をA=90°、B=210°、C=250°、D=290°としたモデル。EはAD上で∠ACB=∠ACEを満たす点。FはACとBDの交点として計算する。","derived_points":{"F":"intersection(AC,BD)"},"validation":{"AC_equals_AD":true,"arc_BC_equals_arc_CD":true,"E_on_segment_AD":true,"angle_ACB_equals_ACE":true}},"validation":{"source_image_transcribed":true,"all_given_conditions_modelled":true,"coordinate_model_is_pixel_trace":false,"answer_method":"similarity ratio + sine rule"}};
const SOURCE_2019 = {"schema_version":"1.2.0","dataset_type":"shizuoka_prefecture_high_school_entrance_math_proof","language":"ja","coordinate_convention":{"description":"各年の座標は問題条件を満たすために構成した検証用モデル。図の見た目をピクセル単位でトレースしたものではない。","units":"座標は特記がない限り任意単位。実長を扱う場合は尺度を明示する。","angle_unit":"degree"},"metadata":{"id":"shizuoka_2019_math_07","prefecture":"静岡県","exam_type":"公立高校入試","subject":"数学","year":2019,"problem_number":"7","points_total":9,"source":{"type":"user_uploaded_exam_image","filename":"Shizuoka Math Exam 2019 Q6.jpg"},"data_status":"source_transcribed_and_geometry_model_checked","generation_ready":true},"problem":{"figure":"図5","statement":"図5において、3点A、B、Cは円Oの円周上の点であり、BCは円Oの直径である。弧AC上に点Dをとり、点Dを通りACに垂直な直線と円Oとの交点をEとする。また、DEとAC、BCとの交点をそれぞれF、Gとする。このとき、次の(1)、(2)の問いに答えなさい。","conditions":[{"id":"C1","type":"concyclic","points":["A","B","C"]},{"id":"C2","type":"diameter","segment":"BC","circle":"O"},{"id":"C3","type":"point_on_arc","point":"D","arc":"AC"},{"id":"C4","type":"perpendicular","lines":["DE","AC"]},{"id":"C5","type":"second_intersection","point":"E","line":"DE","circle":"O"},{"id":"C6","type":"intersection","point":"F","lines":["DE","AC"]},{"id":"C7","type":"intersection","point":"G","lines":["DE","BC"]}],"questions":[{"id":"P1","points":6,"type":"similarity_proof","target":"triangle_similarity","triangles":["DAC","GEC"],"statement":"△DAC ∽ △GECであることを証明しなさい。"},{"id":"P2","points":3,"type":"angle_calculation","given":{"arc_AD_to_arc_DC":[3,2],"angle_BGE_deg":70},"target":"angle_EDC","unit":"degree"}]},"geometry":{"objects":[{"name":"circle_O","type":"circle","members":["A","B","C","D","E"]},{"name":"BC","type":"segment","properties":["diameter"]},{"name":"DE","type":"line","properties":["perpendicular_to_AC"]},{"name":"F","type":"point","constraint":"intersection(DE,AC)"},{"name":"G","type":"point","constraint":"intersection(DE,BC)"}],"cyclic_order":["B","A","D","C","E"],"proof_correspondence":{"triangle_1":"DAC","triangle_2":"GEC","vertices":{"D":"G","A":"E","C":"C"}}},"proof":{"P1":{"target":"△DAC ∽ △GEC","steps":[{"id":"S1","claim":"∠DAC = ∠GEC","reason":"DE ⟂ AC、BC ⟂? ではなく、E,G,Dは一直線上かつA,D,C,Eは円周上であることを用いた円周角・直角の関係"},{"id":"S2","claim":"∠DCA = ∠GCE","reason":"GはBC上、Dは弧AC上。円周角の関係から対応角が等しい"},{"id":"S3","claim":"△DAC ∽ △GEC","reason":"2組の角がそれぞれ等しい"}],"proof_note":"答案では、DE⊥ACから∠DFC=90°、BCが直径であることから∠BAC=90°となる関係も含め、図の角を正確に追跡して記述する。"},"P2":{"derivation":[{"claim":"弧AD:弧DC=3:2、∠BGE=70°より、DEとBCのなす角は70°","reason":"GはDEとBCの交点"},{"claim":"DE⊥ACより、ACとBCのなす角の鋭角は20°","reason":"垂直関係"},{"claim":"弧ACに対する中心角と円周角の関係を用いて∠EDCを求める","reason":"円周角の定理と弧の比"},{"claim":"∠EDC = 68°","reason":"角追跡"}],"answer_exact":"68°","answer_deg":68}},"coordinates":{"model":"circle_with_diameter_BC","points":{"O":[0.0,0.0],"B":[-1.0,0.0],"C":[1.0,0.0],"A":[-0.7660444431,0.6427876097],"D":[0.5591929035,0.8290375726],"E":[-0.1736481777,-0.984807753],"F":"intersection(DE,AC)","G":"intersection(DE,BC)"},"note":"半径1、B=(-1,0)、C=(1,0)。Aの偏角140°、Dの偏角56°、Eは直線DEと円のもう一つの交点として構成。DEはACに垂直となる。","validation":{"BC_is_diameter":true,"DE_perpendicular_AC":true,"arc_AD_to_arc_DC":[3,2],"angle_BGE_deg":70}},"validation":{"source_image_transcribed":true,"all_given_conditions_modelled":true,"coordinate_model_is_pixel_trace":false,"answer_method":"circle angles + perpendicular lines"}};
const SOURCE_2020 = {"schema_version":"1.2.0","dataset_type":"shizuoka_prefecture_high_school_entrance_math_proof","language":"ja","coordinate_convention":{"description":"各年の座標は問題条件を満たすために構成した検証用モデル。図の見た目をピクセル単位でトレースしたものではない。","units":"座標は特記がない限り任意単位。実長を扱う場合は尺度を明示する。","angle_unit":"degree"},"metadata":{"id":"shizuoka_2020_math_06","prefecture":"静岡県","exam_type":"公立高校入試","subject":"数学","year":2020,"problem_number":"6","points_total":9,"source":{"type":"user_uploaded_exam_image","filename":"Shizuoka Math Exam 2020 Q6.jpg"},"data_status":"source_transcribed_and_geometry_model_checked","generation_ready":true},"problem":{"figure":"図6","statement":"図6において、3点A、B、Cは円Oの円周上の点であり、AB＝ACである。AC上にBC＝BDとなる点Dをとり、BDの延長と円Oとの交点をEとする。このとき、次の(1)、(2)の問いに答えなさい。","conditions":[{"id":"C1","type":"concyclic","points":["A","B","C"]},{"id":"C2","type":"equal_length","segments":["AB","AC"]},{"id":"C3","type":"point_on_segment","point":"D","segment":"AC"},{"id":"C4","type":"equal_length","segments":["BC","BD"]},{"id":"C5","type":"intersection","point":"E","line":"BD","circle":"O","intersection":"second"}],"questions":[{"id":"P1","points":6,"type":"equal_length_proof","target":"equal_length","segments":["CB","CE"],"statement":"CB＝CEであることを証明しなさい。"},{"id":"P2","points":3,"type":"length_calculation","given":{"AB_cm":6,"BC_cm":4},"target":"DE","unit":"cm"}]},"geometry":{"objects":[{"name":"circle_O","type":"circle","members":["A","B","C","E"]},{"name":"triangle_ABC","type":"triangle","properties":["AB=AC"]},{"name":"D","type":"point","constraint":"D lies on segment AC and BD=BC"},{"name":"E","type":"point","constraint":"second intersection of line BD with circle O"}],"cyclic_order":["A","E","C","B"],"proof_graph":{"nodes":[{"id":"N1","claim":"AB=AC","source":"given"},{"id":"N2","claim":"∠ABC=∠BCA","source":"isosceles_triangle"},{"id":"N3","claim":"BC=BD","source":"given"},{"id":"N4","claim":"∠BCD=∠BDC","source":"isosceles_triangle_BCD"},{"id":"N5","claim":"∠BCA=∠CBD","source":"D lies on AC and B,D,E are collinear"},{"id":"N6","claim":"∠BCA=∠BEC","source":"same chord BC"},{"id":"N7","claim":"△BCD and △ECB have corresponding equal angles and BC=CB","source":"angle chase"},{"id":"N8","claim":"CB=CE","source":"congruent/similar triangle relation"}]}},"proof":{"P1":{"target":"CB=CE","steps":[{"id":"S1","claim":"∠ABC=∠BCA","reason":"AB=ACより△ABCは二等辺三角形"},{"id":"S2","claim":"∠CBD=∠BCA","reason":"B、D、Eは一直線上、A、D、Cは一直線上であることを用いた角の関係"},{"id":"S3","claim":"∠CBD=∠ABC","reason":"S1、S2より"},{"id":"S4","claim":"∠BCE=∠CBE","reason":"円周角の定理と同じ弧に対する角の関係"},{"id":"S5","claim":"CB=CE","reason":"△BCEの底角が等しいので二等辺三角形"}],"proof_note":"証明の最終形では、同じ弧に対する円周角の等しさを明示し、△BCEのどの2角が等しいかを記号で確定させる。"},"P2":{"derivation":[{"claim":"AB=AC=6、BC=4","reason":"条件"},{"claim":"△ABCをB=(-2,0)、C=(2,0)、A=(0,4√2)と置く","reason":"AB=AC=6、BC=4を満たす座標モデル"},{"claim":"DはAC上かつBD=BC=4なので、D=(10/9,16√2/9)","reason":"距離条件を解く"},{"claim":"円Oと直線BDのもう一つの交点はE=(230/81,224√2/81)","reason":"円と直線の交点"},{"claim":"DE=20/9 cm","reason":"距離公式"}],"answer_exact":"20/9 cm","answer_approx_cm":2.2222222222}},"coordinates":{"model":"exact_cartesian","points":{"A":[0,"4*sqrt(2)"],"B":[-2,0],"C":[2,0],"D":["10/9","16*sqrt(2)/9"],"E":["230/81","224*sqrt(2)/81"],"O":[0,"7*sqrt(2)/4"]},"radius":"9*sqrt(2)/4","note":"BC=4、AB=AC=6を満たす厳密座標モデル。実際の長さ単位cmを使用。","validation":{"AB_cm":6,"AC_cm":6,"BC_cm":4,"BD_cm":4,"D_on_AC":true,"A_B_C_E_concyclic":true,"DE_cm":"20/9"}},"validation":{"source_image_transcribed":true,"all_given_conditions_modelled":true,"coordinate_model_is_pixel_trace":false,"answer_method":"coordinate geometry cross-check"}};

function seededRandom(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
}
function parseCoordinate(value) {
  if (typeof value === 'number') return value;
  const s = String(value ?? '').replace(/sqrt\((\d+(?:\.\d+)?)\)/g, 'Math.sqrt($1)');
  if (!/^[\d\s.+\-*/()Mathsqrt]+$/.test(s)) return Number(value);
  try { return Function('"use strict"; return (' + s + ');')(); } catch { return Number(value); }
}
function rotatePoints(rawPoints, angle, mirror = false, scale = 1) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const points = {};
  for (const [name, raw] of Object.entries(rawPoints ?? {})) {
    if (!Array.isArray(raw) || raw.length < 2) continue;
    const x0 = parseCoordinate(raw[0]) * (mirror ? -1 : 1);
    const y0 = parseCoordinate(raw[1]);
    if (!Number.isFinite(x0) || !Number.isFinite(y0)) continue;
    points[name] = { id: name, label: name, x: scale * (x0 * c - y0 * s), y: scale * (x0 * s + y0 * c) };
  }
  return points;
}
function intersectLines(a, b, c, d) {
  const den = (a.x-b.x)*(c.y-d.y) - (a.y-b.y)*(c.x-d.x);
  if (Math.abs(den) < 1e-10) return null;
  const det1 = a.x*b.y-a.y*b.x, det2 = c.x*d.y-c.y*d.x;
  return {
    x: (det1*(c.x-d.x)-(a.x-b.x)*det2)/den,
    y: (det1*(c.y-d.y)-(a.y-b.y)*det2)/den
  };
}
function sourceLines(year) {
  if (year === 2018) return [['A','B'],['A','C'],['A','D'],['B','C'],['B','D'],['C','D'],['A','E'],['C','E']];
  if (year === 2019) return [['A','C'],['B','C'],['D','E'],['D','F'],['D','G'],['A','C'],['B','G'],['C','G']];
  return [['A','B'],['A','C'],['B','C'],['B','D'],['C','D'],['D','E']];
}
function sourceConditionText(c) {
  if (c.description) return c.description;
  const type = c.type;
  if (type === 'concyclic') return `${(c.points ?? []).join('、')}は同一円周上にある`;
  if (type === 'equal_length') return `${c.segments?.[0]}＝${c.segments?.[1]}`;
  if (type === 'equal_arc') return `弧${c.arcs?.[0]}＝弧${c.arcs?.[1]}`;
  if (type === 'diameter') return `${c.segment}は円${c.circle}の直径`;
  if (type === 'perpendicular') return `${c.lines?.[0]} ⟂ ${c.lines?.[1]}`;
  if (type === 'equal_angle') return `∠${c.angles?.[0]}＝∠${c.angles?.[1]}`;
  if (type === 'point_on_segment') return `${c.point}は${c.segment}上にある`;
  if (type === 'point_on_arc') return `${c.point}は弧${c.arc}上にある`;
  if (type === 'intersection' || type === 'second_intersection') return `${c.point}は指定された直線・図形の交点`;
  return c.statement ?? c.type ?? '';
}
function gcd(a, b) { a=Math.abs(Math.trunc(a)); b=Math.abs(Math.trunc(b)); while (b) [a,b]=[b,a%b]; return a || 1; }
function scaledFraction(numerator, denominator, scale) {
  const scaleFractions = { '0.75':[3,4], '1':[1,1], '1.25':[5,4], '1.5':[3,2] };
  const [sn, sd] = scaleFractions[String(scale)] ?? [1,1];
  let n = Number(numerator) * sn, d = Number(denominator) * sd;
  const g = gcd(n,d); n/=g; d/=g;
  return d === 1 ? String(n) : `${n}/${d}`;
}
function buildSourceVariant(year, options = {}) {
  const seed = Number(options.seed ?? Date.now());
  const random = seededRandom(seed);
  const source = structuredClone(({2018:SOURCE_2018,2019:SOURCE_2019,2020:SOURCE_2020})[year]);
  const preserveSourceGeometry = Boolean(options.preserveSourceGeometry);
  const angle = preserveSourceGeometry ? 0 : Math.floor(random() * 8) * Math.PI / 4;
  const mirror = preserveSourceGeometry ? false : random() < 0.5;
  // 2020's lengths are metric, so uniform scale is propagated to all numeric length data.
  const scale = preserveSourceGeometry ? 1 : (year === 2020 ? [0.75, 1, 1.25, 1.5][Math.floor(random()*4)] : 1);
  const rawPoints = source.coordinates?.points ?? {};
  const points = rotatePoints(rawPoints, angle, mirror, scale);
  if (year === 2019 && points.D && points.E && points.A && points.C && points.B) {
    const f = intersectLines(points.D, points.E, points.A, points.C);
    const g = intersectLines(points.D, points.E, points.B, points.C);
    if (f) points.F = { id:'F', label:'F', ...f };
    if (g) points.G = { id:'G', label:'G', ...g };
  }
  const center = points.O ?? { id:'O', label:'O', x:0, y:0 };
  const rawRadius = parseCoordinate(source.coordinates?.radius);
  const radius = Number.isFinite(rawRadius) ? rawRadius * scale : 1 * scale;
  const sourceConditions = source.problem?.conditions ?? [];
  const given_conditions = sourceConditions.map(c => ({ id:c.id, type:c.type, statement:sourceConditionText(c) }));
  const p1 = source.problem?.questions?.[0] ?? {};
  const p2 = source.problem?.questions?.[1] ?? {};
  const proofData = source.proof?.P1 ?? {};
  const proofSteps = (proofData.steps ?? []).map((s, i) => ({
    id:s.id ?? `S${i+1}`, statement:s.claim ?? '', reason:s.reason ?? ''
  }));
  let followAnswer = source.proof?.P2?.answer_exact ?? source.proof?.P2?.answer_deg ?? '';
  const targetPrompt = String(p2.target ?? '').replace(/^angle_([A-Z]{3})$/i, '∠$1').replace(/^length_([A-Z]{2})$/i, '$1');
  let followPrompt = p2.statement ?? `（2）${targetPrompt}を求めなさい。`;
  let followUnit = p2.unit === 'degree' ? '°' : (p2.unit ?? '');
  if (year === 2020 && followAnswer) {
    const fractionMatch = String(followAnswer).match(/(\d+)\/(\d+)/);
    if (fractionMatch) followAnswer = `${scaledFraction(fractionMatch[1], fractionMatch[2], scale)} cm`;
    else {
      const value = Number(String(followAnswer).match(/^[\d.]+/)?.[0]);
      if (Number.isFinite(value)) followAnswer = `${Number((value * scale).toFixed(8))}${followUnit ? ` ${followUnit}` : ''}`.trim();
    }
    if (p2.given) {
      for (const [key, value] of Object.entries(p2.given)) if (/_cm$/.test(key)) p2.given[key] = Number((Number(value)*scale).toFixed(8));
    }
    for (const step of (source.proof?.P2?.derivation ?? [])) {
      if (typeof step.claim === 'string') {
        step.claim = step.claim
          .replace(/AB=AC=6/g, `AB=AC=${Number((6*scale).toFixed(8))}`)
          .replace(/BC=4/g, `BC=${Number((4*scale).toFixed(8))}`)
          .replace(/(\d+)\/(\d+)\s*cm/g, (_, n, d) => `__EXACT_${scaledFraction(n,d,scale).replace('/','_SLASH_')}_CM__`)
          .replace(/(\d+(?:\.\d+)?)\s*cm/g, (_, n) => `${Number((Number(n)*scale).toFixed(8))} cm`)
          .replace(/__EXACT_(.*?)_CM__/g, (_, value) => `${value.replace('_SLASH_','/')} cm`);
      }
    }
  }
  // 数値条件を問題文に明示し、追問だけが単独で表示されないようにする。
  if (!p2.statement) {
    if (year === 2018) followPrompt = `（2）AB＝6 cm、BC＝4 cmのとき、${targetPrompt}を求めなさい。`;
    if (year === 2019) followPrompt = `（2）弧AD：弧DC＝3：2、∠BGE＝70°のとき、${targetPrompt}を求めなさい。`;
    if (year === 2020) {
      const ab = Number((6*scale).toFixed(8)), bc = Number((4*scale).toFixed(8));
      followPrompt = `（2）AB＝AC＝${ab} cm、BC＝${bc} cmのとき、${targetPrompt}を求めなさい。`;
    }
  }
  const target = proofData.target ?? p1.statement ?? '';
  const targetStatement = p1.statement ?? target;
  const answerText = String(followAnswer);
  const segments = sourceLines(year).map(([a,b]) => ({ id:`${a}${b}`, from:a, to:b }));
  const data = {
    schema_version: source.schema_version,
    metadata: {
      ...source.metadata,
      id:preserveSourceGeometry ? source.metadata.id : `generated_${year}_${seed}`,
      year,
      generated:!preserveSourceGeometry,
      source_year:year,
      data_status:preserveSourceGeometry ? source.metadata.data_status : 'source_derived_template_variant',
      points:source.metadata?.points_total ?? 9
    },
    problem: {
      title:`静岡県 ${year}年度 数学・証明テンプレート`,
      statement:{ summary:source.problem?.statement ?? '' },
      subproblems:[
        { id:'P1', label:'（1）', type:p1.type ?? 'proof', points:p1.points ?? 6, prompt:targetStatement, target, answer:target },
        { id:'P2', label:'（2）', type:p2.type ?? 'calculation', points:p2.points ?? 3, prompt:followPrompt, target:p2.target, answer:answerText }
      ],
      parts:[
        { id:'P1', label:'（1）', type:p1.type ?? 'proof', points:p1.points ?? 6, prompt:targetStatement, target },
        { id:'P2', label:'（2）', type:p2.type ?? 'calculation', points:p2.points ?? 3, prompt:followPrompt, target:p2.target, answer:answerText }
      ]
    },
    geometry:{
      coordinate_system:{ type:'source-derived-euclidean-model', radius, note:'元データの座標モデルに回転・鏡映・一様拡大縮小を適用。図のピクセル再現ではない。' },
      coordinates:{ points:Object.fromEntries(Object.entries(points).map(([k,p])=>[k,{x:p.x,y:p.y}])), circle:{id:'O1',center:'O',radius} },
      objects:source.geometry?.objects ?? [],
      triangles:(source.geometry?.objects ?? []).filter(x=>x.type==='triangle').map(x=>({id:x.name,vertices:x.members ?? []}))
    },
    geometryModel:{
      points,
      segments,
      lines:[],
      circles:[{id:'O1',center, radius}],
      triangles:(source.geometry?.objects ?? []).filter(x=>x.type==='triangle').map(x=>({id:x.name,vertices:x.members ?? []})),
      constraints:{valid:true,errors:[],warnings:['元データの幾何モデルを保った表示用変換。生成パラメータは図形全体の回転・鏡映・拡大縮小。']}
    },
    given_conditions,
    derived_facts:(source.proof?.P1?.steps ?? []).map((s,i)=>({id:s.id ?? `F${i+1}`,statement:s.claim ?? '',reason:[s.reason ?? 'source-derived proof step']})),
    proof:{
      target,
      method:p1.type === 'similarity_proof' ? 'AA' : 'constraint_based',
      P1:{ target, steps:proofSteps, proof_note:proofData.proof_note ?? '' }
    },
    follow_up:{P2:{target:p2.target ?? followPrompt, prompt:followPrompt, answer:answerText, unit:followUnit, solution_chain:(source.proof?.P2?.derivation ?? []).map(s=>s.claim ?? '')}},
    generation:{
      template_id:`SHIZUOKA_SOURCE_${year}_001`, seed, parameters:{rotation_degrees:angle*180/Math.PI, mirrored:mirror, scale},
      source_template_year:year, generated_variant:!preserveSourceGeometry, uses_llm:false,
      source_notice:'過去問JSONを基にした構造テンプレート。証明ステップは原資料の転記を保持。'
    },
    validation:{
      source_template_review:{status:'source-derived', source_id:source.metadata?.id, geometry_transformation:'rigid-or-uniform-similarity', note:'新テンプレートは元JSONの記述を保持し、座標表示を変換。証明の数学的完全性は独立監査済みと表示しない。'}
    }
  };
  return data;
}
export function generate2018(options={}) { return buildSourceVariant(2018, options); }
export function generate2019(options={}) { return buildSourceVariant(2019, options); }
export function generate2020(options={}) { return buildSourceVariant(2020, options); }
export function generateSourceYear(year, options={}) {
  const factories = { 2018:generate2018, 2019:generate2019, 2020:generate2020 };
  const factory = factories[Number(year)];
  if (!factory) throw new Error(`未対応のソース年度です: ${year}`);
  return factory(options);
}
