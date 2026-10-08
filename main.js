import { logger } from './js/logger.js';
import { ProofGenerator } from './js/generator.js';
import { checkProof } from './js/proof_checker.js';
import { generateAutoProblem, getTemplateInfo } from './js/problem_generator.js';
import { createSaveData, downloadSave, readSaveFile, saveBrowser, listBrowserSaves, loadBrowser, deleteBrowser } from './js/storage_manager.js';

const generator = new ProofGenerator();
logger.info('APP', 'アプリケーション初期化');
const canvasContainer = document.querySelector('#canvas-container');
if (canvasContainer) generator.initializeCanvas(canvasContainer);

const $ = id => document.querySelector(id);
const modeButtons = document.querySelectorAll('.sidebar-item');
let currentMode = 'generated';

const filterProof = $('#filter-proof');
const filterMethod = $('#filter-method');
const filterDifficulty = $('#filter-difficulty');
const seed = $('#seed');
const generateButton = $('#generate-button');
const proofAnswer = $('#proof-answer');
const result = $('#proof-result');


function currentSaveName() {
  const input = $('#save-name');
  return input?.value?.trim() || $('#problem-info')?.textContent?.trim() || '証明問題';
}

function saveCurrentToPC() {
  if (!generator.data) throw new Error('保存する問題がありません。');
  downloadSave(createSaveData(generator.data, currentSaveName()));
}

function saveCurrentToCookie() {
  if (!generator.data) throw new Error('保存する問題がありません。');
  const saveData = createSaveData(generator.data, currentSaveName());
  const result = saveBrowser(saveData);
  refreshBrowserList();
  const status = result.cookieSaved ? 'ローカルストレージとCookieの両方' : 'ローカルストレージ（Cookieは容量超過のため保存できませんでした）';
  showStorageMessage(`「${saveData.save_name}」を${status}に保存しました。`, !result.cookieSaved);
  return result.id;
}

function showStorageMessage(message, invalid = false) {
  const storageResult = $('#storage-result');
  if (!storageResult) return;
  storageResult.className = `storage-result${invalid ? ' invalid' : ''}`;
  storageResult.textContent = message;
}

function renderLoadedSave(saveData) {
  if (!saveData?.problem) throw new Error('保存データに問題本体がありません。');
  generator.loadData(saveData.problem, 'generated');
  renderProblem(generator.data);
  const nameInput = $('#save-name');
  if (nameInput && saveData.save_name) nameInput.value = saveData.save_name;
  showStorageMessage(`「${saveData.save_name || '無題'}」を読み込みました。`, false);
}

function refreshBrowserList() {
  const select = $('#browser-saves');
  if (!select) return;
  const saves = listBrowserSaves();
  select.innerHTML = '<option value="">保存済み問題を選択</option>';
  for (const item of saves.slice().reverse()) {
    const option = document.createElement('option');
    option.value = item.id;
    const date = item.saved_at ? new Date(item.saved_at).toLocaleString('ja-JP') : '';
    option.textContent = `${item.name || '無題'}${date ? `　(${date})` : ''}`;
    select.appendChild(option);
  }
}

async function loadPCFile(file) {
  if (!file) return;
  try {
    renderLoadedSave(await readSaveFile(file));
  } catch (error) {
    showStorageMessage(error.message, true);
  }
}

function loadSelectedBrowser() {
  const id = $('#browser-saves')?.value;
  if (!id) {
    showStorageMessage('読み込む保存データを選択してください。', true);
    return;
  }
  try {
    renderLoadedSave(loadBrowser(id));
  } catch (error) {
    showStorageMessage(error.message, true);
  }
}

function deleteSelectedBrowser() {
  const id = $('#browser-saves')?.value;
  if (!id) {
    showStorageMessage('削除する保存データを選択してください。', true);
    return;
  }
  const item = listBrowserSaves().find(x => x.id === id);
  deleteBrowser(id);
  refreshBrowserList();
  showStorageMessage(`「${item?.name || '無題'}」をブラウザ保存から削除しました。`, false);
}

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  if (generateButton) {
    generateButton.textContent = mode === 'generated' ? '類題を生成' : '過去問を表示';
  }
}


function getProofSteps(data) {
  const proof = data?.proof;
  if (!proof) return [];
  const selected = proof.selected_solution?.steps;
  if (Array.isArray(selected)) return selected;
  // 生成問題は proof.steps、過去問JSONは selected_solution.steps / P1.solution_steps など、
  // 複数の証明データ形式を持ち得る。優先順位を明示して、
  // 「結論だけ」の表示にならないよう、必ず証明の中間過程を拾う。
  if (Array.isArray(proof.steps)) {
    return proof.steps.map((x, i) => ({
      id: x?.id ?? `S${i + 1}`,
      statement: x?.statement ?? x,
      reason: x?.reason ?? ''
    }));
  }

  const candidates = [proof.P1, proof.P2];
  for (const item of candidates) {
    if (Array.isArray(item?.solution_steps)) {
      return item.solution_steps.map((x, i) => ({
        id: x?.id ?? `S${i + 1}`,
        statement: x?.statement ?? x,
        reason: x?.reason ?? ''
      }));
    }
  }
  return [];
}

function getProofTarget(data) {
  const proof = data?.proof;
  return proof?.target?.statement
    ?? proof?.target
    ?? proof?.P1?.target
    ?? '';
}

function japaneseProofCriterion(value) {
  if (!value) return '';

  const normalized = String(value).trim();

  const labels = {
    AA: '2組の角がそれぞれ等しい',
    AA_similarity: '2組の角がそれぞれ等しい',
    ASA: '1組の辺とその両端の角がそれぞれ等しい',
    SAS: '2組の辺とその間の角がそれぞれ等しい',
    SSS: '3組の辺がそれぞれ等しい',
    parallelism_to_parallelogram: '平行四辺形の性質を利用する',
    parallelism_to_parallelograms: '平行四辺形の性質を利用する',
    constraint_based: '図形の条件と性質を利用する',
    proof_graph_traversal: '図形の性質を順に用いる'
  };

  return labels[normalized] ?? normalized;
}

function getProofMethod(data) {
  const proof = data?.proof;
  const criterion = proof?.target_decomposition?.japanese_criterion
    ?? proof?.target_decomposition?.criterion
    ?? proof?.target_decomposition?.similarity_criterion
    ?? proof?.criterion
    ?? proof?.similarity_criterion
    ?? proof?.P1?.method
    ?? '';

  return japaneseProofCriterion(criterion);
}

function getFollowupAnswer(data) {
  const follow = data?.follow_up;
  if (!follow) return null;
  const candidates = [];
  if (Array.isArray(follow.problems)) candidates.push(...follow.problems);
  for (const value of Object.values(follow)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) candidates.push(value);
  }
  for (const item of candidates) {
    const answer = item?.answer ?? item?.target?.answer ?? item?.derived?.answer;
    if (answer !== undefined && answer !== null && answer !== '') {
      return { prompt: item.prompt ?? item.question ?? item.target?.object ?? '追問', answer, unit: item.unit ?? item.target?.unit ?? '' };
    }
  }
  return null;
}

function renderAnswer(data) {
  logger.debug('UI', '解答表示データを構築');
  const content = $('#answer-content');
  if (!content) return;
  const steps = getProofSteps(data);
  const target = getProofTarget(data);
  const method = getProofMethod(data);
  const follow = getFollowupAnswer(data);
  const parts = [];

  if (target) parts.push(`<div><strong>証明すること：</strong>${escapeHtml(target)}</div>`);
  if (method) parts.push(`<div><strong>証明の基準：</strong>${escapeHtml(method)}</div>`);
  if (steps.length) {
    parts.push('<div class="answer-steps">');
    for (const [i, step] of steps.entries()) {
      const statement = step?.statement ?? '';
      const reason = step?.reason ?? '';
      parts.push(`<div class="answer-step"><strong>${i + 1}.</strong> ${escapeHtml(statement)}${reason ? `<br><span class="muted">理由：${escapeHtml(reason)}</span>` : ''}</div>`);
    }
    parts.push('</div>');
  }
  if (target) parts.push(`<div class="answer-final">したがって、${escapeHtml(target)}。</div>`);
  if (follow) {
    parts.push(`<div class="answer-followup"><div class="answer-followup-title">追問の答え</div><div>${escapeHtml(follow.prompt)}</div><div class="answer-final">答え：${escapeHtml(follow.answer)}${escapeHtml(follow.unit)}</div></div>`);
  }
  content.innerHTML = parts.join('') || '<div>この問題の解答データはありません。</div>';
}

function setAnswerVisible(visible) {
  const panel = $('#answer-panel');
  const button = $('#show-answer');
  if (!panel || !button) return;
  panel.classList.toggle('hidden', !visible);
  button.setAttribute('aria-expanded', String(visible));
}

function answerHtmlForPrint(data) {
  const steps = getProofSteps(data);
  const target = getProofTarget(data);
  const method = getProofMethod(data);
  const follow = getFollowupAnswer(data);
  const stepHtml = steps.map((step, i) => `<div class="print-step"><strong>${i + 1}.</strong> ${escapeHtml(step?.statement ?? '')}${step?.reason ? `<br><span>理由：${escapeHtml(step.reason)}</span>` : ''}</div>`).join('');
  const followHtml = follow ? `<div class="print-follow"><h3>追問の答え</h3><p>${escapeHtml(follow.prompt)}</p><p><strong>答え：${escapeHtml(follow.answer)}${escapeHtml(follow.unit)}</strong></p></div>` : '';
  return `<h2>解答</h2>${target ? `<p><strong>証明すること：</strong>${escapeHtml(target)}</p>` : ''}${method ? `<p><strong>証明の基準：</strong>${escapeHtml(method)}</p>` : ''}${stepHtml}${target ? `<div class="print-final">したがって、${escapeHtml(target)}。</div>` : ''}${followHtml}`;
}

function exportPdf() {
  logger.info('PDF', 'PDF印刷処理を開始');
  if (!generator.data) throw new Error('書き出す問題がありません。');

  const data = generator.data;
  const meta = data.metadata ?? {};
  const title = `${meta.prefecture ?? '静岡県'} ${meta.year ?? ''}年度 数学 証明問題`;
  const canvas = document.querySelector('#canvas-container canvas');
  const image = canvas ? canvas.toDataURL('image/png') : '';
  const conditions = (data.given_conditions ?? [])
    .map(x => `<li>${escapeHtml(typeof x === 'string' ? x : x.statement ?? '')}</li>`)
    .join('');
  const subproblems = (data.problem?.subproblems ?? data.problem?.parts ?? [])
    .map(x => `<p><strong>（${escapeHtml(x.id ?? x.number ?? '')}）</strong> ${escapeHtml(x.prompt ?? x.question ?? '')}</p>`)
    .join('');
  const followups = data.follow_up?.problems ?? Object.values(data.follow_up ?? {})
    .filter(x => x?.question || x?.prompt);
  const followHtml = followups.length && $('#show-followup')?.checked
    ? `<section><h3>追問</h3>${followups.map(x => `<p>${escapeHtml(x.prompt ?? x.question ?? '')}</p>`).join('')}</section>`
    : '';

  // 新しいウィンドウは開かない。
  // 現在のページに印刷専用シートを一時的に追加して window.print() を呼ぶことで、
  // Safari / Chrome のポップアップブロックの影響を受けないようにする。
  const oldSheet = document.getElementById('pdf-print-sheet');
  oldSheet?.remove();

  const sheet = document.createElement('div');
  sheet.id = 'pdf-print-sheet';
  sheet.innerHTML = `
    <section class="pdf-print-page">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">入試対策証明ジェネレーター　／　${escapeHtml(meta.problem_number ?? '')}</div>
      <div class="badge">問題</div>
      <div class="figure">${image ? `<img src="${image}" alt="問題図">` : '<div>図なし</div>'}</div>
      <section class="question"><h3>問題</h3>${subproblems}</section>
      <section><h3>与えられている条件</h3><ul class="conditions">${conditions}</ul></section>
      ${followHtml}
    </section>
    <section class="pdf-print-page pdf-print-answer">
      ${answerHtmlForPrint(data)}
    </section>
  `;
  document.body.appendChild(sheet);

  const cleanup = () => {
    sheet.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  // 印刷用DOMの画像が描画されてから印刷する。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      logger.info('PDF', 'ブラウザ印刷ダイアログを表示');
      window.print();
    });
  });
}

function renderProblem(data) {
  logger.info('UI', '問題を画面へ描画', { template: data?.generation?.template_id, year: data?.metadata?.year });
  const meta = data.metadata ?? {};
  const problemInfo = $('#problem-info');
  if (problemInfo) problemInfo.textContent = `${meta.prefecture ?? '静岡県'}　${meta.year ?? ''}年度　数学　${meta.problem_number ?? ''}`;
  const info = getTemplateInfo(data.generation?.template_id);
  const templateBadge = $('#template-badge');
  if (templateBadge) templateBadge.textContent = info
    ? `${info.year}型　${info.title}　／　難易度 ${'★'.repeat(info.difficulty)}`
    : `${meta.year ?? ''}年度の過去問`;

  const conditions = data.given_conditions ?? [];
  const conditionsEl = $('#conditions');
  if (conditionsEl) conditionsEl.innerHTML = conditions.map(x => {
    const text = typeof x === 'string' ? x : x.statement ?? '';
    return `<li>${escapeHtml(text)}</li>`;
  }).join('');

  const subproblems = data.problem?.subproblems ?? [];
  const problemText = $('#problem-text');
  if (problemText) problemText.innerHTML = subproblems.map(x => `<p><strong>（${escapeHtml(x.id ?? '')}）</strong> ${escapeHtml(x.prompt ?? '')}</p>`).join('');

  const followups = data.follow_up?.problems ?? Object.values(data.follow_up ?? {}).map(x => x?.question ? x : null).filter(Boolean);
  const showFollowup = $('#show-followup')?.checked;
  if (followups.length && showFollowup) {
    $('#followup-block')?.classList.remove('hidden');
    const followupText = $('#followup-text');
    if (followupText) followupText.innerHTML = followups.map(x => `<p>${escapeHtml(x.prompt ?? x.question ?? '')}</p>`).join('');
  } else {
    $('#followup-block')?.classList.add('hidden');
    const followupText = $('#followup-text');
    if (followupText) followupText.innerHTML = '';
  }

  generator.draw();
  if (result) {
    result.className = 'bubble proof-result';
    result.textContent = '証明を入力すると、ここに判定が表示されます。';
  }
  if (proofAnswer) proofAnswer.value = '';
  renderAnswer(data);
  setAnswerVisible(false);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function selectedFilters() {
  return {
    proofType: filterProof?.value ?? 'all',
    method: filterMethod?.value ?? 'all',
    features: [...document.querySelectorAll('input[name=feature-filter]:checked')].map(x => x.value),
    difficulty: filterDifficulty?.value ?? 'all'
  };
}

async function refresh() {
  const finish = logger.time('APP', `refresh [mode=${currentMode}]`);
  try {
    if (currentMode === 'past') {
      // 過去問モードでは年度選択UIを持たせず、対応年度からランダムに表示。
      const years = [2014, 2015, 2016, 2017];
      const year = years[Math.floor(Math.random() * years.length)];
      logger.info('APP', `過去問モード: ${year}年度を読み込み`);
      const data = await generator.load(year);
      renderProblem(data);
      finish({ mode: currentMode, year });
      return;
    }

    const filters = selectedFilters();
    const data = generator.generate({
      seed: seed?.value ? Number(seed.value) : undefined,
      filters,
      rotation: $('#rotate-figure')?.checked ? undefined : 0
    });
    renderProblem(data);
    finish({ mode: currentMode, template: data?.generation?.template_id });
  } catch (error) {
    logger.error('APP', 'refreshに失敗', error);
    if (result) {
      result.className = 'bubble proof-result invalid';
      result.innerHTML = `<strong>生成できませんでした。</strong><br>${escapeHtml(error.message)}`;
    }
  }
}

modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('#new-chat')?.addEventListener('click', () => { setMode('generated'); if (proofAnswer) proofAnswer.value = ''; refresh(); });
$('#mobile-menu')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
generateButton?.addEventListener('click', refresh);
$('#show-followup')?.addEventListener('change', () => { if (generator.data) renderProblem(generator.data); });

$('#show-answer')?.addEventListener('click', () => setAnswerVisible($('#answer-panel')?.classList.contains('hidden')));
$('#pdf-export')?.addEventListener('click', () => { try { exportPdf(); } catch (error) { showStorageMessage(error.message, true); } });

$('#check-proof')?.addEventListener('click', () => {
  logger.info('CHECK', '証明入力の検証を開始');
  const checked = checkProof(generator.data, proofAnswer.value);
  result.className = `bubble proof-result ${checked.valid ? 'valid' : 'invalid'}`;
  logger.info('CHECK', checked.valid ? '証明OK' : '証明NG', checked);
  result.innerHTML = checked.valid
    ? '<strong>証明OK</strong><br>決定的ルールによる証明検証を通過しました。'
    : `<strong>証明NG</strong><ul>${checked.errors.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
});

$('#save-pc')?.addEventListener('click', () => {
  try { saveCurrentToPC(); showStorageMessage('JSONファイルとして保存しました。', false); }
  catch (error) { showStorageMessage(error.message, true); }
});
$('#load-pc')?.addEventListener('click', () => $('#load-file')?.click());
$('#load-file')?.addEventListener('change', event => {
  loadPCFile(event.target.files?.[0]);
  event.target.value = '';
});
$('#save-browser')?.addEventListener('click', () => {
  try { saveCurrentToCookie(); }
  catch (error) { showStorageMessage(error.message, true); }
});
$('#load-browser')?.addEventListener('click', loadSelectedBrowser);
$('#delete-browser')?.addEventListener('click', deleteSelectedBrowser);
refreshBrowserList();

setMode('generated');
refresh();
