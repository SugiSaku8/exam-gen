/**
 * 決定的な解答組み立て器。
 * 既存の証明ステップ・解答テンプレート・導出事実を優先順位に従って利用し、
 * LLMや外部サービスを使わずに画面表示用の解答データへ正規化する。
 */
function asStep(value, index) {
  if (typeof value === 'string') return { id: `S${index + 1}`, statement: value, reason: '' };
  if (!value || typeof value !== 'object') return null;
  const statement = value.statement ?? value.text ?? value.conclusion ?? '';
  if (!statement) return null;
  const reason = Array.isArray(value.reason) ? value.reason.join('、') : (value.reason ?? value.justification ?? '');
  return { id: value.id ?? `S${index + 1}`, statement: String(statement), reason: String(reason) };
}

function getProofSection(proof = {}) {
  return proof.selected_solution ?? proof.P1 ?? proof;
}

export function generateAnswerModel(data = {}) {
  const proof = data.proof ?? {};
  const section = getProofSection(proof);
  const target = proof.target?.statement || (typeof proof.target === 'string' ? proof.target : '')
    || section.target?.statement || section.target || proof.P1?.target || '';
  const criterion = proof.target_decomposition?.japanese_criterion
    ?? proof.target_decomposition?.criterion
    ?? proof.criterion
    ?? section.method
    ?? proof.method
    ?? '';

  let rawSteps = proof.selected_solution?.steps ?? proof.steps ?? section.solution_steps ?? section.steps;
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    const partKey = proof.problem_id ?? 'P1';
    const answerGeneration = data.answer_generation?.[partKey] ?? data.answer_generation?.P1 ?? data.answer_generation;
    rawSteps = answerGeneration?.sentence_templates ?? answerGeneration?.proof_sentence_templates ?? [];
  }
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    // 最後の決定的なフォールバック：表示可能な導出事実だけを使う。
    rawSteps = (data.derived_facts ?? []).filter(f => !f.part || f.part === 'P1').map(f => ({
      statement: f.statement,
      reason: Array.isArray(f.reason) ? `根拠：${f.reason.join('、')}` : (f.reason ?? f.rule ?? '')
    }));
  }
  const steps = rawSteps.map(asStep).filter(Boolean);

  const follow = data.follow_up ?? {};
  const part = (data.problem?.parts ?? data.problem?.subproblems ?? []).find(x => /P2|2/.test(String(x.id ?? x.label ?? '')));
  const followItem = (Array.isArray(follow.problems) ? follow.problems[0] : null) ?? follow.P2 ?? follow;
  let followAnswer = followItem.answer ?? followItem.target?.answer ?? followItem.derived?.answer
    ?? part?.answer ?? part?.target?.answer;
  if (followAnswer && typeof followAnswer === 'object' && 'value' in followAnswer) followAnswer = followAnswer.value;
  const followPrompt = followItem.prompt ?? followItem.question ?? followItem.target?.statement
    ?? followItem.target?.object ?? part?.prompt ?? part?.question ?? part?.target?.statement
    ?? follow.target ?? '';
  let followUnit = followItem.unit ?? followItem.answer?.unit ?? followItem.target?.unit ?? part?.unit ?? '';
  if (followUnit === 'degree' || followUnit === 'degrees') followUnit = '°';
  if (!followUnit && followItem.type === 'angle') followUnit = '°';
  if (!followUnit && followItem.type === 'arc_length') followUnit = ' cm';
  if (followUnit === 'cm' && String(followAnswer).includes('cm')) followUnit = '';
  if (followUnit === ' cm' && String(followAnswer).includes('cm')) followUnit = '';
  let followStepsRaw = followItem.solution_chain ?? followItem.steps ?? followItem.reasoning ?? [];
  if (!followStepsRaw.length && followItem.derived && typeof followItem.derived === 'object') {
    followStepsRaw = Object.entries(followItem.derived).map(([key, value]) => `${key}＝${value}`);
  }
  if (followItem.formula) followStepsRaw = [...followStepsRaw, `用いる式：${followItem.formula}`];
  if (followItem.substitution) followStepsRaw = [...followStepsRaw, `代入すると、${followItem.substitution}`];
  const followSteps = followStepsRaw.map(item => typeof item === 'string' ? item : item?.statement).filter(Boolean);
  const followup = followAnswer !== undefined && followAnswer !== null && followAnswer !== ''
    ? { prompt: String(followPrompt || '追問'), answer: String(followAnswer), unit: String(followUnit), steps: followSteps.map(asStep).filter(Boolean) }
    : null;

  return { target: String(target ?? ''), criterion: String(criterion ?? ''), steps, followup };
}
