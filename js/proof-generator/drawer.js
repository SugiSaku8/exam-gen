export class Drawer {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.ctx = canvasManager.getContext();
  }

  normalizeGeometry(geometry) {
    const points = geometry?.points instanceof Map
      ? geometry.points
      : new Map(Object.entries(geometry?.points ?? {}));

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

    return { ...geometry, points, segments, lines };
  }

  drawGeometry(geometry) {
    if (!this.ctx) return;
    this.canvasManager.clear();
    const g = this.normalizeGeometry(geometry);
    const values = [...g.points.values()];
    if (!values.length) return;

    const pad = 55;
    const xs = values.map(p => p.x);
    const ys = values.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const sx = (this.canvasManager.width - 2 * pad) / Math.max(maxX - minX, 1e-9);
    const sy = (this.canvasManager.height - 2 * pad) / Math.max(maxY - minY, 1e-9);
    const scale = Math.min(sx, sy);
    const tx = pad + (this.canvasManager.width - 2 * pad - (maxX - minX) * scale) / 2;
    const ty = pad + (this.canvasManager.height - 2 * pad - (maxY - minY) * scale) / 2;

    const screen = p => ({
      x: tx + (p.x - minX) * scale,
      y: this.canvasManager.height - (ty + (p.y - minY) * scale)
    });

    for (const circle of g.circles ?? []) {
      const c = resolvePoint(g.points, circle.center);
      if (!c) continue;
      const center = screen(c);
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, circle.radius * scale, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (const line of g.lines) {
      if (!line.a || !line.b) continue;
      this.drawLine(screen(line.a), screen(line.b));
    }

    for (const segment of g.segments) {
      if (!segment.a || !segment.b) continue;
      this.drawSegment(screen(segment.a), screen(segment.b));
    }

    for (const p of values) {
      const q = screen(p);
      this.ctx.beginPath();
      this.ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillText(p.label ?? p.id, q.x + 7, q.y - 7);
    }
  }

  drawLine(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length, uy = dy / length;
    const L = 2000;
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

function resolvePoint(points, value) {
  if (!value) return null;
  if (typeof value === 'string') return points.get(value) ?? null;
  return value;
}
