import { logger } from './logger.js';
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
    if (!this.ctx) { logger.warn('DRAW', 'Canvas contextがありません'); return; }
    logger.info('DRAW', '図形描画開始', { points: geometry?.points?.size ?? Object.keys(geometry?.points ?? {}).length, segments: geometry?.segments?.length ?? 0, lines: geometry?.lines?.length ?? 0, circles: geometry?.circles?.length ?? 0 });

    this.canvasManager.clear();
    const g = this.normalizeGeometry(geometry);
    const points = [...g.points.values()].filter(p =>
      Number.isFinite(p.x) && Number.isFinite(p.y)
    );
    if (!points.length) { logger.warn('DRAW', '有効な点がないため描画を中止'); return; }

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
    // ラベルは固定位置に置かず、点の周囲の候補位置から
    // 「線・他のラベルと重なりにくい場所」を自動選択する。
    const placedLabels = [];
    const labelCandidates = [
      { x: 9, y: -10 }, { x: 9, y: 16 },
      { x: -9, y: -10 }, { x: -9, y: 16 },
      { x: 12, y: 4 }, { x: -12, y: 4 },
      { x: 0, y: -18 }, { x: 0, y: 24 },
      { x: 16, y: -18 }, { x: -16, y: -18 },
      { x: 16, y: 24 }, { x: -16, y: 24 }
    ];

    const screenSegments = g.segments
      .filter(s => s.a && s.b)
      .map(s => ({ a: screen(s.a), b: screen(s.b) }));
    const screenLines = g.lines
      .filter(l => l.a && l.b)
      .map(l => ({ a: screen(l.a), b: screen(l.b) }));

    const pointToSegmentDistance = (p, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      const qx = a.x + t * dx;
      const qy = a.y + t * dy;
      return Math.hypot(p.x - qx, p.y - qy);
    };

    const pointToLineDistance = (p, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) return Infinity;
      return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
    };

    const labelBox = (text, x, y) => {
      const m = this.ctx.measureText(text);
      return { left: x - 2, right: x + m.width + 2, top: y - 17, bottom: y + 4 };
    };

    const boxesOverlap = (a, b) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    const chooseLabelPosition = (p, q, label) => {
      const candidates = labelCandidates.map(offset => ({
        x: q.x + offset.x,
        y: q.y + offset.y
      }));

      let best = null;
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        const box = labelBox(label, candidate.x, candidate.y);
        if (box.left < 4 || box.right > width - 4 || box.top < 4 || box.bottom > height - 4) continue;

        const center = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
        let minLineDistance = Infinity;
        for (const line of screenLines) minLineDistance = Math.min(minLineDistance, pointToLineDistance(center, line.a, line.b));
        for (const segment of screenSegments) minLineDistance = Math.min(minLineDistance, pointToSegmentDistance(center, segment.a, segment.b));

        let labelPenalty = 0;
        for (const other of placedLabels) {
          if (boxesOverlap(box, other)) labelPenalty += 100;
        }

        const pointDistance = Math.hypot(candidate.x - q.x, candidate.y - q.y);
        const score = Math.min(minLineDistance, 24) * 5 - labelPenalty - pointDistance * 0.15;
        if (score > bestScore) {
          bestScore = score;
          best = { x: candidate.x, y: candidate.y, box };
        }
      }

      return best ?? { x: q.x + 7, y: q.y - 7, box: labelBox(label, q.x + 7, q.y - 7) };
    };

    for (const p of points) {
      const q = screen(p);
      this.ctx.beginPath();
      this.ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
      this.ctx.fill();

      const label = String(p.label ?? p.id ?? '').trim();
      if (!label || label === 'undefined' || label === 'null') continue;

      const chosen = chooseLabelPosition(p, q, label);
      placedLabels.push(chosen.box);
      this.ctx.fillText(label, chosen.x, chosen.y);
    }

    this.ctx.restore();
    logger.debug('DRAW', '図形描画完了', { renderedPoints: points.length, labels: placedLabels.length, scale: Number(scale.toFixed(3)) });
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
