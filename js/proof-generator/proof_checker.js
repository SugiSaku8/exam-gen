const FACTS = {
  AC_EQ_AD: 'AC=AD',
  ACB_EQ_ADG: '∠ACB=∠ADG',
  BAC_EQ_BDC: '∠BAC=∠BDC',
  BDC_EQ_DCE: '∠BDC=∠DCE',
  DCE_EQ_GAD: '∠DCE=∠GAD',
  BAC_EQ_GAD: '∠BAC=∠GAD',
  ABC_CONGRUENT_AGD: '△ABC≡△AGD'
};

const REASONS = {
  premise: /仮定より/,
  sameArcAB: /同じ弧\s*AB\s*に対する円周角/,
  sameArcBC: /同じ弧\s*BC\s*に対する円周角/,
  sameArcDE: /同じ弧\s*DE\s*に対する円周角/,
  parallel: /BD\s*[∥||]\s*CE|BD.*CE.*平行/,
  alternate: /錯角/,
  asa: /ASA|一辺とその両端の角/,
  chain: /S03.*S05|BAC.*BDC.*DCE.*GAD|推移/,
};

function normalize(s) {
  return String(s ?? '').replace(/\s+/g, '').replace(/∠/g, '∠');
}

function detectStatement(statement) {
  const s = normalize(statement);
  for (const [key, value] of Object.entries(FACTS)) if (s === normalize(value)) return key;
  return null;
}

function reasonMatches(reason, type) { return REASONS[type]?.test(String(reason ?? '')) ?? false; }

function check2014(problem, answer) {
  const errors = [], warnings = [], accepted = [], lines = String(answer ?? '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const facts = new Set();
  const steps = lines.map((line,index) => {
    const parts = line.split(/[：:]/,2);
    const statement = parts[0]?.trim() ?? line;
    const reason = parts[1]?.trim() ?? '';
    return { index:index+1, statement, reason, fact:detectStatement(statement) };
  });

  for (const step of steps) {
    switch (step.fact) {
      case 'AC_EQ_AD':
        if (!reasonMatches(step.reason,'premise')) errors.push(`${step.index}行目: AC=ADの理由が「仮定より」ではありません。`);
        else facts.add('AC_EQ_AD');
        break;
      case 'ACB_EQ_ADG':
        if (!reasonMatches(step.reason,'sameArcAB')) errors.push(`${step.index}行目: ∠ACB=∠ADGの理由が不正です。`);
        else facts.add('ACB_EQ_ADG');
        break;
      case 'BAC_EQ_BDC':
        if (!reasonMatches(step.reason,'sameArcBC')) errors.push(`${step.index}行目: ∠BAC=∠BDCの理由が不正です。`);
        else facts.add('BAC_EQ_BDC');
        break;
      case 'BDC_EQ_DCE':
        if (!(reasonMatches(step.reason,'parallel') || reasonMatches(step.reason,'alternate'))) errors.push(`${step.index}行目: ∠BDC=∠DCEの理由が不正です。`);
        else facts.add('BDC_EQ_DCE');
        break;
      case 'DCE_EQ_GAD':
        if (!reasonMatches(step.reason,'sameArcDE')) errors.push(`${step.index}行目: ∠DCE=∠GADの理由が不正です。`);
        else facts.add('DCE_EQ_GAD');
        break;
      case 'BAC_EQ_GAD':
        if (!(facts.has('BAC_EQ_BDC') && facts.has('BDC_EQ_DCE') && facts.has('DCE_EQ_GAD')) || !reasonMatches(step.reason,'chain')) errors.push(`${step.index}行目: ∠BAC=∠GADの導出が不正です。`);
        else facts.add('BAC_EQ_GAD');
        break;
      case 'ABC_CONGRUENT_AGD':
        if (!(facts.has('AC_EQ_AD') && facts.has('ACB_EQ_ADG') && facts.has('BAC_EQ_GAD')) || !reasonMatches(step.reason,'asa')) errors.push(`${step.index}行目: ASAによる合同の理由が不正です。`);
        else { facts.add('ABC_CONGRUENT_AGD'); accepted.push(step); }
        break;
      default:
        warnings.push(`${step.index}行目: 認識できない記述です。`);
    }
  }

  if (!facts.has('ABC_CONGRUENT_AGD')) errors.push('△ABC≡△AGDまでの証明が完成していません。');
  return { valid:errors.length===0, errors, warnings, accepted, facts:[...facts] };
}

export function checkProof(problem, answer) {
  const template = problem?.generation?.template_id ?? 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001';
  if (template === 'SHIZUOKA_CIRCLE_ISOSCELES_PARALLEL_ASA_001') return check2014(problem, answer);
  return { valid:false, errors:['このテンプレートの証明チェッカーは未実装です。'], warnings:[], accepted:[], facts:[] };
}
