import { logger } from './logger.js';
const normalize = s => String(s ?? '').replace(/\s+/g, '').replace(/＝/g, '=').trim();

function parseLines(answer) {
  return String(answer ?? '').split(/\n+/).map((line, i) => {
    const [statement, ...reason] = line.trim().split(/[：:]/);
    return { index: i + 1, raw: normalize(line), statement: normalize(statement), reason: normalize(reason.join(':')) };
  }).filter(x => x.statement);
}

function has(lines, regex) { return lines.some(x => regex.test(x.statement)); }
function reason(lines, statementRegex, reasonRegex) {
  let source = statementRegex.source;
  if (source.startsWith('^')) source = source.slice(1);
  if (source.endsWith('$')) source = source.slice(0, -1);
  const loose = new RegExp(source, statementRegex.flags);
  return lines.some(x => (statementRegex.test(x.statement) || loose.test(x.raw)) && (reasonRegex.test(x.reason) || reasonRegex.test(x.raw)));
}
function result(errors, warnings = [], facts = []) {
  return { valid: errors.length === 0, errors, warnings, facts };
}

function check2014(problem, answer) {
  const lines = parseLines(answer), errors = [], warnings = [], facts = new Set();
  if (reason(lines, /^AC=AD$/, /仮定/)) facts.add('AC=AD');
  if (reason(lines, /^∠ACB=∠ADG$/, /同じ弧AB.*円周角/)) facts.add('ACB=ADG');
  if (reason(lines, /^∠BAC=∠BDC$/, /同じ弧BC.*円周角/)) facts.add('BAC=BDC');
  if (reason(lines, /^∠BDC=∠DCE$/, /平行|錯角/)) facts.add('BDC=DCE');
  if (reason(lines, /^∠DCE=∠GAD$/, /同じ弧DE.*円周角/)) facts.add('DCE=GAD');
  if (reason(lines, /^∠BAC=∠GAD$/, /S03.*S05|推移|BDC.*DCE.*GAD/)) facts.add('BAC=GAD');
  if (reason(lines, /^△ABC[≡=]△AGD$/, /ASA|一辺とその両端の角/)) facts.add('target');
  if (!facts.has('target')) errors.push('△ABC≡△AGDまでの証明が完成していません。');
  return result(errors, warnings, [...facts]);
}

function check2015(problem, answer) {
  const lines = parseLines(answer), errors = [], facts = new Set();
  if (reason(lines, /^∠CEG=90°?$/, /直径|半円/)) facts.add('right1');
  if (reason(lines, /^∠DFB=90°?$/, /平行|垂直|∥/)) facts.add('right2');
  if (reason(lines, /^∠ABF=∠FBD$/, /二等辺|垂線|角の二等分/)) facts.add('bisect');
  if (reason(lines, /^∠ABF=∠GCE$/, /弧AE|円周角/)) facts.add('arc');
  if (reason(lines, /^∠FBD=∠ECG$/, /S03.*S04|推移|ABF.*GCE/)) facts.add('angle2');
  if (lines.some(x => /△FBD[∽=]△ECG/.test(x.raw))) facts.add('target');
  if (!(facts.has('right1') && facts.has('right2') && facts.has('bisect') && facts.has('arc') && facts.has('angle2'))) {
    errors.push('△FBD∽△ECGに必要なAAの根拠が不足しています。');
  }
  if (!facts.has('target')) errors.push('△FBD∽△ECGという結論がありません。');
  return result(errors, [], [...facts]);
}

function check2016(problem, answer) {
  const lines = parseLines(answer), errors = [], facts = new Set();
  if (reason(lines, /^∠ACD=∠ABD$/, /同じ弧AD.*円周角/)) facts.add('arc');
  if (reason(lines, /^DF∥AB$/, /錯角|平行/)) facts.add('dfab');
  if (reason(lines, /^AD∥BF$/, /AD∥BC|一直線|平行/)) facts.add('adbf');
  if (reason(lines, /^(四辺形)?ABFD.*平行四辺形|ABFD.*平行四辺形$/, /2組|平行/)) facts.add('p1');
  if (reason(lines, /^BF=AD$/, /平行四辺形|向かい合う辺/)) facts.add('bfad');
  if (reason(lines, /ADEC.*平行四辺形|四辺形ADEC.*平行四辺形/, /2組|平行/)) facts.add('p2');
  if (reason(lines, /^AD=EC$/, /平行四辺形|向かい合う辺|したがって|よって/)) facts.add('adec');
  if (reason(lines, /^BF=EC$/, /BF=AD=EC|以上|推移/)) facts.add('target');
  if (!facts.has('dfab') || !facts.has('adbf')) errors.push('DF∥AB、AD∥BFの導出が不足しています。');
  if (!facts.has('bfad') || !facts.has('adec')) errors.push('BF=AD、AD=ECの導出が不足しています。');
  if (!facts.has('target')) errors.push('BF=ECという結論がありません。');
  return result(errors, [], [...facts]);
}

function check2017(problem, answer) {
  const lines = parseLines(answer), errors = [], facts = new Set();
  if (reason(lines, /^∠ABD=∠DBC$/, /二等分線/)) facts.add('bisector');
  if (reason(lines, /^弧AD=弧DC$/, /円周角|等しい/)) facts.add('arc');
  if (reason(lines, /^AD=DC$/, /弦|等しい弧/)) facts.add('chord');
  if (reason(lines, /^∠EAG=∠DCE$/, /一直線|二等辺/)) facts.add('angle1');
  if (reason(lines, /^∠BEF=∠EBF$/, /二等辺/)) facts.add('angle2');
  if (reason(lines, /^∠CEF=∠CAB$/, /三角形|内角/)) facts.add('angle3');
  if (reason(lines, /^∠CDE=∠CAB$/, /同じ弧CB|円周角|一直線/)) facts.add('angle4');
  if (reason(lines, /^∠AEG=∠CDE$/, /対頂角|推移|CEF.*CDE/)) facts.add('angle5');
  if (reason(lines, /^△AEG[∽=]△CDE$/, /AA|二角/)) facts.add('target');
  if (!facts.has('angle1') || !facts.has('angle5')) errors.push('相似の2組の角の導出が不足しています。');
  if (!facts.has('target')) errors.push('△AEG∽△CDEという結論がありません。');
  return result(errors, [], [...facts]);
}


function check2024(problem, answer) {
  const lines = parseLines(answer), errors = [], warnings = [], facts = new Set();
  if (!lines.length) return result(['証明を入力してください。']);
  if (reason(lines, /AB=AD|AD=AB/, /仮定|条件/)) facts.add('isosceles');
  if (reason(lines, /∠ABD=∠ADB|∠ADB=∠ABD/, /二等辺|底角|等しい辺/)) facts.add('base-angles');
  if (reason(lines, /∠PAC=.*∠PCA|∠PCA=.*∠PAC/, /一直線|対頂角|平行|角|推移|等しい|よって|したがって/)) facts.add('target-angles');
  if (reason(lines, /PA=PC|PC=PA/, /二等辺|等しい角|逆|したがって|よって/)) facts.add('target');
  if (!facts.has('base-angles')) errors.push('AB＝ADから底角が等しいことを示す行が見つかりません。');
  if (!facts.has('target-angles')) errors.push('∠PAC＝∠PCAを導く根拠が見つかりません。');
  if (!facts.has('target')) errors.push('最終結論 PA＝PC が見つかりません。');
  if (facts.has('target') && facts.has('target-angles')) warnings.push('答案の主な結論は確認できました。角の追跡の細部は答案を読み返して確認してください。');
  return result(errors, warnings, [...facts]);
}

function check2025(problem, answer) {
  const lines = parseLines(answer), errors = [], warnings = [], facts = new Set();
  if (!lines.length) return result(['証明を入力してください。']);
  if (reason(lines, /∠AEF=∠ACB|∠ACB=∠AEF/, /錯角|平行|∥/)) facts.add('parallel-angle');
  if (reason(lines, /∠BPG=∠ACB|∠ACB=∠BPG/, /円周角|同じ弧/)) facts.add('circle-angle');
  if (reason(lines, /∠AEF=∠BPG|∠BPG=∠AEF/, /推移|以上|したがって|よって/)) facts.add('angle-transitivity');
  if (reason(lines, /∠EAF=∠PBG|∠PBG=∠EAF/, /二等辺|BA=BG|仮定|条件|角|よって|したがって|∠/)) facts.add('second-angle');
  if (reason(lines, /△AFE∽△BGP|△BGP∽△AFE/, /二角|相似|それぞれ等しい/)) facts.add('target');
  if (!facts.has('parallel-angle')) errors.push('平行線から得られる錯角の等しさが見つかりません。');
  if (!facts.has('circle-angle')) errors.push('円周角の定理を用いた角の等しさが見つかりません。');
  if (!facts.has('second-angle')) errors.push('相似を示すもう1組の角の等しさが見つかりません。');
  if (!facts.has('target')) errors.push('最終結論 △AFE∽△BGP が見つかりません。');
  if (facts.has('target')) warnings.push('相似の結論は確認できました。角の対応順と各根拠を答案で再確認してください。');
  return result(errors, warnings, [...facts]);
}

function check2026(problem, answer) {
  const lines = parseLines(answer), errors = [], warnings = [], facts = new Set();
  if (!lines.length) return result(['証明を入力してください。']);
  if (reason(lines, /∠ACF=∠DCB|∠DCB=∠ACF/, /仮定|条件/)) facts.add('given-angle');
  if (reason(lines, /∠FAC=∠BDC|∠BDC=∠FAC/, /円周角|同じ弧/)) facts.add('circle-angle');
  if (reason(lines, /∠BDC=∠ACE|∠ACE=∠BDC/, /錯角|平行|∥/)) facts.add('parallel-angle');
  if (reason(lines, /∠AFC=∠DBC|∠DBC=∠AFC/, /推移|外角|角/)) facts.add('second-angle');
  if (reason(lines, /FC=BC|BC=FC/, /二等辺|∠ACB=∠ABC|等しい角|したがって|よって/)) facts.add('side-equality');
  if (reason(lines, /△AFC≡△DBC|△DBC≡△AFC/, /合同|一組|一組の辺|両端の角/)) facts.add('target');
  if (!facts.has('given-angle')) errors.push('仮定の角の等しさ ∠ACF＝∠DCB が見つかりません。');
  if (!facts.has('circle-angle')) errors.push('円周角の定理を用いた角の等しさが見つかりません。');
  if (!facts.has('parallel-angle')) errors.push('平行線の錯角を用いた角の等しさが見つかりません。');
  if (!facts.has('side-equality')) errors.push('合同条件に必要な辺の等しさ FC＝BC の根拠が見つかりません。');
  if (!facts.has('target')) errors.push('最終結論 △AFC≡△DBC が見つかりません。');
  if (facts.has('target')) warnings.push('合同の結論は確認できました。対応する頂点の順序と合同条件を答案で再確認してください。');
  return result(errors, warnings, [...facts]);
}


function checkSourceTemplate(year, problem, answer) {
  const lines = parseLines(answer);
  const expected = (problem?.proof?.P1?.steps ?? []).map(step => normalize(step.statement)).filter(Boolean);
  const matched = expected.filter(statement => lines.some(line => line.statement === statement || line.raw.includes(statement)));
  const target = normalize(problem?.proof?.target ?? problem?.proof?.P1?.target ?? '');
  const targetMatched = lines.some(line => line.statement === target || line.raw.includes(target));
  const errors = [];
  const facts = matched.map((_, i) => `source-step-${i + 1}`);
  if (matched.length < Math.max(1, expected.length - 1)) {
    errors.push(`${year}年度テンプレートの証明ステップが不足しています（${matched.length}/${expected.length}段階を照合）。`);
  }
  if (!targetMatched && target) errors.push(`最終結論「${target}」が答案に見つかりません。`);
  if (targetMatched) facts.push('target');
  return result(errors, ['原資料の登録済み証明ステップとの文字列照合です。別表現・別解は誤判定する場合があります。'], facts);
}

export function checkProof(problem, answer) {
  logger.info('CHECK', 'checkProof開始', { template: problem?.generation?.template_id, answerLength: String(answer ?? '').length });
  if (!String(answer ?? '').trim()) return result(['証明を入力してください。']);
  if (!problem) return result(['問題データがありません。']);
  const template = problem?.generation?.template_id ?? problem?.generation?.source_template ?? '';
  const year = Number(problem?.metadata?.year);
  if (template.includes('ISOSCELES_PARALLEL_ASA') || year === 2014) return check2014(problem, answer);
  if (template === 'SHIZUOKA_DIAMETER_ISOSCELES_AA_001' || year === 2015) return check2015(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001' || year === 2016) return check2016(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001' || year === 2017) return check2017(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_ISOSCELES_MOVING_POINT_ISOSCELES_2024_001' || year === 2024) return check2024(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_SIMILARITY_2025_001' || year === 2025) return check2025(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_CONGRUENCE_2026_001' || year === 2026) return check2026(problem, answer);
  if (['SHIZUOKA_SOURCE_2018_001','SHIZUOKA_SOURCE_2019_001','SHIZUOKA_SOURCE_2020_001'].includes(template) || [2018,2019,2020].includes(year)) {
    return checkSourceTemplate(year, problem, answer);
  }
  return result(['このテンプレートの証明チェッカーは未実装です。判定できる証明パターンが登録されていません。']);
}
