export const TOTAL_STEPS = 20;
export const STEP_SECONDS = 10;
const MOTIF_COUNT = 8;
/** Palette index used for cubist ink outlines. */
export const INK_INDEX = 2;

export type Shape =
  | {
      kind: 'circle';
      x: number;
      y: number;
      r: number;
      color: number;
      fill: boolean;
    }
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      color: number;
      fill: boolean;
    }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: number;
      width: number;
    }
  | {
      kind: 'tri';
      points: [number, number, number, number, number, number];
      color: number;
      fill: boolean;
    }
  | {
      kind: 'poly';
      points: number[];
      color: number;
      fill: boolean;
    };

export type Painting = {
  id: string;
  gallery: number;
  motif: number;
  background: number;
  shapes: Shape[];
};

/** Daily rooms: cubist forms with vivid starry palettes. colors: ground, light, ink, warm, cool. */
export const GALLERIES = [
  { name: 'Starry', colors: ['#0b1d4a', '#fff4a8', '#050816', '#ffd23f', '#4cc9f0'] },
  { name: 'Nebula', colors: ['#2b0a4a', '#ffe8ff', '#12041c', '#ff6bcb', '#7b5cff'] },
  { name: 'Aurora', colors: ['#04261f', '#e8fff4', '#02140f', '#39ffb0', '#5ad0ff'] },
  { name: 'Comet', colors: ['#10183a', '#fff9d6', '#070b18', '#ff9f1c', '#00e5ff'] },
  { name: 'Pulsar', colors: ['#1a0a3c', '#f4f0ff', '#0a0418', '#ff3d81', '#6c63ff'] },
  { name: 'Orbit', colors: ['#061f3a', '#eaf7ff', '#031018', '#ffd166', '#00bbf9'] },
  { name: 'Quasar', colors: ['#220a2e', '#fff0f8', '#100418', '#ff4d6d', '#c77dff'] },
  { name: 'Nova', colors: ['#2a1030', '#fff7d6', '#120814', '#ffb703', '#fb5607'] },
  { name: 'Cygnus', colors: ['#0a2040', '#f0fbff', '#041018', '#80ed99', '#48cae4'] },
  { name: 'Vega', colors: ['#0f1640', '#f7f3ff', '#070a1c', '#ffd60a', '#9b5de5'] },
  { name: 'Eclipse', colors: ['#141028', '#ffe9a8', '#080612', '#ff6b35', '#4ea8de'] },
  { name: 'Lumen', colors: ['#0c2a3a', '#fffce8', '#041218', '#ffd100', '#00f5d4'] },
] as const;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type Phase = 'memorize' | 'choose' | 'done';
export type Outcome = 'won' | 'lost';
export type RunStatus = 'memorize' | 'choose' | 'won' | 'lost';

export type RunState = {
  status: RunStatus;
  step: number;
  score: number;
  failedStep: number | null;
  attemptId: string;
};

export type Streak = {
  count: number;
  lastDate: string;
};

export type LeaderEntry = {
  username: string;
  score: number;
  elapsedMs: number;
};

/** Player's best run today and 1-based place among everyone on the board. */
export type PersonalBest = {
  score: number;
  elapsedMs: number;
  rank: number;
  players: number;
};

const RANK_TIME_CAP = 1_000_000_000;

/** Convert Redis ascending zRank (0 = worst) into a 1-based place (1 = best). */
export function placeFromAscendingRank(ascendingRank: number, players: number): number {
  if (players <= 0) return 0;
  return players - ascendingRank;
}

/** Higher is better: more steps first, then faster time. */
export function boardRankScore(score: number, elapsedMs: number): number {
  const steps = Math.max(0, Math.min(TOTAL_STEPS, Math.round(score)));
  const capped = Math.min(Math.max(0, Math.round(elapsedMs)), RANK_TIME_CAP - 1);
  return steps * RANK_TIME_CAP + (RANK_TIME_CAP - 1 - capped);
}

export function decodeBoardRankScore(value: number): { score: number; elapsedMs: number } {
  if (value >= 0 && value <= TOTAL_STEPS) {
    return { score: value, elapsedMs: 0 };
  }
  const score = Math.floor(value / RANK_TIME_CAP);
  const elapsedMs = RANK_TIME_CAP - 1 - (value % RANK_TIME_CAP);
  return { score, elapsedMs };
}

export function compareLeaderEntries(a: LeaderEntry, b: LeaderEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.elapsedMs - b.elapsedMs;
}

export type GameResponse = {
  galleryName: string;
  dateLabel: string;
  streak: number;
  step: number;
  total: number;
  phase: Phase;
  score: number;
  failedStep: number | null;
  status: Outcome | null;
  painting: Painting | null;
  top: Painting | null;
  options: Painting[] | null;
  revealIndex: number | null;
  leaderboard: LeaderEntry[];
  personalBest: PersonalBest | null;
  deadlineAt: number | null;
  elapsedMs: number;
  stepSeconds: number;
  posted: boolean;
  canPost: boolean;
};

export type SplashResponse = {
  galleryName: string;
  dateLabel: string;
  streak: number;
  phase: Phase;
  score: number;
  status: Outcome | null;
  elapsedMs: number;
  posted: boolean;
  personalBest: PersonalBest | null;
  leaderboard: LeaderEntry[];
};

type Likeness = 'distant' | 'palette' | 'twin' | 'kin';
type KinTier = 1 | 2 | 3;
type KinMode = 'color' | 'shape' | 'angle';

export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function previousUtcDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  const parts = date.split('-');
  const month = Number(parts[1] ?? 1);
  const day = Number(parts[2] ?? 1);
  return `${MONTHS[month - 1] ?? 'Jan'} ${day}`;
}

export function galleryIndex(date: string): number {
  return hashString(`gallery:${date}`) % GALLERIES.length;
}

export function galleryName(date: string): string {
  return GALLERIES[galleryIndex(date)]?.name ?? 'Cobalt';
}

export function nextAttemptId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function freshRun(attemptId = '0'): RunState {
  return { status: 'memorize', step: 1, score: 0, failedStep: null, attemptId };
}

export function remember(run: RunState): RunState {
  if (run.status !== 'memorize') return run;
  return { ...run, status: 'choose', step: 2, score: 1, failedStep: null };
}

export function answer(run: RunState, correct: boolean): RunState {
  if (run.status !== 'choose') return run;
  if (!correct) {
    return {
      ...run,
      status: 'lost',
      step: run.step,
      score: run.step - 1,
      failedStep: run.step,
    };
  }
  if (run.step >= TOTAL_STEPS) {
    return { ...run, status: 'won', step: TOTAL_STEPS, score: TOTAL_STEPS, failedStep: null };
  }
  return {
    ...run,
    status: 'choose',
    step: run.step + 1,
    score: run.step,
    failedStep: null,
  };
}

export function miss(run: RunState): RunState {
  if (run.status === 'memorize') {
    return { ...run, status: 'lost', step: 1, score: 0, failedStep: 1 };
  }
  if (run.status === 'choose') return answer(run, false);
  return run;
}

export function stepSecondsFor(_step: number): number {
  return STEP_SECONDS;
}

export function optionCountFor(_step: number): number {
  return 4;
}

/** 11–13 / 14–16 / 17–20: each tier makes the four panels look more alike. */
export function kinTierFor(step: number): KinTier {
  if (step <= 13) return 1;
  if (step <= 16) return 2;
  return 3;
}

export function stepDeadline(step: number, nowMs: number = Date.now()): number {
  return nowMs + stepSecondsFor(step) * 1000;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function nextStreak(prev: Streak | null, date: string): Streak {
  if (!prev || prev.lastDate.length === 0) return { count: 1, lastDate: date };
  if (prev.lastDate === date) return prev;
  if (prev.lastDate === previousUtcDate(date)) {
    return { count: prev.count + 1, lastDate: date };
  }
  return { count: 1, lastDate: date };
}

export function visibleStreak(prev: Streak | null, date: string): number {
  if (!prev) return 0;
  if (prev.lastDate === date || prev.lastDate === previousUtcDate(date)) return prev.count;
  return 0;
}

export function resultComment(
  dateLabel: string,
  score: number,
  streak: number,
  elapsedMs: number
): string {
  const clears = Math.max(0, Math.min(TOTAL_STEPS, Math.round(score)));
  const panels = '🟩'.repeat(clears) + '⬜'.repeat(TOTAL_STEPS - clears);
  return [
    `⏱  ${formatDuration(elapsedMs)}`,
    `🖼  ${panels}  ${clears}/${TOTAL_STEPS}`,
    `🔥  streak ${streak}`,
    '',
    `Memory Gallery · ${dateLabel}`,
  ].join('\n');
}

export function choiceFor(
  date: string,
  userId: string,
  step: number,
  attemptId = '0'
): { top: Painting; options: Painting[]; correctIndex: number } {
  if (step < 2 || step > TOTAL_STEPS) {
    throw new Error(`Step ${step} has no choice`);
  }
  const top = topPainting(date, userId, attemptId, step - 1);
  const target = topPainting(date, userId, attemptId, step - 2);
  const likeness = likenessForStep(step);
  const foils = [0, 1, 2].map((index) =>
    makeFoil(date, userId, attemptId, step, index, target, likeness)
  );
  const options = shuffle(
    [target, ...foils],
    mulberry32(hashString(`${date}:${userId}:${attemptId}:order:${step}`))
  );
  const correctIndex = options.findIndex((painting) => painting.id === target.id);
  if (correctIndex < 0) throw new Error('Correct painting missing from the grid');
  return { top, options, correctIndex };
}

export function present(
  date: string,
  userId: string,
  run: RunState,
  streak: number,
  leaderboard: LeaderEntry[],
  timing: { deadlineAt: number | null; elapsedMs: number } = {
    deadlineAt: null,
    elapsedMs: 0,
  },
  share: { posted: boolean; canPost: boolean } = { posted: false, canPost: false },
  personalBest: PersonalBest | null = null
): GameResponse {
  const base = {
    galleryName: galleryName(date),
    dateLabel: formatDate(date),
    streak,
    total: TOTAL_STEPS,
    score: run.score,
    failedStep: run.failedStep,
    leaderboard,
    personalBest,
    painting: null,
    top: null,
    options: null,
    revealIndex: null,
    status: null,
    deadlineAt: timing.deadlineAt,
    elapsedMs: timing.elapsedMs,
    stepSeconds: stepSecondsFor(run.step),
    posted: share.posted,
    canPost: share.canPost,
  };

  if (run.status === 'memorize') {
    return {
      ...base,
      phase: 'memorize',
      step: 1,
      painting: topPainting(date, userId, run.attemptId, 0),
    };
  }

  if (run.status === 'choose') {
    const choice = choiceFor(date, userId, run.step, run.attemptId);
    return {
      ...base,
      phase: 'choose',
      step: run.step,
      top: choice.top,
      options: choice.options,
    };
  }

  if (run.status === 'lost' && run.failedStep !== null) {
    // Step 1 is memorize-only; there is no choice grid to reveal.
    if (run.failedStep < 2) {
      return {
        ...base,
        phase: 'done',
        status: 'lost',
        step: run.failedStep,
      };
    }
    const choice = choiceFor(date, userId, run.failedStep, run.attemptId);
    return {
      ...base,
      phase: 'done',
      status: 'lost',
      step: run.failedStep,
      top: choice.top,
      options: choice.options,
      revealIndex: choice.correctIndex,
    };
  }

  return {
    ...base,
    phase: 'done',
    status: 'won',
    step: TOTAL_STEPS,
  };
}

function likenessForStep(step: number): Likeness {
  // Steps 2–10 keep the original curve from the 10-clear game.
  if (step <= 4) return 'distant';
  if (step <= 7) return 'palette';
  if (step <= 10) return 'twin';
  // 11–20: same structure family, three rising similarity tiers.
  return 'kin';
}

function topPainting(date: string, userId: string, attemptId: string, index: number): Painting {
  const motif = (hashString(`${date}:${userId}:${attemptId}:motif`) + index) % MOTIF_COUNT;
  const seed = hashString(`${date}:${userId}:${attemptId}:top:${index}`);
  return makePainting(`t:${date}:${userId}:${attemptId}:${index}`, seed, galleryIndex(date), motif);
}

function makeFoil(
  date: string,
  userId: string,
  attemptId: string,
  step: number,
  index: number,
  target: Painting,
  likeness: Likeness
): Painting {
  const salt = hashString(`${date}:${userId}:${attemptId}:foil:${step}:${index}`);
  if (likeness === 'twin') return jitterPainting(target, salt, index);
  if (likeness === 'kin') return kinPainting(target, salt, index, kinTierFor(step));
  const gallery = likeness === 'palette' ? target.gallery : otherGallery(target.gallery, index);
  const motif = (target.motif + 1 + index) % MOTIF_COUNT;
  return makePainting(`foil:${attemptId}:${step}:${index}:${salt}`, salt, gallery, motif);
}

/**
 * Same motif / layout family as the target.
 * Foil 0 → color layout, foil 1 → shape scale, foil 2 → angle/orientation.
 * Higher tiers shrink how far those diffs go.
 */
function kinPainting(target: Painting, salt: number, index: number, tier: KinTier): Painting {
  const rng = mulberry32(salt);
  const mode: KinMode = index === 0 ? 'color' : index === 1 ? 'shape' : 'angle';
  const strength = tier === 1 ? 1 : tier === 2 ? 0.55 : 0.28;
  const shapes = target.shapes.map((shape, shapeIndex) => {
    if (mode === 'color') return recolorShape(shape, rng, strength, shapeIndex);
    if (mode === 'shape') return reshapeShape(shape, rng, strength);
    return reangleShape(shape, rng, strength, shapeIndex);
  });
  const background =
    mode === 'color' && rng() < 0.35 + strength * 0.4
      ? target.background === 0
        ? 1
        : 0
      : target.background;
  return {
    id: `kin:${tier}:${mode}:${target.id}:${index}:${salt}`,
    gallery: target.gallery,
    motif: target.motif,
    background,
    shapes,
  };
}

function recolorShape(shape: Shape, rng: () => number, strength: number, shapeIndex: number): Shape {
  if (shape.kind === 'line') {
    const shift = strength > 0.7 || shapeIndex === 0 ? 1 + Math.floor(rng() * 3) : 1;
    const color = cycleAccent(shape.color, shift);
    return { ...shape, color };
  }
  if (strength < 0.4 && shapeIndex > 0 && rng() > 0.55) return shape;
  const shift = 1 + Math.floor(rng() * (strength > 0.7 ? 3 : 2));
  return { ...shape, color: cycleAccent(shape.color, shift) };
}

function reshapeShape(shape: Shape, rng: () => number, strength: number): Shape {
  const grow = 1 + (rng() - 0.5) * 2 * (0.12 + strength * 0.28);
  switch (shape.kind) {
    case 'circle':
      return { ...shape, r: clamp(shape.r * grow, 3, 38) };
    case 'rect':
      return {
        ...shape,
        w: clamp(shape.w * grow, 6, 42),
        h: clamp(shape.h * (1 + (rng() - 0.5) * 2 * (0.12 + strength * 0.3)), 6, 78),
      };
    case 'line':
      return { ...shape, width: clamp(shape.width * grow, 0.8, 4) };
    case 'tri': {
      const [x1, y1, x2, y2, x3, y3] = shape.points;
      const cx = ((x1 ?? 0) + (x2 ?? 0) + (x3 ?? 0)) / 3;
      const cy = ((y1 ?? 0) + (y2 ?? 0) + (y3 ?? 0)) / 3;
      return {
        ...shape,
        points: [
          clamp(cx + ((x1 ?? 0) - cx) * grow, 4, 96),
          clamp(cy + ((y1 ?? 0) - cy) * grow, 4, 96),
          clamp(cx + ((x2 ?? 0) - cx) * grow, 4, 96),
          clamp(cy + ((y2 ?? 0) - cy) * grow, 4, 96),
          clamp(cx + ((x3 ?? 0) - cx) * grow, 4, 96),
          clamp(cy + ((y3 ?? 0) - cy) * grow, 4, 96),
        ],
      };
    }
    case 'poly': {
      let sx = 0;
      let sy = 0;
      const pairs = Math.floor(shape.points.length / 2);
      for (let i = 0; i < pairs; i += 1) {
        sx += shape.points[i * 2] ?? 0;
        sy += shape.points[i * 2 + 1] ?? 0;
      }
      const cx = sx / Math.max(1, pairs);
      const cy = sy / Math.max(1, pairs);
      return {
        ...shape,
        points: shape.points.map((value, index) => {
          const center = index % 2 === 0 ? cx : cy;
          return clamp(center + (value - center) * grow, 4, 96);
        }),
      };
    }
  }
}

function reangleShape(shape: Shape, rng: () => number, strength: number, shapeIndex: number): Shape {
  const degrees = (rng() - 0.5) * 2 * (8 + strength * 28) * (shapeIndex === 0 ? 1 : 0.85);
  switch (shape.kind) {
    case 'circle':
      return {
        ...shape,
        x: clamp(shape.x + (rng() - 0.5) * 2 * (4 + strength * 10), 10, 90),
        y: clamp(shape.y + (rng() - 0.5) * 2 * (4 + strength * 10), 10, 90),
      };
    case 'rect': {
      const [nx, ny] = rotatePoint(shape.x + shape.w / 2, shape.y + shape.h / 2, 50, 50, degrees);
      return {
        ...shape,
        x: clamp(nx - shape.w / 2, 4, 90),
        y: clamp(ny - shape.h / 2, 4, 90),
      };
    }
    case 'line': {
      const [x1, y1] = rotatePoint(shape.x1, shape.y1, 50, 50, degrees);
      const [x2, y2] = rotatePoint(shape.x2, shape.y2, 50, 50, degrees);
      return {
        ...shape,
        x1: clamp(x1, 4, 96),
        y1: clamp(y1, 4, 96),
        x2: clamp(x2, 4, 96),
        y2: clamp(y2, 4, 96),
      };
    }
    case 'tri': {
      const [x1, y1, x2, y2, x3, y3] = shape.points;
      const a = rotatePoint(x1 ?? 0, y1 ?? 0, 50, 50, degrees);
      const b = rotatePoint(x2 ?? 0, y2 ?? 0, 50, 50, degrees);
      const c = rotatePoint(x3 ?? 0, y3 ?? 0, 50, 50, degrees);
      return {
        ...shape,
        points: [
          clamp(a[0], 4, 96),
          clamp(a[1], 4, 96),
          clamp(b[0], 4, 96),
          clamp(b[1], 4, 96),
          clamp(c[0], 4, 96),
          clamp(c[1], 4, 96),
        ],
      };
    }
    case 'poly': {
      const points: number[] = [];
      for (let i = 0; i + 1 < shape.points.length; i += 2) {
        const [x, y] = rotatePoint(shape.points[i] ?? 0, shape.points[i + 1] ?? 0, 50, 50, degrees);
        points.push(clamp(x, 4, 96), clamp(y, 4, 96));
      }
      return { ...shape, points };
    }
  }
}

function cycleAccent(color: number, shift: number): number {
  if (color === 0 || color === 2) return color === 0 ? 1 : 3;
  const accents = [1, 3, 4];
  const at = accents.indexOf(color);
  const start = at >= 0 ? at : 0;
  return accents[(start + shift) % accents.length] ?? 1;
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number
): [number, number] {
  const rad = (degrees * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(rad) - dy * Math.sin(rad), cy + dx * Math.sin(rad) + dy * Math.cos(rad)];
}

function otherGallery(gallery: number, index: number): number {
  return (gallery + 1 + index) % GALLERIES.length;
}

function makePainting(id: string, seed: number, gallery: number, motif: number): Painting {
  const rng = mulberry32(seed);
  return {
    id,
    gallery,
    motif,
    background: rng() > 0.45 ? 0 : 1,
    shapes: motifShapes(motif, rng),
  };
}

function jitterPainting(target: Painting, salt: number, index: number): Painting {
  const rng = mulberry32(salt);
  const shapes = target.shapes.map((shape, shapeIndex) => {
    const nudged = nudge(shape, rng, shapeIndex === 0 ? 6 : 12);
    if (shapeIndex !== target.shapes.length - 1) return nudged;
    if (nudged.kind === 'line') return { ...nudged, width: clamp(nudged.width + 0.4, 1, 3.5) };
    const color = nudged.color === 4 ? 1 : nudged.color === 1 ? 3 : nudged.color + 1;
    return { ...nudged, color };
  });
  return {
    id: `twin:${target.id}:${index}:${salt}`,
    gallery: target.gallery,
    motif: target.motif,
    background: target.background,
    shapes,
  };
}

function motifShapes(motif: number, rng: () => number): Shape[] {
  switch (motif % MOTIF_COUNT) {
    case 0:
      return cubistPortrait(rng);
    case 1:
      return fracturedPlanes(rng);
    case 2:
      return stillLife(rng);
    case 3:
      return shardBurst(rng);
    case 4:
      return harlequinLattice(rng);
    case 5:
      return splitProfile(rng);
    case 6:
      return atelierCollage(rng);
    default:
      return angularFigure(rng);
  }
}

function cubistPortrait(rng: () => number): Shape[] {
  return [
    poly([8, 12, 55, 8, 70, 48, 40, 88, 10, 70], plane(rng), true),
    poly([42, 10, 92, 18, 88, 72, 50, 90, 38, 48], plane(rng), true),
    { kind: 'circle', x: 34 + rng() * 8, y: 36, r: 7 + rng() * 3, color: plane(rng), fill: true },
    { kind: 'circle', x: 62 + rng() * 6, y: 34, r: 5 + rng() * 3, color: plane(rng), fill: true },
    triangle(28, 48, 22, 18, plane(rng)),
    { kind: 'rect', x: 48, y: 52, w: 10 + rng() * 8, h: 18, color: plane(rng), fill: true },
    line(18, 22, 78, 28, INK_INDEX, 1.8, rng),
    line(24, 78, 82, 70, INK_INDEX, 1.4, rng),
  ];
}

function fracturedPlanes(rng: () => number): Shape[] {
  return [0, 1, 2, 3, 4, 5].map((index) => {
    const x = 8 + (index % 3) * 28 + rng() * 8;
    const y = 8 + Math.floor(index / 3) * 42 + rng() * 10;
    return poly(
      [
        x,
        y,
        x + 22 + rng() * 14,
        y + rng() * 10 - 4,
        x + 18 + rng() * 16,
        y + 28 + rng() * 12,
        x - 4 + rng() * 8,
        y + 24 + rng() * 10,
      ],
      plane(rng),
      true
    );
  });
}

function stillLife(rng: () => number): Shape[] {
  return [
    { kind: 'rect', x: 12, y: 58, w: 76, h: 26, color: plane(rng), fill: true },
    poly([22, 20, 48, 12, 58, 48, 28, 54], plane(rng), true),
    { kind: 'circle', x: 68, y: 40, r: 16 + rng() * 6, color: plane(rng), fill: true },
    { kind: 'circle', x: 68, y: 40, r: 8, color: plane(rng), fill: false },
    triangle(40 + rng() * 8, 30, 28, 36, plane(rng)),
    line(14, 58, 86, 62, INK_INDEX, 2, rng),
    line(30, 18, 34, 56, INK_INDEX, 1.5, rng),
  ];
}

function shardBurst(rng: () => number): Shape[] {
  const cx = 48 + rng() * 6;
  const cy = 48 + rng() * 6;
  return [0, 1, 2, 3, 4, 5, 6].map((index) => {
    const angle = (index / 7) * Math.PI * 2 + rng() * 0.2;
    const reach = 28 + rng() * 22;
    const spread = 0.35 + rng() * 0.25;
    return poly(
      [
        cx,
        cy,
        cx + Math.cos(angle - spread) * reach,
        cy + Math.sin(angle - spread) * reach,
        cx + Math.cos(angle + spread) * (reach * 0.7),
        cy + Math.sin(angle + spread) * (reach * 0.7),
      ],
      plane(rng),
      true
    );
  });
}

function harlequinLattice(rng: () => number): Shape[] {
  const shapes: Shape[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = 10 + col * 28 + rng() * 4;
      const y = 10 + row * 28 + rng() * 4;
      shapes.push(poly([x + 14, y, x + 28, y + 14, x + 14, y + 28, x, y + 14], plane(rng), true));
    }
  }
  shapes.push(line(12, 12, 88, 88, INK_INDEX, 1.6, rng));
  shapes.push(line(88, 12, 12, 88, INK_INDEX, 1.6, rng));
  return shapes;
}

function splitProfile(rng: () => number): Shape[] {
  return [
    poly([10, 15, 50, 8, 48, 92, 12, 85], plane(rng), true),
    poly([48, 10, 90, 20, 86, 88, 50, 92], plane(rng), true),
    { kind: 'circle', x: 32, y: 38, r: 8, color: plane(rng), fill: true },
    { kind: 'rect', x: 58, y: 30, w: 14, h: 10, color: plane(rng), fill: true },
    triangle(30, 52, 18, 14, plane(rng)),
    poly([52, 55, 78, 50, 74, 78, 54, 72], plane(rng), true),
    line(49, 10, 49, 92, INK_INDEX, 2.2, rng),
  ];
}

function atelierCollage(rng: () => number): Shape[] {
  return [
    { kind: 'rect', x: 8, y: 10, w: 40, h: 36, color: plane(rng), fill: true },
    { kind: 'rect', x: 42, y: 18, w: 46, h: 28, color: plane(rng), fill: true },
    poly([14, 48, 46, 42, 52, 88, 10, 82], plane(rng), true),
    { kind: 'circle', x: 70, y: 68, r: 18, color: plane(rng), fill: true },
    triangle(55, 48, 30, 26, plane(rng)),
    { kind: 'rect', x: 62, y: 12, w: 18, h: 14, color: plane(rng), fill: false },
    line(20, 20, 80, 76, INK_INDEX, 1.7, rng),
  ];
}

function angularFigure(rng: () => number): Shape[] {
  return [
    poly([30, 8, 70, 12, 62, 40, 38, 38], plane(rng), true),
    poly([22, 36, 78, 32, 70, 92, 28, 88], plane(rng), true),
    triangle(18, 40, 24, 40, plane(rng)),
    triangle(60, 42, 26, 38, plane(rng)),
    { kind: 'circle', x: 40, y: 24, r: 5, color: plane(rng), fill: true },
    { kind: 'circle', x: 58, y: 22, r: 4, color: plane(rng), fill: false },
    line(34, 38, 34, 86, INK_INDEX, 2, rng),
    line(64, 36, 60, 88, INK_INDEX, 1.8, rng),
  ];
}

function poly(points: number[], color: number, fill: boolean): Shape {
  return { kind: 'poly', points, color, fill };
}

function triangle(x: number, y: number, w: number, h: number, color: number): Shape {
  return {
    kind: 'tri',
    points: [x, y + h, x + w / 2, y, x + w, y + h],
    color,
    fill: true,
  };
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number,
  rng: () => number
): Shape {
  return {
    kind: 'line',
    x1: x1 + rng() * 4,
    y1: y1 + rng() * 4,
    x2: x2 - rng() * 4,
    y2: y2 - rng() * 4,
    color,
    width,
  };
}

function plane(rng: () => number): number {
  const picks = [1, 3, 4, 1, 3, 4, INK_INDEX];
  return picks[Math.floor(rng() * picks.length)] ?? 1;
}

function nudge(shape: Shape, rng: () => number, limit: number): Shape {
  const dx = (rng() - 0.5) * 2 * limit;
  const dy = (rng() - 0.5) * 2 * limit;
  switch (shape.kind) {
    case 'circle':
      return {
        ...shape,
        x: clamp(shape.x + dx, 12, 88),
        y: clamp(shape.y + dy, 12, 88),
        r: clamp(shape.r * (0.86 + rng() * 0.28), 4, 34),
      };
    case 'rect':
      return {
        ...shape,
        x: clamp(shape.x + dx, 6, 78),
        y: clamp(shape.y + dy, 6, 78),
        w: clamp(shape.w * (0.9 + rng() * 0.2), 8, 30),
        h: clamp(shape.h * (0.9 + rng() * 0.2), 8, 70),
      };
    case 'line':
      return {
        ...shape,
        x1: clamp(shape.x1 + dx, 6, 94),
        y1: clamp(shape.y1 + dy, 6, 94),
        x2: clamp(shape.x2 + dx, 6, 94),
        y2: clamp(shape.y2 + dy, 6, 94),
      };
    case 'tri': {
      const [x1, y1, x2, y2, x3, y3] = shape.points;
      return {
        ...shape,
        points: [
          clamp((x1 ?? 0) + dx, 6, 94),
          clamp((y1 ?? 0) + dy, 6, 94),
          clamp((x2 ?? 0) + dx, 6, 94),
          clamp((y2 ?? 0) + dy, 6, 94),
          clamp((x3 ?? 0) + dx, 6, 94),
          clamp((y3 ?? 0) + dy, 6, 94),
        ],
      };
    }
    case 'poly': {
      const points = shape.points.map((value, index) =>
        clamp(value + (index % 2 === 0 ? dx : dy) * (0.6 + rng() * 0.8), 4, 96)
      );
      return { ...shape, points };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    const other = copy[swap];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swap] = current;
  }
  return copy;
}
