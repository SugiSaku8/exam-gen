import { ProofGenerator } from './js/generator.js';
import { checkProof } from './js/proof_checker.js';

const app = document.querySelector('#app-root');
const generator = new ProofGenerator();
const canvasContainer = document.querySelector('#canvas-container');
if (canvasContainer) generator.initializeCanvas(canvasContainer);

const mode = document.querySelector('#mode');
const template = document.querySelector('#template');
const seed = document.querySelector('#seed');
const year = document.querySelector('#year');
const generateButton = document.querySelector('#generate-button');
const problemInfo = document.querySelector('#problem-info');
const conditions = document.querySelector('#conditions');
const problemText = document.querySelector('#problem-text');
const proofAnswer = document.querySelector('#proof-answer');
const checkButton = document.querySelector('#check-proof');
const result = document.querySelector('#proof-result');

function renderProblem(data) {
  const meta = data.metadata ?? {};
  problemInfo.innerHTML = `<strong>${meta.prefecture ?? ''} ${meta.year ?? ''}</strong>　${meta.subject ?? ''}　問題 ${meta.problem_number ?? ''}`;
  conditions.innerHTML = (data.given_conditions ?? []).map(x => `<li>${x}</li>`).join('');
  const p = data.problem?.subproblems ?? [];
  problemText.innerHTML = p.map(x => `<p><strong>${x.id}</strong> ${x.prompt}</p>`).join('');
  generator.draw();
}

async function refresh() {
  try {
    let data;
    if (mode?.value === 'generated') {
      data = generator.generate({ templateId: template?.value, seed: seed?.value || undefined });
    } else {
      data = await generator.load(Number(year?.value ?? 2014));
    }
    renderProblem(data);
    if (result) result.textContent = '';
  } catch (error) {
    if (result) result.textContent = `エラー: ${error.message}`;
  }
}

generateButton?.addEventListener('click', refresh);
mode?.addEventListener('change', () => {
  const generated = mode.value === 'generated';
  if (template) template.disabled = !generated;
  if (seed) seed.disabled = !generated;
  if (year) year.disabled = generated;
});

checkButton?.addEventListener('click', () => {
  const answer = proofAnswer?.value ?? '';
  const checked = checkProof(generator.data, answer);
  if (result) {
    result.className = checked.valid ? 'proof-result valid' : 'proof-result invalid';
    result.innerHTML = checked.valid
      ? '<strong>証明OK</strong><br>決定的ルールによる検証を通過しました。'
      : `<strong>証明NG</strong><ul>${checked.errors.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }
});

refresh();
