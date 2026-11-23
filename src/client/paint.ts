import { GALLERIES, INK_INDEX, type Painting, type Shape } from '../shared/gallery';

export function drawPainting(canvas: HTMLCanvasElement, painting: Painting): void {
  const cssWidth = canvas.clientWidth;
  if (cssWidth < 2) return;
  const size = Math.floor(cssWidth);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const palette = GALLERIES[painting.gallery]?.colors;
  const colorAt = (index: number) => palette?.[index] ?? palette?.[0] ?? '#111111';
  const ink = colorAt(INK_INDEX);

  ctx.fillStyle = colorAt(painting.background);
  ctx.fillRect(0, 0, size, size);

  const unit = size / 100;
  for (const shape of painting.shapes) {
    trace(ctx, shape, unit);
    if (shape.kind === 'line') {
      ctx.strokeStyle = colorAt(shape.color);
      ctx.lineWidth = shape.width * unit;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.stroke();
      continue;
    }
    if (shape.fill) {
      ctx.fillStyle = colorAt(shape.color);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.2, 1.35 * unit);
      ctx.lineJoin = 'miter';
      ctx.stroke();
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.4, 1.8 * unit);
      ctx.stroke();
    }
  }
}

function trace(ctx: CanvasRenderingContext2D, shape: Shape, unit: number): void {
  ctx.beginPath();
  switch (shape.kind) {
    case 'circle':
      ctx.arc(shape.x * unit, shape.y * unit, shape.r * unit, 0, Math.PI * 2);
      break;
    case 'rect':
      ctx.rect(shape.x * unit, shape.y * unit, shape.w * unit, shape.h * unit);
      break;
    case 'line':
      ctx.moveTo(shape.x1 * unit, shape.y1 * unit);
      ctx.lineTo(shape.x2 * unit, shape.y2 * unit);
      break;
    case 'tri': {
      const [x1, y1, x2, y2, x3, y3] = shape.points;
      ctx.moveTo((x1 ?? 0) * unit, (y1 ?? 0) * unit);
      ctx.lineTo((x2 ?? 0) * unit, (y2 ?? 0) * unit);
      ctx.lineTo((x3 ?? 0) * unit, (y3 ?? 0) * unit);
      ctx.closePath();
      break;
    }
    case 'poly': {
      const pts = shape.points;
      if (pts.length < 4) return;
      ctx.moveTo((pts[0] ?? 0) * unit, (pts[1] ?? 0) * unit);
      for (let index = 2; index < pts.length; index += 2) {
        ctx.lineTo((pts[index] ?? 0) * unit, (pts[index + 1] ?? 0) * unit);
      }
      ctx.closePath();
      break;
    }
  }
}
