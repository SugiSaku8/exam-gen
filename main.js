import { logger } from './js/logger.js';
import { ProofGenerator } from './js/generator.js';
import { checkProof } from './js/proof_checker.js';
import { generateAutoProblem, getTemplateInfo } from './js/problem_generator.js';
import { createSaveData, downloadSave, readSaveFile, saveBrowser, listBrowserSaves, loadBrowser, deleteBrowser } from './js/storage_manager.js';
import { generateAnswerModel } from './js/answer_generator.js';

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
  if (generateButton) generateButton.textContent = mode === 'generated' ? '作成' : '過去問を表示';
}

function showView(view) {
  $('#setup-view')?.classList.toggle('hidden', view !== 'setup');
  $('#problem-view')?.classList.toggle('hidden', view !== 'problem');
  $('#settings-view')?.classList.toggle('hidden', view !== 'settings');
  $('.bottom-bar')?.classList.toggle('is-before-generation', view !== 'problem');
  if (view !== 'problem') {
    $('#save-menu')?.classList.add('hidden');
    $('#save-button')?.setAttribute('aria-expanded', 'false');
  }
  document.body.classList.remove('sidebar-open');
}


function getAnswerModel(data) {
  return generateAnswerModel(data);
}

function getProofSteps(data) { return getAnswerModel(data).steps; }
function getProofTarget(data) { return getAnswerModel(data).target; }
function getProofMethod(data) {
  const method = getAnswerModel(data).criterion;
  return japaneseProofCriterion(method);
}
function getFollowupAnswer(data) { return getAnswerModel(data).followup; }

function japaneseProofCriterion(value) {
  if (!value) return '';
  const normalized = String(value).trim();
  const labels = {
    AA: '2組の角がそれぞれ等しい',
    AA_similarity: '2組の角がそれぞれ等しい',
    ASA: '1組の辺とその両端の角がそれぞれ等しい',
    one_side_and_two_endpoint_angles: '1組の辺とその両端の角がそれぞれ等しい',
    SAS: '2組の辺とその間の角がそれぞれ等しい',
    SSS: '3組の辺がそれぞれ等しい',
    parallelism_to_parallelogram: '平行四辺形の性質を利用する',
    parallelism_to_parallelograms: '平行四辺形の性質を利用する',
    constraint_based: '図形の条件と性質を利用する',
    proof_graph_traversal: '図形の性質を順に用いる',
    isosceles_triangle_by_equal_base_angles: '底角が等しい三角形の性質を利用する'
  };
  return labels[normalized] ?? normalized;
}

function renderAnswer(data) {
  logger.debug('UI', '決定的ルールから解答を組み立て');
  const content = $('#answer-content');
  if (!content) return;
  const model = getAnswerModel(data);
  const parts = [];
  if (model.target) parts.push(`<div><strong>証明すること：</strong>${escapeHtml(model.target)}</div>`);
  if (model.criterion) parts.push(`<div><strong>証明の基準：</strong>${escapeHtml(japaneseProofCriterion(model.criterion))}</div>`);
  if (model.steps.length) {
    parts.push('<div class="answer-steps">');
    for (const [i, step] of model.steps.entries()) {
      parts.push(`<div class="answer-step"><strong>${i + 1}.</strong> ${escapeHtml(step.statement)}${step.reason ? `<br><span class="muted">理由：${escapeHtml(step.reason)}</span>` : ''}</div>`);
    }
    parts.push('</div>');
  }
  if (model.target) parts.push(`<div class="answer-final">したがって、${escapeHtml(model.target)}。</div>`);
  if (model.followup) {
    parts.push('<div class="answer-followup"><div class="answer-followup-title">追問の答え</div>');
    parts.push(`<div>${escapeHtml(model.followup.prompt)}</div>`);
    if (model.followup.steps.length) parts.push(`<div class="answer-steps">${model.followup.steps.map((step, i) => `<div class="answer-step"><strong>${i + 1}.</strong> ${escapeHtml(step.statement)}</div>`).join('')}</div>`);
    parts.push(`<div class="answer-final">答え：${escapeHtml(model.followup.answer)}${escapeHtml(model.followup.unit)}</div></div>`);
  }
  content.innerHTML = parts.join('') || '<div>この問題には解答に利用できる証明ステップがありません。</div>';
}

function setAnswerVisible(visible) {
  const panel = $('#answer-panel');
  const button = $('#show-answer');
  if (!panel || !button) return;
  panel.classList.toggle('hidden', !visible);
  panel.setAttribute('aria-hidden', String(!visible));
  button.setAttribute('aria-expanded', String(visible));
  button.classList.toggle('is-active', visible);
}

function answerHtmlForPrint(data) {
  const model = getAnswerModel(data);
  const stepHtml = model.steps.map((step, i) => `<div class="print-step"><strong>${i + 1}.</strong> ${escapeHtml(step.statement)}${step.reason ? `<br><span>理由：${escapeHtml(step.reason)}</span>` : ''}</div>`).join('');
  const followHtml = model.followup ? `<div class="print-follow"><h3>追問の答え</h3><p>${escapeHtml(model.followup.prompt)}</p>${model.followup.steps.map((step, i) => `<p>${i + 1}. ${escapeHtml(step.statement)}</p>`).join('')}<p><strong>答え：${escapeHtml(model.followup.answer)}${escapeHtml(model.followup.unit)}</strong></p></div>` : '';
  return `<h2>解答</h2>${model.target ? `<p><strong>証明すること：</strong>${escapeHtml(model.target)}</p>` : ''}${model.criterion ? `<p><strong>証明の基準：</strong>${escapeHtml(japaneseProofCriterion(model.criterion))}</p>` : ''}${stepHtml}${model.target ? `<div class="print-final">したがって、${escapeHtml(model.target)}。</div>` : ''}${followHtml}`;
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

function fitBadgeText(element) {
  if (!element) return;
  const fit = () => {
    const style = getComputedStyle(element);
    const canvas = fitBadgeText.measureCanvas ??= document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const base = element._fitBaseFontSize ?? (element._fitBaseFontSize = Number.parseFloat(style.fontSize) || 24);
    const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const available = Math.max(24, element.clientWidth - horizontalPadding - 4);
    let size = base;
    ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    while (size > 12 && ctx.measureText(element.textContent).width > available) {
      size -= 0.5;
      ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    }
    element.style.fontSize = `${size}px`;
    element.style.whiteSpace = ctx.measureText(element.textContent).width > available ? 'normal' : 'normal';
    element.style.overflowWrap = 'anywhere';
    element.style.lineHeight = '1.15';
  };
  requestAnimationFrame(fit);
  if (!element._fitObserver && 'ResizeObserver' in window) {
    element._fitObserver = new ResizeObserver(fit);
    element._fitObserver.observe(element);
  }
}

function renderProblem(data) {
  logger.info('UI', '問題を画面へ描画', { template: data?.generation?.template_id, year: data?.metadata?.year });
  const meta = data.metadata ?? {};
  const problemInfo = $('#problem-info');
  if (problemInfo) problemInfo.textContent = `${meta.prefecture ?? '静岡県'}　${meta.year ?? ''}年度　数学　${meta.problem_number ?? ''}`;
  const info = getTemplateInfo(data.generation?.template_id);
  const templateBadge = $('#template-badge');
  const target = String(getProofTarget(data));
  const proofType = /≡|合同/.test(target) ? '合同' : /∽|相似/.test(target) ? '相似' : /＝|=/.test(target) ? '長さの等式' : '証明';
  if (templateBadge) templateBadge.textContent = proofType;
  const criterionBadge = $('#criterion-badge');
  if (criterionBadge) { criterionBadge.textContent = japaneseProofCriterion(getProofMethod(data)) || '図形の性質'; fitBadgeText(criterionBadge); }
  const conditions = data.given_conditions ?? [];
  const conditionCount = $('#condition-count');
  if (conditionCount) conditionCount.textContent = `条件:${conditions.length}`;
  if (problemInfo) {

  }
  const conditionsEl = $('#conditions');
  if (conditionsEl) conditionsEl.innerHTML = conditions.map(x => {
    const text = typeof x === 'string' ? x : x.statement ?? '';
    return `<li>${escapeHtml(text)}</li>`;
  }).join('');

  const subproblems = data.problem?.subproblems ?? data.problem?.parts ?? [];
  const problemText = $('#problem-text');
  if (problemText) problemText.innerHTML = subproblems.map(x => `<p><strong>（${escapeHtml(x.label ?? x.id ?? '')}）</strong> ${escapeHtml(x.prompt ?? x.question ?? x.target?.statement ?? '')}</p>`).join('');

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
  showView('problem');
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
      const years = [2014, 2015, 2016, 2017, 2024, 2025, 2026];
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
    } else {
      window.alert(`生成できませんでした。\n${error.message}`);
    }
  }
}

modeButtons.forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode ?? 'generated';
  setMode(mode);
  if (mode === 'past') refresh();
  else { showView('setup'); if (proofAnswer) proofAnswer.value = ''; }
}));
$('#mobile-menu')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
generateButton?.addEventListener('click', refresh);
$('#show-followup')?.addEventListener('change', () => { if (generator.data) renderProblem(generator.data); });
$('#more-options')?.addEventListener('click', () => {
  const button = $('#more-options');
  const panel = $('#advanced-options');
  const open = panel?.classList.contains('hidden');
  panel?.classList.toggle('hidden', !open);
  panel?.classList.toggle('is-open', Boolean(open));
  panel?.setAttribute('aria-hidden', String(!open));
  button?.classList.toggle('is-open', Boolean(open));
  button?.setAttribute('aria-expanded', String(Boolean(open)));
});
$('#settings-button')?.addEventListener('click', () => { modeButtons.forEach(b => b.classList.remove('active')); showView('settings'); });
function openModal({ title, body }) {
  const modal = $('#app-modal');
  if (!modal) return;
  $('#app-modal-title').textContent = title;
  $('#app-modal-body').innerHTML = body;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('#app-modal-close')?.focus();
}
function closeModal() {
  const modal = $('#app-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  $('#hint-button')?.focus();
}
$('#hint-button')?.addEventListener('click', () => {
  if (!generator.data) {
    openModal({ title: 'HINT', body: '<p>まず「作成」から問題を生成してください。</p>' });
    return;
  }
  const model = getAnswerModel(generator.data);
  const conditions = (generator.data.given_conditions ?? []).map(x => typeof x === 'string' ? x : x.statement ?? '').filter(Boolean);
  const hints = [];
  if (model.criterion) hints.push(`<p><strong>証明方法：</strong>${escapeHtml(japaneseProofCriterion(model.criterion))}</p>`);
  if (conditions.length) hints.push(`<p>条件を整理し、仮定から使える性質を探しましょう。</p><ul>${conditions.slice(0, 5).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
  hints.push('<p>図だけを根拠にせず、「仮定より」「円周角の定理より」「平行線の性質より」など、理由を明記してつなげましょう。</p>');
  if (model.steps.length) hints.push(`<p class="hint-subtle">考える手がかり：まずは「${escapeHtml(model.steps[0].statement)}」につながる条件を探してみましょう。</p>`);
  openModal({ title: 'HINT — 解法の手がかり', body: hints.join('') });
});
$('#app-modal-close')?.addEventListener('click', closeModal);
$('#app-modal')?.addEventListener('click', event => { if (event.target === $('#app-modal')) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#app-modal')?.classList.contains('hidden')) closeModal(); });
$('#show-answer')?.addEventListener('click', () => {
  if (!generator.data) {
    openModal({ title: 'ANSWER', body: '<p>まず「作成」から問題を生成してください。</p>' });
    return;
  }
  const panel = $('#answer-panel');
  const isVisible = !panel?.classList.contains('hidden');
  if (isVisible) {
    setAnswerVisible(false);
  } else {
    renderAnswer(generator.data);
    setAnswerVisible(true);
    requestAnimationFrame(() => $('#answer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }
});
$('#save-button')?.addEventListener('click', () => {
  const menu = $('#save-menu');
  const open = menu?.classList.contains('hidden');
  menu?.classList.toggle('hidden', !open);
  $('#save-button')?.setAttribute('aria-expanded', String(Boolean(open)));
  refreshBrowserList();
});
$('#save-menu')?.addEventListener('click', event => {
  const action = event.target.closest('[data-save-action]')?.dataset.saveAction;
  if (!action) return;
  const buttonByAction = { 'browser-save': '#save-browser', 'browser-load': '#load-browser', 'browser-delete': '#delete-browser', 'pc-save': '#save-pc', 'pc-load': '#load-pc' };
  $(buttonByAction[action])?.click();
});
$('#pdf-export')?.addEventListener('click', () => { try { exportPdf(); } catch (error) { showStorageMessage(error.message, true); } });

$('#check-proof')?.addEventListener('click', () => {
  logger.info('CHECK', '証明入力の検証を開始');
  if (!generator.data) {
    result.className = 'bubble proof-result invalid';
    result.textContent = '先に問題を作成するか、過去問を表示してください。';
    return;
  }
  const checked = checkProof(generator.data, proofAnswer?.value ?? '');
  result.className = `bubble proof-result ${checked.valid ? 'valid' : 'invalid'}`;
  logger.info('CHECK', checked.valid ? '基準一致' : '基準未達', checked);
  const title = checked.valid ? '登録済みの確認基準を満たしました' : '確認できていない項目があります';
  const factLabels = {
    'AC=AD':'仮定の辺の等しさ','ACB=ADG':'円周角の等しさ','BAC=BDC':'円周角の等しさ','BDC=DCE':'平行線の角の性質','DCE=GAD':'円周角の等しさ','BAC=GAD':'角の推移','target':'証明目標',
    right1:'直径に対する円周角',right2:'平行線と垂直の関係',bisect:'二等辺三角形の角',arc:'同じ弧に対する円周角',angle2:'角の推移',dfab:'DFとABの平行',adbf:'ADとBFの平行',p1:'平行四辺形の成立',bfad:'BFとADの長さ',p2:'もう一つの平行四辺形',adec:'ADとECの長さ',
    isosceles:'二等辺三角形の条件','base-angles':'二等辺三角形の底角','target-angles':'証明目標に必要な角の等しさ','parallel-angle':'平行線の角の性質','circle-angle':'円周角の性質','angle-transitivity':'角の推移','second-angle':'2組目の角の等しさ','side-equality':'辺の等しさ','given-angle':'仮定の角の等しさ'
  };
  const facts = checked.facts?.length ? `<p><strong>確認した項目：</strong>${checked.facts.map(x => escapeHtml(factLabels[x] ?? x)).join('、')}</p>` : '';
  const errors = checked.errors?.length ? `<ul>${checked.errors.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '';
  const warnings = checked.warnings?.length ? `<ul>${checked.warnings.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '';
  result.innerHTML = `<strong>${title}</strong>${facts}${errors}${warnings}`;
});
$('#clear-proof')?.addEventListener('click', () => {
  if (proofAnswer) proofAnswer.value = '';
  if (result) {
    result.className = 'bubble proof-result';
    result.textContent = '証明を入力すると、ここに判定が表示されます。';
  }
  proofAnswer?.focus();
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
showView('setup');
