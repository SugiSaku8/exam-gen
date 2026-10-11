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
    parts.push(`<div class="answer-followup"><div class="answer-followup-title">追問</div><div>${escapeHtml(follow.prompt)}</div><div class="answer-final"><strong>${escapeHtml(follow.answer)}${escapeHtml(follow.unit)}</strong></div></div>`);
  }
  content.innerHTML = parts.join('') || '<div>この問題の解答データはありません。</div>';
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
  document.querySelector('#setup-view')?.classList.add('hidden');
  document.querySelector('#problem-view')?.style.setProperty('display', 'block');
  logger.info('UI', '問題を画面へ描画', { template: data?.generation?.template_id, year: data?.metadata?.year });
  const meta = data.metadata ?? {};
  const info = getTemplateInfo(data.generation?.template_id);
  const templateBadge = $('#template-badge');
  if (templateBadge) templateBadge.textContent = /相似|similar/i.test(`${info?.title ?? ''} ${data?.proof?.type ?? ''}`) ? '相似' : (info?.title ?? window.PROBLEM_CONTENT?.typeFallback ?? '証明');
  const criterionBadge = $('#criterion-badge');
  const criterionRaw = data?.proof?.target_decomposition?.japanese_criterion
    ?? data?.proof?.target_decomposition?.criterion
    ?? data?.proof?.target_decomposition?.similarity_criterion
    ?? data?.proof?.criterion
    ?? data?.proof?.similarity_criterion
    ?? data?.proof?.P1?.method ?? '';
  const criterionLabels = { SAS: '2辺と角', SSS: '3辺', AA: '2組の角', AA_similarity: '2組の角', ASA: '1辺と両端の角', parallelism_to_parallelogram: '平行四辺形' };
  if (criterionBadge) criterionBadge.textContent = criterionLabels[criterionRaw] ?? (criterionRaw ? japaneseProofCriterion(criterionRaw) : (window.PROBLEM_CONTENT?.criterionFallback ?? '2辺と角'));
  const problemInfo = $('#problem-info');
  if (problemInfo) problemInfo.textContent = window.PROBLEM_CONTENT?.difficultyStars ?? '★★★★★★★★';

  const conditions = data.given_conditions ?? [];
  const conditionCount = $('#condition-count');
  if (conditionCount) conditionCount.textContent = `条件:${conditions.length}`;
  const conditionsEl = $('#conditions');
  if (conditionsEl) conditionsEl.innerHTML = conditions.map(x => {
    const text = typeof x === 'string' ? x : x.statement ?? '';
    return `<li>${escapeHtml(text)}</li>`;
  }).join('');

  const subproblems = data.problem?.subproblems ?? [];
  const problemText = $('#problem-text');
  if (problemText) problemText.innerHTML = subproblems.map(x => `<p><strong>（${escapeHtml(x.id ?? '')}）</strong> ${escapeHtml(x.prompt ?? '')}</p>`).join('');

  const followups = data.follow_up?.problems ?? Object.values(data.follow_up ?? {}).map(x => x?.question ? x : null).filter(Boolean);
  const showFollowup = true;
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
  renderAnswer(data);
  setAnswerVisible(false);
  document.querySelector('.bottom-bar')?.classList.remove('is-before-generation');
  window.fitProblemPanelText?.();
}

function japaneseGeometryText(value) {
  let text = String(value ?? '').trim();
  if (!text) return text;
  const exact = new Map([
    ['CP is a diameter of circle O', '線分CPは円Oの直径である'],
    ['CP is a diameter of 円O', '線分CPは円Oの直径である'],
    ['radius O=20 cm', '円Oの半径は20センチメートル'],
    ['radius O = 20 cm', '円Oの半径は20センチメートル'],
    ['arc BC=32/3π cm', '弧BCの長さは（32/3）πセンチメートル'],
    ['arc BC = 32/3π cm', '弧BCの長さは（32/3）πセンチメートル']
  ]);
  if (exact.has(text)) return exact.get(text);

  text = text
    .replace(/\b([A-Z]{2})\s+is\s+a\s+diameter\s+of\s+(?:circle\s+|円)?([A-Z])\b/gi, '線分$1は円$2の直径である')
    .replace(/\bdiameter\s+([A-Z]{2})\s+of\s+(?:circle\s+|円)?([A-Z])\b/gi, '円$2の直径は線分$1である')
    .replace(/\bradius\s+([A-Z])\s*=\s*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?\s*(?:π|pi)?)\s*(cm|mm|m)?\b/gi, (_, o, n, unit='') => `円${o}の半径は${n.replace(/\s*/g,'')} ${unit ? japaneseUnit(unit) : ''}`.trim())
    .replace(/\barc\s+([A-Z]{2})\s*=\s*([^,;]+?)\s*(cm|mm|m)\b/gi, (_, points, amount, unit) => `弧${points}の長さは${normalizeMathAmount(amount)}${japaneseUnit(unit)}`)
    .replace(/\b([A-Z]{2})\s+is\s+an?\s+arc\b/gi, '弧$1である')
    .replace(/\b([A-Z])\s+is\s+the\s+center\s+of\s+(?:circle\s+)?([A-Z])\b/gi, '点$1は円$2の中心である')
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*(?:\s+and\s+[A-Z])?)\s+(?:are|lie)\s+on\s+(?:circle\s+)?([A-Z])\b/gi, (_, points, o) => `点${points.replace(/\s+and\s+/gi,'、').replace(/\s*,\s*/g,'、')}は円${o}上にある`)
    .replace(/\b([A-Z](?:\s*,\s*[A-Z])*(?:\s+and\s+[A-Z])?)\s+(?:are|lie)\s+on\s+circle\s+([A-Z])\b/gi, (_, points, o) => `点${points.replace(/\s+and\s+/gi,'、').replace(/\s*,\s*/g,'、')}は円${o}上にある`)
    .replace(/\bcircle\s+([A-Z])\b/gi, '円$1')
    .replace(/\bangle\s*([A-Z]{3})\b/gi, '角$1')
    .replace(/\bangle\s*([A-Z])\s*([A-Z])\s*([A-Z])\b/gi, '角$1$2$3')
    .replace(/\barc\s+([A-Z]{2})\b/gi, '弧$1')
    .replace(/\bsegment\s+([A-Z]{2})\b/gi, '線分$1')
    .replace(/\bline\s+([A-Z]{2})\b/gi, '直線$1')
    .replace(/\bperpendicular to\b/gi, 'に垂直である')
    .replace(/\bis perpendicular to\b/gi, 'は…に垂直である')
    .replace(/\bparallel to\b/gi, 'に平行である')
    .replace(/\bis parallel to\b/gi, 'は…に平行である')
    .replace(/\bequal to\b/gi, 'に等しい')
    .replace(/\bis equal to\b/gi, 'は…に等しい')
    .replace(/\bis\s+a\s+diameter\s+of\s+/gi, 'は…の直径である ')
    .replace(/\bdiameter\b/gi, '直径')
    .replace(/\bradius\b/gi, '半径')
    .replace(/\barc\b/gi, '弧')
    .replace(/\bcm\b/gi, 'センチメートル')
    .replace(/\bmm\b/gi, 'ミリメートル')
    .replace(/\bm\b/g, 'メートル')
    .replace(/\bare on\b/gi, 'は…上にある')
    .replace(/\blie on\b/gi, 'は…上にある');
  return text;
}

function japaneseUnit(unit) {
  return ({ cm: 'センチメートル', mm: 'ミリメートル', m: 'メートル' })[String(unit).toLowerCase()] ?? unit;
}
function normalizeMathAmount(amount) {
  return String(amount).trim().replace(/\s*\/\s*/g, '/').replace(/\s*π\s*/g, 'π').replace(/\bpi\b/gi, 'π');
}
function escapeHtml(value) {
  return japaneseGeometryText(value).replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
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
      seed: Math.floor(Math.random() * 2_147_483_646) + 1,
      filters,
      rotation: undefined
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
$('#new-chat')?.addEventListener('click', () => { setMode('generated'); document.querySelector('#problem-view')?.style.setProperty('display', 'none'); document.querySelector('#setup-view')?.classList.remove('hidden'); document.querySelector('.bottom-bar')?.classList.add('is-before-generation'); if (proofAnswer) proofAnswer.value = ''; });
$('#mobile-menu')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));

// 設定画面への切り替え
const settingsButton = $('#settings-button');
const settingsView = $('#settings-view');
const setupView = $('#setup-view');
const problemView = $('#problem-view');
const bottomBar = document.querySelector('.bottom-bar');
settingsButton?.addEventListener('click', () => {
  setupView?.classList.add('hidden');
  problemView?.classList.add('hidden');
  settingsView?.classList.remove('hidden');
  bottomBar?.classList.add('hidden');
  modeButtons.forEach(button => button.classList.remove('active'));
  settingsButton.classList.add('active');
  document.body.classList.remove('sidebar-open');
});
$('#new-chat')?.addEventListener('click', () => {
  settingsView?.classList.add('hidden');
  setupView?.classList.remove('hidden');
  bottomBar?.classList.remove('hidden');
  settingsButton?.classList.remove('active');
});


// 詳細設定パネルの開閉（HTML内のインライン処理に依存せず main.js で管理）
const moreOptionsButton = $('#more-options');
const advancedOptionsPanel = $('#advanced-options');
if (moreOptionsButton && advancedOptionsPanel) {
  const syncAdvancedOptions = opening => {
    advancedOptionsPanel.classList.toggle('hidden', !opening);
    advancedOptionsPanel.classList.toggle('is-open', opening);
    moreOptionsButton.classList.toggle('is-open', opening);
    moreOptionsButton.setAttribute('aria-expanded', String(opening));
    advancedOptionsPanel.setAttribute('aria-hidden', String(!opening));
  };
  // HTMLの初期状態を保ちつつ、ボタンで確実に開閉できるようにする。
  syncAdvancedOptions(!advancedOptionsPanel.classList.contains('hidden'));
  moreOptionsButton.addEventListener('click', () => {
    const opening = advancedOptionsPanel.classList.contains('hidden');
    syncAdvancedOptions(opening);
  });
}
generateButton?.addEventListener('click', refresh);
$('#show-followup')?.addEventListener('change', () => { if (generator.data) renderProblem(generator.data); });

$('#show-answer')?.addEventListener('click', () => setAnswerVisible($('#answer-panel')?.classList.contains('hidden')));
$('#pdf-export')?.addEventListener('click', () => { try { exportPdf(); } catch (error) { showStorageMessage(error.message, true); } });



// SAVEボタンに保存・ロード操作を集約。メニュー内の操作は既存処理を再利用する。
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
$('#save-button')?.addEventListener('click', () => {
  const panel = $('#save-menu');
  if (panel) {
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    $('#save-button')?.setAttribute('aria-expanded', String(opening));
  }
});
$('#save-menu')?.addEventListener('click', event => {
  const action = event.target.closest('[data-save-action]')?.dataset.saveAction;
  if (!action) return;
  if (action === 'browser-save') $('#save-browser')?.click();
  if (action === 'browser-load') $('#load-browser')?.click();
  if (action === 'browser-delete') $('#delete-browser')?.click();
  if (action === 'pc-save') $('#save-pc')?.click();
  if (action === 'pc-load') $('#load-pc')?.click();
  if (action !== 'noop') $('#save-menu')?.classList.add('hidden');
});
refreshBrowserList();

setMode('generated');
refresh();


/* DOMに関する文字フィット・監視処理もこのファイルに集約 */
/*
 * 問題画面の表示内容とフォントフィット設定。
 * 表示文言は PROBLEM_CONTENT、パネル別の設定は panelFit を編集してください。
 */
(() => {
  'use strict';
  window.PROBLEM_CONTENT = {
    difficultyStars: '★★★★★★★★',
    typeFallback: '相似',
    criterionFallback: '2辺と角',
    conditionLabel: '条件',
    followupHeading: '追問',
    answerButton: 'ANSWER',
    saveButton: 'SAVE',
    pdfButton: 'PDF',
    panelFit: {
      '.type-pill, .meta-pill, .difficulty-pill': { min: 14, max: 34, step: 0.25 },
      '.question-panel': { min: 12, max: 21, step: 0.25 },
      '.solution-panel': { min: 11, max: 17, step: 0.25 },
      '.conditions-block li': { min: 12, max: 21, step: 0.25 },
      '.answer-steps': { min: 11, max: 17, step: 0.25 }
    }
  };

  function overflows(el) {
    // 1px tolerance avoids repeated resizing from subpixel rounding.
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  }

  function fitOne(el, config) {
    if (!el || !el.isConnected || el.clientWidth < 2) return;
    const computed = getComputedStyle(el);
    const original = Number.parseFloat(el.dataset.fitOriginal || computed.fontSize) || config.max;
    if (!el.dataset.fitOriginal) el.dataset.fitOriginal = String(original);
    const start = Math.min(config.max, original);
    // Reset to a known size before every measurement, so resizing larger can restore type.
    el.style.fontSize = `${start}px`;
    let size = start;
    let guard = 0;
    while (overflows(el) && size > config.min && guard++ < 200) {
      size = Math.max(config.min, Math.round((size - config.step) * 100) / 100);
      el.style.fontSize = `${size}px`;
    }
    el.classList.toggle('font-fit-minimum', overflows(el));
  }

  function fitAll() {
    const configs = window.PROBLEM_CONTENT.panelFit;
    for (const [selector, config] of Object.entries(configs)) {
      document.querySelectorAll(selector).forEach(el => fitOne(el, config));
    }
  }

  let queued = false;
  function scheduleFit() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fitAll();
    });
  }
  window.fitProblemPanelText = scheduleFit;
  document.addEventListener('DOMContentLoaded', () => {
    scheduleFit();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scheduleFit);
      document.querySelectorAll('.problem-topline,.problem-layout,.figure-panel,.question-panel,.solution-panel').forEach(el => observer.observe(el));
    }
    window.addEventListener('resize', scheduleFit, { passive: true });
    document.addEventListener('click', event => {
      if (event.target.closest('#generate-button, #show-answer, #answer-button')) scheduleFit();
    });
  });
})();

