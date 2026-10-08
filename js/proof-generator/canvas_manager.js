export class CanvasManager {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.width = 700;
    this.height = 500;
  }

  create(width = 700, height = 500) {
    this.width = width;
    this.height = height;
    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.className = 'geometry-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    return this.canvas;
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  getContext() {
    return this.ctx;
  }
}
