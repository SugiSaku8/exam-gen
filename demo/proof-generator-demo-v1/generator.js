/**
 * Proof Generator
 * アプリ全体の統合処理だけを担当する。
 */

import { loadJsonMap } from "./json_loader.js";
import {
  analyzeProblem,
  canDeriveFact
} from "./json_analyzer.js";
import { CanvasManager } from "./canvas_manager.js";
import { Drawer } from "./drawer.js";

const DATA_PATHS = {
  2014: "./data/2014.json",
  2015: "./data/2015.json"
};

export const appMeta = {
  name: "proof-generator",
  title: "入試対策証明ジェネレーター",
  icon: ""
};

export async function appInit(shell) {
  const root = document.getElementById("app-root");

  if (!root) {
    console.error("ProofGenerator: #app-rootが見つかりません");
    return;
  }

  root.innerHTML = `
    <div class="pg">
      <header class="pg-header">
        <div>
          <div class="pg-kicker">SHIZUOKA PREFECTURE · MATHEMATICS</div>
          <h1>入試対策証明ジェネレーター</h1>
        </div>

        <div class="pg-controls">
          <label>
            年度
            <select id="pg-year"></select>
          </label>

          <label>
            問題
            <select id="pg-subproblem"></select>
          </label>
        </div>
      </header>

      <main class="pg-grid">
        <section class="pg-card pg-diagram-card">
          <div class="pg-card-title">図形</div>
          <div class="pg-canvas-wrap">
            <canvas id="pg-canvas"></canvas>
          </div>
        </section>

        <section class="pg-card">
          <div class="pg-card-title">問題情報</div>
          <div id="pg-info"></div>
        </section>

        <section class="pg-card">
          <div class="pg-card-title">条件</div>
          <div id="pg-conditions"></div>
        </section>

        <section class="pg-card pg-proof-card">
          <div class="pg-card-title">証明</div>
          <div id="pg-proof"></div>
        </section>
      </main>

      <div id="pg-status" class="pg-status"></div>
    </div>
  `;

  injectStyles();

  const yearSelect = root.querySelector("#pg-year");
  const subproblemSelect = root.querySelector("#pg-subproblem");
  const canvas = root.querySelector("#pg-canvas");

  const dataMap = await loadJsonMap(DATA_PATHS);
  const analyzedMap = Object.fromEntries(
    Object.entries(dataMap).map(([year, data]) => [
      year,
      analyzeProblem(data)
    ])
  );

  const canvasManager = new CanvasManager(canvas, {
    width: 720,
    height: 520
  });

  const drawer = new Drawer(canvasManager);

  for (const year of Object.keys(dataMap)) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year}年度`;
    yearSelect.appendChild(option);
  }

  function render() {
    const year = yearSelect.value;
    const analyzed = analyzedMap[year];

    if (!analyzed) return;

    renderSubproblemSelect(subproblemSelect, analyzed);
    renderProblem(analyzed, subproblemSelect.value);

    drawer.drawGeometry(analyzed.geometry);

    root.querySelector("#pg-status").textContent =
      `${analyzed.metadata.year}年度・${analyzed.metadata.problemNumber} ／ ` +
      `${analyzed.metadata.points}点`;
  }

  yearSelect.addEventListener("change", render);

  subproblemSelect.addEventListener("change", () => {
    const analyzed = analyzedMap[yearSelect.value];
    renderProblem(analyzed, subproblemSelect.value);
  });

  render();

  return {
    destroy() {
      // 必要になったらイベント解除などを追加。
    }
  };
}

function renderSubproblemSelect(select, analyzed) {
  select.innerHTML = "";

  for (const problem of analyzed.problem.subproblems) {
    const option = document.createElement("option");
    option.value = problem.id;
    option.textContent =
      `${problem.number} ${problem.type}（${problem.points}点）`;
    select.appendChild(option);
  }
}

function renderProblem(analyzed, subproblemId) {
  const subproblem =
    analyzed.problem.subproblems.find(p => p.id === subproblemId);

  renderInfo(analyzed, subproblem);
  renderConditions(analyzed, subproblem);
  renderProof(analyzed, subproblem);
}

function renderInfo(analyzed, subproblem) {
  const el = document.querySelector("#pg-info");

  const tags = analyzed.metadata.tags
    .map(tag => `<span class="pg-tag">${escapeHtml(tag)}</span>`)
    .join("");

  el.innerHTML = `
    <div class="pg-info-main">
      <strong>${escapeHtml(analyzed.metadata.section ?? analyzed.problem.section)}</strong>
      <span>${escapeHtml(analyzed.metadata.prefecture)}・${escapeHtml(String(analyzed.metadata.year))}</span>
    </div>
    <div class="pg-tags">${tags}</div>
  `;
}

function renderConditions(analyzed, subproblem) {
  const el = document.querySelector("#pg-conditions");

  const conditions = [...analyzed.conditions];

  if (subproblem?.id === "P2") {
    const follow = analyzed.followUp.problems.find(p => p.id === "P2");

    if (follow) {
      for (const given of follow.given ?? []) {
        conditions.push({
          id: given.id,
          displayText: given.display_text ??
            `${given.object ?? given.objects?.join("，") ?? ""} = ${given.value ?? ""}`
        });
      }
    }
  }

  el.innerHTML = `
    <ol class="pg-condition-list">
      ${conditions.map(c => `
        <li>
          <span class="pg-condition-id">${escapeHtml(c.id)}</span>
          ${escapeHtml(c.displayText)}
        </li>
      `).join("")}
    </ol>
  `;
}

function renderProof(analyzed, subproblem) {
  const el = document.querySelector("#pg-proof");

  if (subproblem?.type !== "proof") {
    const follow = analyzed.followUp.problems.find(
      p => p.id === subproblem?.id
    );

    if (!follow) {
      el.innerHTML = "<p>この小問には証明入力はありません。</p>";
      return;
    }

    el.innerHTML = `
      <div class="pg-target">
        <span>求める角</span>
        <strong>${escapeHtml(follow.target?.object ?? "")}</strong>
        <strong>${escapeHtml(String(follow.target?.answer ?? ""))}°</strong>
      </div>
      <div class="pg-answer-box">
        <label>あなたの答え</label>
        <input id="pg-angle-answer" type="number" min="0" max="180">
        <button id="pg-check-angle">判定</button>
      </div>
      <div id="pg-answer-result"></div>
    `;

    document.querySelector("#pg-check-angle")
      .addEventListener("click", () => {
        const input = Number(
          document.querySelector("#pg-angle-answer").value
        );

        const correct = input === follow.target.answer;
        document.querySelector("#pg-answer-result").innerHTML = correct
          ? `<div class="pg-correct">正解です。</div>`
          : `<div class="pg-wrong">不正解です。正答：${follow.target.answer}°</div>`;
      });

    return;
  }

  const target = analyzed.proof.target;

  el.innerHTML = `
    <div class="pg-target">
      <span>証明せよ</span>
      <strong>${escapeHtml(target.statement ?? "")}</strong>
    </div>

    <div class="pg-proof-input">
      <label>証明の流れ</label>
      <textarea id="pg-proof-text"
        placeholder="例：AC＝AD。弧ABに対する円周角は等しいので…"></textarea>

      <button id="pg-check-proof">証明を判定</button>
      <div id="pg-proof-result"></div>
    </div>

    <details class="pg-model">
      <summary>模範解答を見る</summary>
      <ol>
        ${analyzed.proof.steps.map(step => `
          <li>
            <strong>${escapeHtml(step.statement)}</strong>
            <span>${escapeHtml(step.reason)}</span>
          </li>
        `).join("")}
      </ol>
    </details>
  `;

  document.querySelector("#pg-check-proof")
    .addEventListener("click", () => {
      checkProof(analyzed);
    });
}

function checkProof(analyzed) {
  const result = document.querySelector("#pg-proof-result");

  // 初版では、入力文に必要な数学的要素が含まれているかを確認する。
  // 将来はここを完全な証明グラフ検証へ置き換える。
  const text = document.querySelector("#pg-proof-text").value;

  const keywords = [
    "AC",
    "AD",
    "∠ACB",
    "∠ADG",
    "∠BAC",
    "∠GAD"
  ];

  const matched = keywords.filter(keyword => text.includes(keyword));

  if (matched.length === keywords.length) {
    result.innerHTML = `
      <div class="pg-correct">
        必要な主要要素を確認しました。
        <br>
        ${matched.join("・")}
      </div>
    `;
  } else {
    result.innerHTML = `
      <div class="pg-wrong">
        まだ必要な要素が不足しています。
        <br>
        確認できた要素：${matched.join("・") || "なし"}
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function injectStyles() {
  if (document.getElementById("pg-styles")) return;

  const style = document.createElement("style");
  style.id = "pg-styles";
  style.textContent = `
    .pg {
      min-height: 100%;
      padding: 28px;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .pg-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: end;
      margin-bottom: 22px;
    }

    .pg-kicker {
      font-size: 11px;
      letter-spacing: .12em;
      opacity: .55;
    }

    .pg h1 {
      margin: 5px 0 0;
      font-size: 26px;
    }

    .pg-controls {
      display: flex;
      gap: 10px;
    }

    .pg-controls label {
      display: grid;
      gap: 5px;
      font-size: 12px;
    }

    .pg-controls select {
      min-width: 130px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #ccc;
      background: white;
    }

    .pg-grid {
      display: grid;
      grid-template-columns: minmax(480px, 1.5fr) minmax(280px, 1fr);
      gap: 14px;
    }

    .pg-card {
      border: 1px solid #ddd;
      border-radius: 14px;
      padding: 18px;
      background: #fff;
    }

    .pg-diagram-card {
      grid-row: span 2;
    }

    .pg-card-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .pg-canvas-wrap {
      width: 100%;
      overflow: auto;
      display: flex;
      justify-content: center;
    }

    #pg-canvas {
      max-width: 100%;
      height: auto;
    }

    .pg-info-main {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .pg-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 12px;
    }

    .pg-tag {
      font-size: 11px;
      padding: 4px 7px;
      border: 1px solid #ddd;
      border-radius: 999px;
    }

    .pg-condition-list {
      padding-left: 28px;
      margin: 0;
    }

    .pg-condition-list li {
      margin: 8px 0;
    }

    .pg-condition-id {
      display: inline-block;
      min-width: 32px;
      font-size: 11px;
      opacity: .5;
    }

    .pg-target {
      padding: 13px;
      border-radius: 10px;
      background: #f4f4f4;
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 15px;
    }

    .pg-target span {
      font-size: 12px;
      opacity: .6;
    }

    .pg-proof-input {
      display: grid;
      gap: 9px;
    }

    .pg-proof-input textarea {
      min-height: 120px;
      resize: vertical;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 9px;
      font: inherit;
      line-height: 1.7;
    }

    .pg-proof-input button,
    .pg-answer-box button {
      justify-self: start;
      border: 0;
      border-radius: 8px;
      padding: 9px 15px;
      cursor: pointer;
    }

    .pg-answer-box {
      display: flex;
      align-items: end;
      gap: 8px;
    }

    .pg-answer-box label {
      display: grid;
      gap: 5px;
      font-size: 12px;
    }

    .pg-answer-box input {
      width: 90px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 8px;
    }

    .pg-model {
      margin-top: 18px;
    }

    .pg-model li {
      margin: 8px 0;
    }

    .pg-model li span {
      display: block;
      font-size: 12px;
      opacity: .65;
      margin-top: 2px;
    }

    .pg-correct,
    .pg-wrong {
      margin-top: 10px;
      padding: 10px;
      border-radius: 8px;
    }

    .pg-correct {
      background: #eaf7ee;
    }

    .pg-wrong {
      background: #fff0f0;
    }

    .pg-status {
      margin-top: 12px;
      font-size: 11px;
      opacity: .5;
    }

    @media (max-width: 900px) {
      .pg-header {
        display: grid;
      }

      .pg-grid {
        grid-template-columns: 1fr;
      }

      .pg-diagram-card {
        grid-row: auto;
      }
    }
  `;

  document.head.appendChild(style);
}
