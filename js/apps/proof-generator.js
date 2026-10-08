import { registerApp } from '../base.js';

import { ProofGenerator }
  from '../proof-generator/generator.js';


const app = {

  appInit(shell) {
    const root =
      document.getElementById('app-root');

    if (!root) {
      throw new Error(
        '#app-root が見つかりません'
      );
    }

    root.innerHTML = `
      <div class="proof-generator">
        <h1>静岡県入試証明ジェネレーター</h1>

        <div class="proof-toolbar">

          <label>
            年度
            <select id="proof-year">
              <option value="2014">2014</option>
            </select>
          </label>

          <button id="proof-load">
            問題を読み込む
          </button>

        </div>

        <div id="proof-info"></div>

        <div class="proof-main">

          <section>
            <h2>図</h2>
            <div id="proof-canvas"></div>
          </section>

          <section>
            <h2>問題</h2>
            <div id="proof-problem"></div>
          </section>

        </div>
      </div>
    `;

    this.injectStyle();

    const generator =
      new ProofGenerator({
        root
      });

    const canvasContainer =
      root.querySelector('#proof-canvas');

    generator.initializeCanvas(
      canvasContainer
    );

    const yearSelect =
      root.querySelector('#proof-year');

    const loadButton =
      root.querySelector('#proof-load');

    const load = async () => {
      try {
        const year =
          Number(yearSelect.value);

        await generator.load(year);

        generator.draw();

        this.renderInfo(
          root,
          generator
        );

        shell.log({
          from: 'db.app.proof-generator.out',
          message:
            `${year}年の問題を読み込みました`,
          level: 'info'
        });

      } catch (error) {

        console.error(error);

        shell.log({
          from: 'db.app.proof-generator.err',
          message: error.message,
          level: 'error'
        });

        root.querySelector(
          '#proof-info'
        ).textContent =
          `読み込みエラー: ${error.message}`;
      }
    };

    loadButton.addEventListener(
      'click',
      load
    );

    // 初期表示
    load();
  },

  renderInfo(root, generator) {

    const analysis =
      generator.analysis ?? {};

    const info =
      root.querySelector('#proof-info');

    const proof =
      analysis.proof ?? null;


    /*
     * tagsは必ず配列として扱う
     */
    const tags =
      Array.isArray(analysis.tags)
        ? analysis.tags
        : [];


    /*
     * givenConditionsも必ず配列として扱う
     */
    const givenConditions =
      Array.isArray(analysis.givenConditions)
        ? analysis.givenConditions
        : [];


    /*
     * 問題情報
     */
    info.innerHTML = `
      <div class="problem-meta">

        <strong>
          ${analysis.year ?? ''}
          ${analysis.section ?? ''}
        </strong>

        <span>
          ${analysis.points ?? 0}点
        </span>

        ${
          tags.length > 0
            ? `
              <span>
                ${tags.join(' / ')}
              </span>
            `
            : ''
        }

      </div>

      ${
        proof
          ? `
            <div class="proof-target">

              <strong>証明目標：</strong>

              ${proof.target?.statement ?? ''}

            </div>
          `
          : ''
      }
    `;


    /*
     * 問題・仮定
     */
    const problem =
      root.querySelector('#proof-problem');


    const conditions =
      givenConditions
        .map(condition => {

          const text =
            condition.display_text ??
            condition.statement ??
            condition.type ??
            '';

          return `<li>${text}</li>`;
        })
        .join('');


    problem.innerHTML = `

      <h3>仮定</h3>

      <ul>
        ${conditions}
      </ul>

      ${
        proof
          ? `
            <h3>証明</h3>

            <p>
              ${proof.target?.statement ?? ''}
            </p>

            <p>
              合同・相似条件：
              ${
                proof.target_decomposition
                  ?.japanese_criterion
                  ?? ''
              }
            </p>
          `
          : ''
      }

    `;
  },

  injectStyle() {
    if (
      document.getElementById(
        'proof-generator-style'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'proof-generator-style';

    style.textContent = `
      .proof-generator {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Hiragino Sans",
          sans-serif;
      }

      .proof-toolbar {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 20px;
      }

      .proof-main {
        display: grid;
        grid-template-columns:
          minmax(0, 700px)
          minmax(260px, 1fr);

        gap: 24px;
      }

      .problem-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        padding: 12px;
        margin-bottom: 16px;
        border: 1px solid #ddd;
      }

      .proof-target {
        padding: 12px;
        margin-bottom: 16px;
        background: #f5f5f5;
      }

      #proof-problem {
        padding: 16px;
        border: 1px solid #ddd;
      }

      @media (max-width: 900px) {
        .proof-main {
          grid-template-columns: 1fr;
        }
      }
      button{
      width: 85%;
      height: 60px;
      margin: 0 auto;
      background: #8bc6c7;
      justify-content: center;
      align-items: center;
      color: #fff;
      transition: 0.3s;
      border: 2px solid #8bc6c7;
      display: block;
      height: auto;
      padding: 15px 10px 10px;
      border-radius: 100px;
      }
      button:hover {
          transition: 0.3s;
          background: #fff;
          color: #8bc6c7;
      }
    `;

    document.head.appendChild(style);
  }
};


registerApp(
  'proof-generator',
  app
);


// DeepShell生成後に起動
if (window.shell) {
  window.shell.loadApp(
    'proof-generator'
  );
}
