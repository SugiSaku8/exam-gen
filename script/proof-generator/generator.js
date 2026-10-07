import { loadYear } from './json_loader.js';

import {
  analyzeProblem
} from './json_analyzer.js';

import { CanvasManager } from './canvas_manager.js';

import { Drawer } from './drawer.js';


/**
 * 証明問題ジェネレーター本体
 *
 * 役割:
 * - JSONの読み込み
 * - JSONの解析
 * - CanvasManagerの初期化
 * - Drawerの初期化
 * - GeometryModelの描画
 *
 * 幾何計算そのものは geometry_solver.js、
 * 描画そのものは drawer.js が担当する。
 */
export class ProofGenerator {

  constructor(options = {}) {
    this.root =
      options.root ?? null;

    this.data =
      null;

    this.analysis =
      null;

    this.canvasManager =
      null;

    this.drawer =
      null;

    this.currentYear =
      null;

    this.currentSubproblem =
      null;
  }


  /**
   * 年度の問題を読み込む
   */
  async load(year) {

    const data =
      await loadYear(year);

    /*
     * analyzeProblem() 内で
     * normalizeProblem() → geometry solver
     * まで行う。
     */
    this.analysis =
      analyzeProblem(data);

    this.data =
      this.analysis.source ??
      data;

    this.currentYear =
      year;

    this.currentSubproblem =
      null;

    /*
     * すでにCanvasが存在する場合、
     * 問題を読み替えてそのまま再描画できる。
     */
    if (
      this.drawer &&
      this.analysis?.geometry
    ) {
      this.draw();
    }

    return this.data;
  }


  /**
   * Canvasを初期化する
   */
  initializeCanvas(
    container,
    width = 700,
    height = 500
  ) {

    if (!container) {
      throw new Error(
        'Canvasのコンテナが指定されていません。'
      );
    }

    /*
     * 既存Canvasを破棄
     */
    if (this.canvasManager) {
      this.canvasManager.destroy();
    }

    this.canvasManager =
      new CanvasManager(container);

    this.canvasManager.create(
      width,
      height
    );

    /*
     * DrawerにはContextではなく
     * CanvasManagerそのものを渡す。
     */
    this.drawer =
      new Drawer(
        this.canvasManager
      );

    /*
     * 問題がすでに読み込まれていれば
     * 即座に描画。
     */
    if (this.analysis) {
      this.draw();
    }
  }


  /**
   * 現在のGeometryModelを描画する
   */
  draw() {
    if (!this.drawer) {
      console.warn('Drawerが初期化されていません。');
      return;
    }

    if (!this.analysis) {
      console.warn('問題が解析されていません。');
      return;
    }

    const geometryData =
      this.analysis.geometry;

    if (!geometryData) {
      console.warn(
        'analysis.geometry が存在しません。',
        this.analysis
      );
      return;
    }

    /*
     * json_analyzer.js の現在の構造:
     *
     * geometry: {
     *   source: ...,
     *   model: {
     *     points: ...,
     *     segments: ...,
     *     lines: ...,
     *     circles: ...
     *   }
     * }
     *
     * ただし、将来的にgeometryそのものが
     * GeometryModelになる可能性も考慮する。
     */
    const geometry =
      geometryData.model ??
      geometryData;

    if (!geometry) {
      console.warn(
        'GeometryModelが取得できません。',
        geometryData
      );
      return;
    }

    this.drawer.drawGeometry(
      geometry
    );
  }


  /**
   * 現在の年度
   */
  getYear() {
    return this.currentYear;
  }


  /**
   * 生JSONデータ
   */
  getData() {
    return this.data;
  }


  /**
   * 解析結果
   */
  getAnalysis() {
    return this.analysis;
  }


  /**
   * GeometryModelを取得
   */
  getGeometry() {
    return this.analysis?.geometry?.model ?? null;
  }


  /**
   * 小問一覧
   */
  getSubproblems() {

    return (
      this.analysis
        ?.problem
        ?.subproblems
      ?? []
    );
  }


  /**
   * 小問を選択
   */
  selectSubproblem(id) {

    const subproblem =
      this.getSubproblems()
        .find(
          problem =>
            problem.id === id
        );

    this.currentSubproblem =
      subproblem ?? null;

    return this.currentSubproblem;
  }


  /**
   * 現在選択中の小問
   */
  getCurrentSubproblem() {
    return this.currentSubproblem;
  }


  /**
   * 証明情報
   */
  getCurrentProof() {

    return (
      this.analysis
        ?.proof
      ?? null
    );
  }


  /**
   * 仮定
   */
  getCurrentConditions() {

    return (
      this.analysis
        ?.givenConditions
      ?? []
    );
  }


  /**
   * 導出事実
   */
  getCurrentDerivedFacts() {

    return (
      this.analysis
        ?.derivedFacts
      ?? []
    );
  }


  /**
   * 追問
   */
  getCurrentFollowUp() {

    return (
      this.analysis
        ?.followUp
        ?.problems
      ?? []
    );
  }


  /**
   * 問題が読み込まれているか
   */
  isLoaded() {
    return this.analysis !== null;
  }


  /**
   * Canvasが初期化されているか
   */
  isCanvasInitialized() {

    return (
      this.canvasManager !== null &&
      this.canvasManager.isInitialized()
    );
  }


  /**
   * 状態を初期化
   */
  reset() {

    if (this.canvasManager) {
      this.canvasManager.destroy();
    }

    this.data =
      null;

    this.analysis =
      null;

    this.canvasManager =
      null;

    this.drawer =
      null;

    this.currentYear =
      null;

    this.currentSubproblem =
      null;
  }
}
