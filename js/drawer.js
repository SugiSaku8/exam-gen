export class Drawer {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.ctx = canvasManager.getContext();
  }

  normalizeGeometry(geometry) {
    const rawPoints = geometry?.points instanceof Map
      ? [...geometry.points.entries()]
      : Object.entries(geometry?.points ?? {});

    const points = new Map();
    for (const [key, raw] of rawPoints) {
      if (!raw || !Number.isFinite(Number(raw.x)) || !Number.isFinite(Number(raw.y))) continue;
      const id = String(raw.id ?? key ?? '').trim();
      if (!id) continue;
      const label = String(raw.label ?? raw.id ?? key ?? '').trim();
      points.set(id, {
        ...raw,
        id,
        x: Number(raw.x),
        y: Number(raw.y),
        label: label && label !== 'undefined' && label !== 'null' ? label : id
      });
    }

    const resolve = value => {
      if (!value) return null;
      if (typeof value === 'string') return points.get(value) ?? null;
      return value;
    };

    const segments = (geometry?.segments ?? []).map(s => ({
      ...s,
      a: resolve(s.a ?? s.start ?? s.from),
      b: resolve(s.b ?? s.end ?? s.to)
    }));

    const lines = (geometry?.lines ?? []).map(line => {
      const through = line.through ?? [line.a, line.b];
      return {
        ...line,
        a: resolve(through[0]),
        b: resolve(through[1])
      };
    });

    const circles = (geometry?.circles ?? []).map(circle => ({
      ...circle,
      centerPoint: resolve(circle.center)
    }));

    return { ...geometry, points, segments, lines, circles };
  }

  drawGeometry(geometry) {
    if (!this.ctx) return;

    this.canvasManager.clear();
    const g = this.normalizeGeometry(geometry);
    const points = [...g.points.values()].filter(p =>
      Number.isFinite(p.x) && Number.isFinite(p.y)
    );
    if (!points.length) return;

    const width = this.canvasManager.width;
    const height = this.canvasManager.height;

    // 点だけでなく円の外周まで含めて表示範囲を決める。
    let minX = Math.min(...points.map(p => p.x));
    let maxX = Math.max(...points.map(p => p.x));
    let minY = Math.min(...points.map(p => p.y));
    let maxY = Math.max(...points.map(p => p.y));

    for (const circle of g.circles) {
      const c = circle.centerPoint;
      const r = Number(circle.radius);
      if (!c || !Number.isFinite(r)) continue;
      minX = Math.min(minX, c.x - r);
      maxX = Math.max(maxX, c.x + r);
      minY = Math.min(minY, c.y - r);
      maxY = Math.max(maxY, c.y + r);
    }

    const rangeX = Math.max(maxX - minX, 1e-9);
    const rangeY = Math.max(maxY - minY, 1e-9);

    // 点名が端に張り付かないように十分な余白を確保。
    const pad = Math.min(100, Math.max(60, Math.min(width, height) * 0.11));
    const usableWidth = Math.max(1, width - pad * 2);
    const usableHeight = Math.max(1, height - pad * 2);
    const scale = Math.min(usableWidth / rangeX, usableHeight / rangeY);

    const drawWidth = rangeX * scale;
    const drawHeight = rangeY * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    const screen = p => ({
      x: offsetX + (p.x - minX) * scale,
      y: height - (offsetY + (p.y - minY) * scale)
    });

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.font = '16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textBaseline = 'alphabetic';

    // 円
    for (const circle of g.circles) {
      const c = circle.centerPoint;
      const r = Number(circle.radius);
      if (!c || !Number.isFinite(r)) continue;
      const center = screen(c);
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, r * scale, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 無限直線は「キャンバス全体を横切る線」としてクリップする。
    for (const line of g.lines) {
      if (!line.a || !line.b) continue;
      this.drawInfiniteLine(screen(line.a), screen(line.b), width, height);
    }

    // 線分
    for (const segment of g.segments) {
      if (!segment.a || !segment.b) continue;
      this.drawSegment(screen(segment.a), screen(segment.b));
    }

    // 点とラベル
    for (const p of points) {
      const q = screen(p);
      this.ctx.beginPath();
      this.ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
      this.ctx.fill();

      const offset = p.label_offset ?? { x: 7, y: -7 };
      const ox = Number.isFinite(Number(offset.x)) ? Number(offset.x) : 7;
      const oy = Number.isFinite(Number(offset.y)) ? Number(offset.y) : -7;
      const label = String(p.label ?? p.id ?? '').trim();
      if (label && label !== 'undefined' && label !== 'null') {
        this.ctx.fillText(label, q.x + ox, q.y + oy);
      }
    }

    this.ctx.restore();
  }

  drawInfiniteLine(a, b, width, height) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-9) return;

    const ux = dx / length;
    const uy = dy / length;
    const L = Math.hypot(width, height) * 2;

    this.ctx.beginPath();
    this.ctx.moveTo(a.x - ux * L, a.y - uy * L);
    this.ctx.lineTo(a.x + ux * L, a.y + uy * L);
    this.ctx.stroke();
  }

  drawSegment(a, b) {
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }
}
