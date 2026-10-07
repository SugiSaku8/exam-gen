/**
 * Drawer
 *
 * GeometryModelをCanvasへ描画するだけ。
 * 座標計算・交点計算・制約判定は geometry_solver が担当する。
 */

export class Drawer {
  constructor(canvasManager) {
    this.manager = canvasManager;
    this.ctx = canvasManager.getContext();
  }

  drawGeometry(geometry) {
    this.manager.clear();

    const model = geometry?.model;
    if (!model) return;

    const screen = createScreenTransform(
      model.points,
      this.manager.getSize(),
      56
    );

    this.drawCircles(model, screen);
    this.drawSegments(model, screen);
    this.drawLines(model, screen);
    this.drawRelations(geometry, model, screen);
    this.drawPoints(geometry, model, screen);
  }

  drawCircles(model, screen) {
    for (const circle of model.circles) {
      const c = model.points.get(circle.center);
      if (!c) continue;

      const center = screen.map(c);
      const radius = circle.radius * screen.scale;

      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawSegments(model, screen) {
    for (const segment of model.segments) {
      const a = model.points.get(segment.from);
      const b = model.points.get(segment.to);

      if (!a || !b) continue;
      this.line(screen.map(a), screen.map(b));
    }
  }

  drawLines(model, screen) {
    for (const line of model.lines) {
      const a = model.points.get(line.through?.[0]);
      const b = model.points.get(line.through?.[1]);

      if (!a || !b) continue;

      const extended = extendMathLine(
        a,
        b,
        screen.worldBounds
      );

      this.ctx.save();
      this.ctx.setLineDash([7, 5]);
      this.line(screen.map(extended.a), screen.map(extended.b));
      this.ctx.restore();
    }
  }

  drawRelations(geometry, model, screen) {
    for (const mark of geometry.display?.marks ?? []) {
      if (mark.type === "equal_length") {
        drawEqualMark(
          this.ctx,
          model,
          screen,
          mark.objects
        );
      }

      if (mark.type === "parallel") {
        drawParallelMark(
          this.ctx,
          model,
          screen,
          mark.objects
        );
      }
    }
  }

  drawPoints(geometry, model, screen) {
    for (const point of geometry.objects.points ?? []) {
      const p = model.points.get(point.id);
      if (!p) continue;

      const s = screen.map(p);

      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, point.id === "O" ? 4 : 4.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.font = "15px system-ui, sans-serif";
      this.ctx.fillText(
        point.id,
        s.x + 8,
        s.y - 8
      );
    }
  }

  line(a, b) {
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }
}

function createScreenTransform(points, size, margin) {
  const values = [...points.values()];

  if (!values.length) {
    return {
      scale: 1,
      map: p => p,
      worldBounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 }
    };
  }

  const xs = values.map(p => p.x);
  const ys = values.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);

  const scale = Math.min(
    (size.width - margin * 2) / spanX,
    (size.height - margin * 2) / spanY
  );

  return {
    scale,
    worldBounds: { minX, maxX, minY, maxY },
    map(p) {
      return {
        x: size.width / 2 + (p.x - cx) * scale,
        y: size.height / 2 - (p.y - cy) * scale
      };
    }
  };
}

function extendMathLine(a, b, bounds) {
  const v = {
    x: b.x - a.x,
    y: b.y - a.y
  };

  const len = Math.hypot(v.x, v.y) || 1;
  const ux = v.x / len;
  const uy = v.y / len;

  const span = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY
  ) * 4;

  return {
    a: {
      x: a.x - ux * span,
      y: a.y - uy * span
    },
    b: {
      x: b.x + ux * span,
      y: b.y + uy * span
    }
  };
}

function drawEqualMark(ctx, model, screen, objects) {
  const [s1, s2] = objects ?? [];

  const a = segmentEndpoints(model, s1);
  const b = segmentEndpoints(model, s2);

  if (!a || !b) return;

  drawTick(ctx, screen.map(midpoint(a[0], a[1])),
    screen.map(a[0]), screen.map(a[1]));
  drawTick(ctx, screen.map(midpoint(b[0], b[1])),
    screen.map(b[0]), screen.map(b[1]));
}

function drawParallelMark(ctx, model, screen, objects) {
  for (const id of objects ?? []) {
    const endpoints = segmentEndpoints(model, id);
    if (!endpoints) continue;

    const a = screen.map(endpoints[0]);
    const b = screen.map(endpoints[1]);
    const p = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };

    ctx.save();
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("∥", p.x + 6, p.y);
    ctx.restore();
  }
}

function segmentEndpoints(model, id) {
  const segment = model.segments.find(s => s.id === id);

  if (segment) {
    const a = model.points.get(segment.from);
    const b = model.points.get(segment.to);
    return a && b ? [a, b] : null;
  }

  if (typeof id === "string" && id.length === 2) {
    const a = model.points.get(id[0]);
    const b = model.points.get(id[1]);
    return a && b ? [a, b] : null;
  }

  return null;
}

function drawTick(ctx, p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;

  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  ctx.moveTo(p.x - nx * 6, p.y - ny * 6);
  ctx.lineTo(p.x + nx * 6, p.y + ny * 6);
  ctx.stroke();
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}
