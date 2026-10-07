/**
 * Drawer
 * 解析済みのgeometryをCanvasへ描画する。
 *
 * exact_coordinates がない現在のJSONでは、
 * トポロジーを保った「模式図」を描画する。
 */

export class Drawer {
  constructor(canvasManager) {
    this.manager = canvasManager;
    this.ctx = canvasManager.getContext();
    this.points = new Map();
  }

  drawGeometry(geometry) {
    this.manager.clear();

    const layout = createSchematicLayout(geometry, this.manager.getSize());

    this.points = layout;

    this.drawCircle(geometry, layout);
    this.drawSegments(geometry, layout);
    this.drawLines(geometry, layout);
    this.drawRelations(geometry, layout);
    this.drawPoints(geometry, layout);
  }

  drawCircle(geometry, layout) {
    const circles = geometry.objects.circles ?? [];

    for (const circle of circles) {
      const center = layout.get(circle.center);
      if (!center) continue;

      let radius = 170;

      const candidates = (circle.through_points ?? [])
        .map(id => layout.get(id))
        .filter(Boolean);

      if (candidates.length) {
        radius = Math.max(
          130,
          Math.max(
            ...candidates.map(p =>
              Math.hypot(p.x - center.x, p.y - center.y)
            )
          )
        );
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawSegments(geometry, layout) {
    for (const segment of geometry.objects.segments ?? []) {
      const a = layout.get(segment.from);
      const b = layout.get(segment.to);

      if (!a || !b) continue;
      this.line(a, b);
    }
  }

  drawLines(geometry, layout) {
    for (const line of geometry.objects.lines ?? []) {
      const [aId, bId] = line.through ?? [];
      const a = layout.get(aId);
      const b = layout.get(bId);

      if (!a || !b) continue;

      const extended = extendLine(
        a,
        b,
        this.manager.getSize().width,
        this.manager.getSize().height
      );

      this.ctx.save();
      this.ctx.setLineDash([7, 5]);
      this.line(extended.a, extended.b);
      this.ctx.restore();
    }
  }

  drawRelations(geometry, layout) {
    for (const mark of geometry.display?.marks ?? []) {
      if (mark.type === "equal_length") {
        drawEqualMark(this.ctx, layout, mark.objects);
      }

      if (mark.type === "parallel") {
        drawParallelMark(this.ctx, layout, mark.objects);
      }
    }
  }

  drawPoints(geometry, layout) {
    for (const point of geometry.objects.points ?? []) {
      const p = layout.get(point.id);
      if (!p) continue;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, point.id === "O" ? 4 : 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.font = "15px system-ui, sans-serif";
      this.ctx.fillText(point.id, p.x + 8, p.y - 8);
      this.ctx.restore();
    }
  }

  line(a, b) {
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }
}

function createSchematicLayout(geometry, size) {
  const { width, height } = size;

  // 2014の構造を基準にした模式配置。
  // exact_coordinates が将来追加された場合はここを差し替える。
  const preset = {
    O: { x: width * 0.50, y: height * 0.50 },
    A: { x: width * 0.50, y: height * 0.12 },
    B: { x: width * 0.20, y: height * 0.38 },
    C: { x: width * 0.28, y: height * 0.76 },
    D: { x: width * 0.76, y: height * 0.76 },
    E: { x: width * 0.82, y: height * 0.36 },
    F: { x: width * 0.47, y: height * 0.52 },
    G: { x: width * 0.60, y: height * 0.55 }
  };

  const map = new Map();

  for (const point of geometry.objects.points ?? []) {
    if (preset[point.id]) {
      map.set(point.id, preset[point.id]);
    }
  }

  return map;
}

function extendLine(a, b, width, height) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  const distance = Math.max(width, height) * 1.5;

  return {
    a: {
      x: a.x - ux * distance,
      y: a.y - uy * distance
    },
    b: {
      x: b.x + ux * distance,
      y: b.y + uy * distance
    }
  };
}

function drawEqualMark(ctx, layout, objects) {
  const [id1, id2] = objects;
  const p1 = layout.get(id1?.[0]);
  const p2 = layout.get(id1?.[1]);
  const q1 = layout.get(id2?.[0]);
  const q2 = layout.get(id2?.[1]);

  if (!p1 || !p2 || !q1 || !q2) return;

  drawTick(ctx, midpoint(p1, p2), p1, p2);
  drawTick(ctx, midpoint(q1, q2), q1, q2);
}

function drawTick(ctx, p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;

  const nx = -dy / length;
  const ny = dx / length;

  ctx.beginPath();
  ctx.moveTo(p.x - nx * 6, p.y - ny * 6);
  ctx.lineTo(p.x + nx * 6, p.y + ny * 6);
  ctx.stroke();
}

function drawParallelMark(ctx, layout, objects) {
  // objectsが「BD」「CE」のような文字列でも動くようにする。
  for (const id of objects) {
    const a = layout.get(id[0]);
    const b = layout.get(id[1]);
    if (!a || !b) continue;

    const p = midpoint(a, b);
    ctx.save();
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("∥", p.x + 5, p.y);
    ctx.restore();
  }
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}
