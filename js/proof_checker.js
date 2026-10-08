const normalize = s => String(s ?? '').replace(/\s+/g, '').replace(/＝/g, '=').trim();

function parseLines(answer) {
  return String(answer ?? '').split(/\n+/).map((line, i) => {
    const [statement, ...reason] = line.trim().split(/[：:]/);
    return { index: i + 1, statement: normalize(statement), reason: normalize(reason.join(':')) };
  }).filter(x => x.statement);
}

function has(lines, regex) { return lines.some(x => regex.test(x.statement)); }
function reason(lines, statementRegex, reasonRegex) {
  return lines.some(x => statementRegex.test(x.statement) && reasonRegex.test(x.reason));
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
  if (reason(lines, /^∠DFB=90°?$/, /平行|垂直/)) facts.add('right2');
  if (reason(lines, /^∠ABF=∠FBD$/, /二等辺|垂線|角の二等分/)) facts.add('bisect');
  if (reason(lines, /^∠ABF=∠GCE$/, /弧AE|円周角/)) facts.add('arc');
  if (reason(lines, /^∠FBD=∠ECG$/, /S03.*S04|推移|ABF.*GCE/)) facts.add('angle2');
  if (reason(lines, /^△FBD[∽=]△ECG$/, /AA|二角/)) facts.add('target');
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
  if (reason(lines, /^AD=EC$/, /平行四辺形|向かい合う辺/)) facts.add('adec');
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

export function checkProof(problem, answer) {
  const template = problem?.generation?.template_id ?? problem?.generation?.source_template ?? '';
  const year = Number(problem?.metadata?.year);
  if (template.includes('ISOSCELES_PARALLEL_ASA') || year === 2014) return check2014(problem, answer);
  if (template === 'SHIZUOKA_DIAMETER_ISOSCELES_AA_001' || year === 2015) return check2015(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_PARALLEL_PARALLELOGRAM_LENGTH_001' || year === 2016) return check2016(problem, answer);
  if (template === 'SHIZUOKA_CIRCLE_ANGLE_BISECTOR_ISOSCELES_SIMILARITY_AREA_001' || year === 2017) return check2017(problem, answer);
  return result(['このテンプレートの証明チェッカーは未実装です。']);
}
