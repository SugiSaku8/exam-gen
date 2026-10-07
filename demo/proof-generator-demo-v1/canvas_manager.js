/**
 * Canvas Manager
 * Canvasの生成・サイズ・描画状態だけを管理する。
 */

export class CanvasManager {
  constructor(canvas, options = {}) {
    if (!canvas) {
      throw new Error("Canvasが見つかりません。");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    if (!this.ctx) {
      throw new Error("2D Canvas Contextを取得できません。");
    }

    this.dpr = options.dpr ?? window.devicePixelRatio ?? 1;
    this.width = options.width ?? 720;
    this.height = options.height ?? 520;

    this.resize(this.width, this.height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  getContext() {
    return this.ctx;
  }

  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }
}
