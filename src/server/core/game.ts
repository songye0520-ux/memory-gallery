import { context, reddit, redis } from '@devvit/web/server';
import type {
  GameResponse,
  Outcome,
  PersonalBest,
  RunState,
  SplashResponse,
  Streak,
} from '../../shared/gallery';
import {
  answer,
  boardRankScore,
  choiceFor,
  compareLeaderEntries,
  decodeBoardRankScore,
  freshRun,
  miss,
  nextAttemptId,
  nextStreak,
  placeFromAscendingRank,
  present,
  remember,
  resultComment,
  stepDeadline,
  utcToday,
  visibleStreak,
} from '../../shared/gallery';

type BoardSnapshot = {
  leaderboard: GameResponse['leaderboard'];
  personalBest: PersonalBest | null;
};

type StoredRun = RunState & {
  posted: boolean;
  startedAt: number | null;
  deadlineAt: number | null;
  elapsedMs: number;
};

type SavedScore = {
  score: number;
  elapsedMs: number;
  status: Outcome;
  attemptId: string;
};

export async function loadSplash(): Promise<SplashResponse> {
  const { id: userId, username } = await player();
  const date = currentDate();
  let run = await readRun(userId, date);
  // Opening the expanded game starts a step timer. Closing before the first
  // confirm should not fail the day — pause memorize and let them re-enter.
  if (run.status === 'memorize' && (run.deadlineAt !== null || run.startedAt !== null)) {
    run = {
      ...run,
      startedAt: null,
      deadlineAt: null,
      elapsedMs: 0,
    };
    await writeRun(userId, date, run);
  } else {
    run = await expireIfNeeded(userId, username, date, run, false);
  }
  const streak = visibleStreak(await readStreak(userId), date);
  const board = await boardSnapshot(date, userId);
  const view = toView(date, userId, run, streak, board);
  return {
    galleryName: view.galleryName,
    dateLabel: view.dateLabel,
    streak: view.streak,
    phase: view.phase,
    score: view.score,
    status: view.status,
    elapsedMs: view.elapsedMs,
    posted: view.posted,
    personalBest: view.personalBest,
  };
}

export async function loadGame(): Promise<GameResponse> {
  const { id: userId, username } = await player();
  const date = currentDate();
  let run = await ensureDeadline(userId, date);
  run = await expireIfNeeded(userId, username, date, run, false);
  const streak = visibleStreak(await readStreak(userId), date);
  return toView(date, userId, run, streak, await boardSnapshot(date, userId));
}

export async function confirmMemory(): Promise<GameResponse> {
  const { id: userId, username } = await player();
  const date = currentDate();
  let run = await ensureDeadline(userId, date);
  run = await expireIfNeeded(userId, username, date, run, false);
  if (run.status === 'memorize') {
    const now = Date.now();
    const next = remember(run);
    run = {
      ...next,
      posted: false,
      startedAt: run.startedAt ?? now,
      deadlineAt: stepDeadline(next.step, now),
      elapsedMs: 0,
    };
    await writeRun(userId, date, run);
  }
  return loadGame();
}

export async function choosePainting(index: number): Promise<GameResponse> {
  const { id: userId, username } = await player();
  const date = currentDate();
  let run = await ensureDeadline(userId, date);
  run = await expireIfNeeded(userId, username, date, run, false);
  if (run.status !== 'choose') return loadGame();

  const choice = choiceFor(date, userId, run.step, run.attemptId);
  if (index < 0 || index >= choice.options.length) return loadGame();
  const next = answer(run, index === choice.correctIndex);
  const stored = finishOrContinue(run, next, Date.now());
  await writeRun(userId, date, stored);
  if (stored.status === 'won' || stored.status === 'lost') {
    await recordBest(userId, username, date, stored);
  }
  return loadGame();
}

export async function expireStep(): Promise<GameResponse> {
  const { id: userId, username } = await player();
  const date = currentDate();
  let run = await readRun(userId, date);
  run = await expireIfNeeded(userId, username, date, run, true);
  return toView(
    date,
    userId,
    run,
    visibleStreak(await readStreak(userId), date),
    await boardSnapshot(date, userId)
  );
}

export async function shareResult(): Promise<GameResponse> {
  const { id: userId, username, canComment } = await player();
  const date = currentDate();
  const run = await readRun(userId, date);
  if (run.status !== 'won' && run.status !== 'lost') return loadGame();
  if (!run.posted) {
    await leaveScoreComment(userId, username, date, run, canComment);
  }
  return loadGame();
}

export async function playAgain(): Promise<GameResponse> {
  const { id: userId } = await player();
  const date = currentDate();
  await writeRun(userId, date, emptyRun());
  return loadGame();
}

async function expireIfNeeded(
  userId: string,
  username: string,
  date: string,
  run: StoredRun,
  force: boolean
): Promise<StoredRun> {
  if (run.status !== 'memorize' && run.status !== 'choose') return run;
  const due = run.deadlineAt !== null && Date.now() >= run.deadlineAt;
  if (!force && !due) return run;
  if (!force && run.deadlineAt === null) return run;

  const stored = finishOrContinue(run, miss(run), Date.now());
  await writeRun(userId, date, stored);
  if (stored.status === 'won' || stored.status === 'lost') {
    await recordBest(userId, username, date, stored);
  }
  return stored;
}

function finishOrContinue(previous: StoredRun, next: RunState, now: number): StoredRun {
  const startedAt = previous.startedAt ?? now;
  if (next.status === 'won' || next.status === 'lost') {
    return {
      ...next,
      posted: false,
      startedAt,
      deadlineAt: null,
      elapsedMs: Math.max(0, now - startedAt),
    };
  }
  return {
    ...next,
    posted: false,
    startedAt,
    deadlineAt: stepDeadline(next.step, now),
    elapsedMs: 0,
  };
}

async function ensureDeadline(userId: string, date: string): Promise<StoredRun> {
  const run = await readRun(userId, date);
  if (run.status !== 'memorize' && run.status !== 'choose') return run;
  if (run.deadlineAt !== null) return run;
  const now = Date.now();
  const started: StoredRun = {
    ...run,
    startedAt: run.startedAt ?? now,
    deadlineAt: stepDeadline(run.step, now),
    elapsedMs: 0,
  };
  await writeRun(userId, date, started);
  return started;
}

function toView(
  date: string,
  userId: string,
  run: StoredRun,
  streak: number,
  board: BoardSnapshot
): GameResponse {
  const done = run.status === 'won' || run.status === 'lost';
  return present(
    date,
    userId,
    run,
    streak,
    board.leaderboard,
    { deadlineAt: run.deadlineAt, elapsedMs: run.elapsedMs },
    { posted: run.posted, canPost: done && !run.posted },
    board.personalBest
  );
}

async function recordBest(
  userId: string,
  username: string,
  date: string,
  run: StoredRun
): Promise<void> {
  if (run.status !== 'won' && run.status !== 'lost') return;
  const streak = nextStreak(await readStreak(userId), date);
  await redis.set(streakKey(userId), JSON.stringify(streak));
  await redis.set(nameKey(userId), username);
  await saveBestScore(userId, date, {
    score: run.score,
    elapsedMs: run.elapsedMs,
    status: run.status,
    attemptId: run.attemptId,
  });
}

async function leaveScoreComment(
  userId: string,
  username: string,
  date: string,
  run: StoredRun,
  canComment: boolean
): Promise<void> {
  if (run.posted) return;
  if (run.status !== 'won' && run.status !== 'lost') return;

  await recordBest(userId, username, date, run);
  const streak = visibleStreak(await readStreak(userId), date);
  const postId = normalizePostId(context.postId);
  if (!canComment) {
    throw new Error('Sign in with Reddit to leave a comment under this post.');
  }
  if (!postId) {
    throw new Error('Open today’s Memory Gallery post, then try leaving a comment again.');
  }

  const text = resultComment(
    present(date, userId, run, streak, []).dateLabel,
    run.score,
    streak,
    run.elapsedMs
  );

  try {
    await reddit.submitComment({ id: postId, text, runAs: 'USER' });
  } catch (userError) {
    // Playtest / unapproved installs often reject USER comments for non-owners.
    // Fall back to the app account so the score still lands under the post.
    console.error('USER comment failed; retrying as APP', userError);
    try {
      await reddit.submitComment({ id: postId, text, runAs: 'APP' });
    } catch (appError) {
      console.error('Could not leave the score comment', appError);
      throw new Error(
        `Could not leave a comment (${messageOf(appError)}). Re-upload the app with comment permissions, then try again.`,
        { cause: appError }
      );
    }
  }

  await writeRun(userId, date, { ...run, posted: true });
}

function normalizePostId(postId: string | undefined): `t3_${string}` | null {
  if (!postId) return null;
  const normalized = postId.startsWith('t3_') ? postId : `t3_${postId}`;
  return normalized as `t3_${string}`;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'unknown error';
}

async function saveBestScore(userId: string, date: string, score: SavedScore): Promise<void> {
  const previous = await readSaved(userId, date);
  if (
    previous &&
    (previous.score > score.score ||
      (previous.score === score.score && previous.elapsedMs <= score.elapsedMs))
  ) {
    return;
  }
  await redis.set(savedKey(userId, date), JSON.stringify(score));
  await redis.zAdd(boardKey(date), {
    member: userId,
    score: boardRankScore(score.score, score.elapsedMs),
  });
}

async function readSaved(userId: string, date: string): Promise<SavedScore | null> {
  return parseSaved((await redis.get(savedKey(userId, date))) ?? null);
}

async function boardSnapshot(date: string, userId: string): Promise<BoardSnapshot> {
  const key = boardKey(date);
  const [players, rows, saved] = await Promise.all([
    redis.zCard(key),
    redis.zRange(key, 0, 7, { by: 'rank', reverse: true }),
    readSaved(userId, date),
  ]);

  let leaderboard: GameResponse['leaderboard'] = [];
  if (rows.length > 0) {
    const names = await redis.mGet(rows.map((row) => nameKey(row.member)));
    const savedRows = await redis.mGet(rows.map((row) => savedKey(row.member, date)));
    leaderboard = rows
      .map((row, index) => {
        const rowSaved = parseSaved(savedRows[index] ?? null);
        const decoded = decodeBoardRankScore(row.score);
        return {
          username: names[index] || 'player',
          score: rowSaved?.score ?? decoded.score,
          elapsedMs: rowSaved?.elapsedMs ?? decoded.elapsedMs,
        };
      })
      .sort(compareLeaderEntries)
      .slice(0, 8);
  }

  if (!saved || players <= 0) {
    return { leaderboard, personalBest: null };
  }

  const ascending = await redis.zRank(key, userId);
  if (ascending === undefined) {
    return { leaderboard, personalBest: null };
  }

  return {
    leaderboard,
    personalBest: {
      score: saved.score,
      elapsedMs: saved.elapsedMs,
      rank: placeFromAscendingRank(ascending, players),
      players,
    },
  };
}

function parseSaved(raw: string | null): SavedScore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedScore>;
    if (typeof parsed.score !== 'number' || typeof parsed.elapsedMs !== 'number') return null;
    if (parsed.status !== 'won' && parsed.status !== 'lost') return null;
    if (typeof parsed.attemptId !== 'string') return null;
    return {
      score: parsed.score,
      elapsedMs: parsed.elapsedMs,
      status: parsed.status,
      attemptId: parsed.attemptId,
    };
  } catch {
    return null;
  }
}

async function player(): Promise<{ id: string; username: string; canComment: boolean }> {
  const userId = context.userId ?? context.loid;
  if (!userId) throw new Error('Missing player id');
  const username = context.username ?? (await reddit.getCurrentUsername()) ?? 'player';
  return { id: userId, username, canComment: Boolean(context.userId) };
}

function currentDate(): string {
  const data = context.postData as { date?: string } | undefined;
  if (data && typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return data.date;
  }
  return utcToday();
}

async function readRun(userId: string, date: string): Promise<StoredRun> {
  const raw = await redis.get(runKey(userId, date));
  if (!raw) return emptyRun();
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRun> & { commented?: boolean };
    if (
      parsed.status !== 'memorize' &&
      parsed.status !== 'choose' &&
      parsed.status !== 'won' &&
      parsed.status !== 'lost'
    ) {
      return emptyRun();
    }
    return {
      status: parsed.status,
      step: typeof parsed.step === 'number' ? parsed.step : 1,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      failedStep: typeof parsed.failedStep === 'number' ? parsed.failedStep : null,
      attemptId: typeof parsed.attemptId === 'string' ? parsed.attemptId : '0',
      posted: parsed.posted === true || parsed.commented === true,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      deadlineAt: typeof parsed.deadlineAt === 'number' ? parsed.deadlineAt : null,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
    };
  } catch {
    return emptyRun();
  }
}

function emptyRun(): StoredRun {
  return {
    ...freshRun(nextAttemptId()),
    posted: false,
    startedAt: null,
    deadlineAt: null,
    elapsedMs: 0,
  };
}

async function writeRun(userId: string, date: string, run: StoredRun): Promise<void> {
  await redis.set(runKey(userId, date), JSON.stringify(run));
}

async function readStreak(userId: string): Promise<Streak | null> {
  const raw = await redis.get(streakKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Streak>;
    if (typeof parsed.count !== 'number' || typeof parsed.lastDate !== 'string') return null;
    return { count: parsed.count, lastDate: parsed.lastDate };
  } catch {
    return null;
  }
}

function runKey(userId: string, date: string): string {
  return `run:${userId}:${date}`;
}

function savedKey(userId: string, date: string): string {
  return `saved:${userId}:${date}`;
}

function streakKey(userId: string): string {
  return `streak:${userId}`;
}

function nameKey(userId: string): string {
  return `name:${userId}`;
}

function boardKey(date: string): string {
  return `leaderboard:${date}`;
}
