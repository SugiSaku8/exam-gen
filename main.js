import { ProofGenerator } from './js/generator.js';
import { checkProof } from './js/proof_checker.js';
import { generateAutoProblem, getTemplateInfo } from './js/problem_generator.js';
import { createSaveData, downloadSave, readSaveFile, saveBrowser, listBrowserSaves, loadBrowser, deleteBrowser } from './js/storage_manager.js';

const generator = new ProofGenerator();
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

function renderProblem(data) {
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
  try {
    if (currentMode === 'past') {
      // 過去問モードでは年度選択UIを持たせず、対応年度からランダムに表示。
      const years = [2014, 2015, 2016, 2017];
      const year = years[Math.floor(Math.random() * years.length)];
      renderProblem(await generator.load(year));
      return;
    }

    const filters = selectedFilters();
    const data = generator.generate({
      seed: seed?.value ? Number(seed.value) : undefined,
      filters,
      rotation: $('#rotate-figure')?.checked ? undefined : 0
    });
    renderProblem(data);
  } catch (error) {
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

$('#check-proof')?.addEventListener('click', () => {
  const checked = checkProof(generator.data, proofAnswer.value);
  result.className = `bubble proof-result ${checked.valid ? 'valid' : 'invalid'}`;
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
