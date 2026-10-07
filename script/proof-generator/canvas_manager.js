/**
 * Canvasの生成・管理を担当する。
 *
 * ProofGenerator
 *      ↓
 * CanvasManager
 *      ↓
 * HTMLCanvasElement / CanvasRenderingContext2D
 */
export class CanvasManager {

  constructor(container) {

    if (!container) {
      throw new Error(
        'CanvasManager: containerが指定されていません。'
      );
    }

    this.container = container;

    this.canvas = null;
    this.context = null;

    this.width = 0;
    this.height = 0;
  }


  /**
   * Canvasを生成する。
   *
   * @param {number} width
   * @param {number} height
   * @returns {HTMLCanvasElement}
   */
  create(width = 700, height = 500) {

    // 既存Canvasを削除
    if (this.canvas) {
      this.destroy();
    }

    const canvas =
      document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    this.container.appendChild(canvas);

    const context =
      canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'CanvasRenderingContext2Dを取得できませんでした。'
      );
    }

    this.canvas = canvas;
    this.context = context;

    this.width = width;
    this.height = height;

    return canvas;
  }


  /**
   * Canvas要素を取得する。
   *
   * @returns {HTMLCanvasElement|null}
   */
  getCanvas() {
    return this.canvas;
  }


  /**
   * 2D描画コンテキストを取得する。
   *
   * @returns {CanvasRenderingContext2D|null}
   */
  getContext() {
    return this.context;
  }


  /**
   * Canvasの幅を取得する。
   */
  getWidth() {
    return this.width;
  }


  /**
   * Canvasの高さを取得する。
   */
  getHeight() {
    return this.height;
  }


  /**
   * Canvasのサイズを取得する。
   */
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }


  /**
   * Canvasを消去する。
   */
  clear() {

    if (!this.context) {
      return;
    }

    this.context.clearRect(
      0,
      0,
      this.width,
      this.height
    );
  }


  /**
   * Canvasを削除する。
   */
  destroy() {

    if (this.canvas) {
      this.canvas.remove();
    }

    this.canvas = null;
    this.context = null;

    this.width = 0;
    this.height = 0;
  }


  /**
   * Canvasが初期化済みか。
   */
  isInitialized() {
    return (
      this.canvas !== null &&
      this.context !== null
    );
  }
}
