import { loadYear } from './json_loader.js';

import {
  analyzeProblem,
  normalizeProblem
} from './json_analyzer.js';

import { CanvasManager } from './canvas_manager.js';

import { Drawer } from './drawer.js';


/**
 * 静岡県入試証明ジェネレーター
 *
 * 役割：
 * - JSONの読み込み
 * - JSONの正規化
 * - 問題の解析
 * - Canvasの初期化
 * - 図形の描画
 * - 現在選択されている小問の管理
 *
 * 個々の処理は各モジュールに委譲する。
 */
export class ProofGenerator {

  constructor(options = {}) {
    this.root = options.root ?? null;

    // 問題データ
    this.data = null;

    // 解析結果
    this.analysis = null;

    // Canvas関連
    this.canvasManager = null;
    this.drawer = null;

    // 現在の状態
    this.currentYear = null;
    this.currentSubproblem = null;
  }


  /**
   * 年度の問題を読み込む
   *
   * @param {number|string} year
   * @returns {Promise<object>}
   */
  async load(year) {

    if (year === undefined || year === null) {
      throw new Error('年度が指定されていません。');
    }

    // JSON読み込み
    let data = await loadYear(year);

    // JSONの正規化
    if (typeof normalizeProblem === 'function') {
      data = normalizeProblem(data);
    }

    // 問題解析
    this.analysis = analyzeProblem(data);

    // 元データを保持
    this.data = data;

    this.currentYear = year;

    // 小問選択状態をリセット
    this.currentSubproblem = null;

    return this.data;
  }


  /**
   * Canvasを初期化する
   *
   * @param {HTMLElement} container
   * @param {number} width
   * @param {number} height
   */
  initializeCanvas(
    container,
    width = 700,
    height = 500
  ) {

    if (!container) {
      throw new Error(
        'Canvasの配置先containerが指定されていません。'
      );
    }

    // 既存のCanvasを破棄
    this.canvasManager = null;
    this.drawer = null;

    // Canvas管理
    this.canvasManager =
      new CanvasManager(container);

    this.canvasManager.create(
      width,
      height
    );

    // 描画担当
    this.drawer =

      new Drawer(

        this.canvasManager

      );

    return this.canvasManager;
  }


  /**
   * 現在の問題を描画する
   */
  draw() {

    if (!this.data) {
      throw new Error(
        '問題データが読み込まれていません。'
      );
    }

    if (!this.drawer) {
      throw new Error(
        'Canvasが初期化されていません。'
      );
    }

    /*
     * Drawerには解析済みのGeometryModelを渡す。
     *
     * json_analyzer
     *     ↓
     * analysis.geometry.model
     *     ↓
     * drawer
     */
    const geometry =
      this.analysis?.geometry;

    if (!geometry) {
      throw new Error(
        '図形データが解析されていません。'
      );
    }

    this.drawer.drawGeometry(geometry);

    return geometry;
  }


  /**
   * 年度を取得する
   */
  getYear() {
    return this.currentYear;
  }


  /**
   * 読み込まれている問題データを取得する
   */
  getData() {
    return this.data;
  }


  /**
   * 解析結果を取得する
   */
  getAnalysis() {
    return this.analysis;
  }


  /**
   * 小問一覧を取得する
   */
  getSubproblems() {

    return this.data
      ?.problem
      ?.subproblems
      ?? [];
  }


  /**
   * 小問を選択する
   *
   * @param {string|number} id
   * @returns {object|null}
   */
  selectSubproblem(id) {

    const subproblem =
      this.getSubproblems()
        .find(problem => problem.id === id);

    this.currentSubproblem =
      subproblem ?? null;

    return this.currentSubproblem;
  }


  /**
   * 現在選択されている小問を取得する
   */
  getCurrentSubproblem() {
    return this.currentSubproblem;
  }


  /**
   * 証明問題の情報を取得する
   */
  getCurrentProof() {

    return this.analysis?.proof
      ?? this.data?.proof
      ?? null;
  }


  /**
   * 与えられた条件を取得する
   */
  getCurrentConditions() {

    return this.analysis?.conditions
      ?? this.data?.given_conditions
      ?? [];
  }


  /**
   * 導出された事実を取得する
   */
  getCurrentDerivedFacts() {

    return this.analysis?.facts
      ?? this.data?.derived_facts
      ?? [];
  }


  /**
   * 後続問題を取得する
   */
  getCurrentFollowUp() {

    return this.analysis?.followUp
      ?? this.data?.follow_up?.problems
      ?? [];
  }


  /**
   * 現在の問題が読み込まれているか
   */
  isLoaded() {
    return this.data !== null;
  }


  /**
   * Canvasが初期化されているか
   */
  isCanvasInitialized() {
    return this.canvasManager !== null &&
           this.drawer !== null;
  }


  /**
   * 現在の状態をリセットする
   */
  reset() {

    this.data = null;
    this.analysis = null;

    this.canvasManager = null;
    this.drawer = null;

    this.currentYear = null;
    this.currentSubproblem = null;
  }
}
