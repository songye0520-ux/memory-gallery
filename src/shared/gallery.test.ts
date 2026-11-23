import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TOTAL_STEPS,
  answer,
  boardRankScore,
  choiceFor,
  placeFromAscendingRank,
  compareLeaderEntries,
  decodeBoardRankScore,
  formatDate,
  formatDuration,
  freshRun,
  galleryName,
  miss,
  nextStreak,
  present,
  previousUtcDate,
  kinTierFor,
  optionCountFor,
  remember,
  resultComment,
  stepSecondsFor,
  visibleStreak,
} from './gallery.ts';

const date = '2026-12-09';
const player = 't2_player';
const attempt = '0';

describe('daily chain', () => {
  it('gives everyone the same gallery name for a date', () => {
    assert.equal(galleryName(date), galleryName(date));
    assert.equal(galleryName('2026-12-09'), galleryName('2026-12-09'));
  });

  it('builds twenty steps where each grid hides the previous top painting', () => {
    assert.equal(TOTAL_STEPS, 20);
    for (let step = 2; step <= TOTAL_STEPS; step += 1) {
      const choice = choiceFor(date, player, step, attempt);
      const again = choiceFor(date, player, step, attempt);
      const targetId = `t:${date}:${player}:${attempt}:${step - 2}`;
      const expectedCount = optionCountFor(step);
      assert.equal(choice.options.length, expectedCount);
      assert.equal(choice.options[choice.correctIndex]?.id, targetId);
      assert.equal(choice.options.filter((item) => item.id === targetId).length, 1);
      assert.equal(choice.top.id, `t:${date}:${player}:${attempt}:${step - 1}`);
      const ids = new Set(choice.options.map((item) => item.id));
      assert.equal(ids.size, expectedCount);
      assert.deepEqual(choice, again);
    }
  });

  it('keeps the original 1–10 foil curve, then uses kin variants for 11–20', () => {
    const early = foils(2);
    const middle = foils(6);
    const twinStep = foils(9);
    const kinStep = foils(14);
    const earlyTarget = targetOf(2);
    const middleTarget = targetOf(6);
    const twinTarget = targetOf(9);
    const kinTarget = targetOf(14);

    assert.equal(optionCountFor(10), 4);
    assert.equal(optionCountFor(11), 4);
    assert.equal(kinTierFor(11), 1);
    assert.equal(kinTierFor(14), 2);
    assert.equal(kinTierFor(18), 3);

    for (const foil of early) {
      assert.notEqual(foil.gallery, earlyTarget.gallery);
      assert.notEqual(foil.motif, earlyTarget.motif);
    }
    for (const foil of middle) {
      assert.equal(foil.gallery, middleTarget.gallery);
      assert.notEqual(foil.motif, middleTarget.motif);
    }
    for (const foil of twinStep) {
      assert.equal(foil.gallery, twinTarget.gallery);
      assert.equal(foil.motif, twinTarget.motif);
      assert.notEqual(foil.id, twinTarget.id);
    }
    assert.equal(kinStep.length, 3);
    for (const foil of kinStep) {
      assert.equal(foil.gallery, kinTarget.gallery);
      assert.equal(foil.motif, kinTarget.motif);
      assert.equal(foil.shapes.length, kinTarget.shapes.length);
      assert.notEqual(foil.id, kinTarget.id);
      assert.match(foil.id, /^kin:/);
    }
  });

  it('gives each player a different chain', () => {
    const first = choiceFor(date, 'alice', 2, attempt).top.id;
    const second = choiceFor(date, 'bob', 2, attempt).top.id;
    assert.notEqual(first, second);
  });

  it('gives a different chain for each attempt', () => {
    const first = choiceFor(date, player, 2, 'a').top.id;
    const second = choiceFor(date, player, 2, 'b').top.id;
    assert.notEqual(first, second);
  });

  it('keeps a full ten-second clock on every clear', () => {
    assert.equal(stepSecondsFor(1), 10);
    assert.equal(stepSecondsFor(10), 10);
    assert.equal(stepSecondsFor(11), 10);
    assert.equal(stepSecondsFor(20), 10);
  });
});

describe('run rules', () => {
  it('locks a missed step and records how far the player got', () => {
    let run = remember(freshRun());
    while (run.status === 'choose' && run.step < 5) run = answer(run, true);
    run = answer(run, false);
    assert.equal(run.status, 'lost');
    assert.equal(run.failedStep, 5);
    assert.equal(run.score, 4);
    assert.equal(answer(run, true).status, 'lost');
  });

  it('ends after a perfect chain', () => {
    let run = remember(freshRun());
    while (run.status === 'choose') run = answer(run, true);
    assert.equal(run.status, 'won');
    assert.equal(run.score, TOTAL_STEPS);
  });

  it('fails the current step when time runs out', () => {
    assert.deepEqual(miss(freshRun()), {
      status: 'lost',
      step: 1,
      score: 0,
      failedStep: 1,
      attemptId: '0',
    });
    const mid = remember(freshRun());
    assert.equal(miss(mid).failedStep, 2);
    assert.equal(miss(mid).score, 1);
  });

  it('hides the answer until the chain breaks', () => {
    const playing = present(date, player, remember(freshRun()), 3, []);
    assert.equal(playing.phase, 'choose');
    assert.equal(playing.revealIndex, null);
    assert.equal(playing.options?.length, 4);

    const missed = present(
      date,
      player,
      { status: 'lost', step: 2, score: 1, failedStep: 2, attemptId: attempt },
      3,
      []
    );
    assert.equal(missed.phase, 'done');
    assert.equal(missed.options?.[missed.revealIndex ?? -1]?.id, targetOf(2).id);
  });

  it('can present a loss on the memorize step without a choice grid', () => {
    const missed = present(
      date,
      player,
      { status: 'lost', step: 1, score: 0, failedStep: 1, attemptId: attempt },
      1,
      []
    );
    assert.equal(missed.phase, 'done');
    assert.equal(missed.status, 'lost');
    assert.equal(missed.options, null);
    assert.equal(missed.revealIndex, null);
  });
});

describe('score sharing', () => {
  it('formats a ten-cell result without revealing paintings', () => {
    assert.equal(formatDate('2026-12-09'), 'Dec 9');
    assert.equal(previousUtcDate('2026-12-09'), '2026-12-08');
    assert.equal(formatDuration(72000), '1m 12s');
    assert.equal(formatDuration(9000), '9s');
    assert.equal(
      resultComment('Dec 9', 7, 4, 72000),
      '⏱  1m 12s\n🖼  🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜  7/20\n🔥  streak 4\n\nMemory Gallery · Dec 9'
    );
  });

  it('continues a streak only across consecutive days', () => {
    assert.deepEqual(nextStreak(null, date), { count: 1, lastDate: date });
    assert.deepEqual(nextStreak({ count: 4, lastDate: '2026-12-08' }, date), {
      count: 5,
      lastDate: date,
    });
    assert.deepEqual(nextStreak({ count: 4, lastDate: '2026-12-01' }, date), {
      count: 1,
      lastDate: date,
    });
    assert.equal(visibleStreak({ count: 4, lastDate: '2026-12-08' }, date), 4);
    assert.equal(visibleStreak({ count: 4, lastDate: '2026-12-01' }, date), 0);
  });

  it('ranks higher scores first, then faster times', () => {
    const slowEight = boardRankScore(8, 90000);
    const fastEight = boardRankScore(8, 45000);
    const seven = boardRankScore(7, 1000);
    assert.ok(fastEight > slowEight);
    assert.ok(slowEight > seven);
    assert.deepEqual(decodeBoardRankScore(fastEight), { score: 8, elapsedMs: 45000 });
    const entries = [
      { username: 'a', score: 8, elapsedMs: 90000 },
      { username: 'b', score: 8, elapsedMs: 45000 },
      { username: 'c', score: 9, elapsedMs: 120000 },
    ].sort(compareLeaderEntries);
    assert.deepEqual(
      entries.map((entry) => entry.username),
      ['c', 'b', 'a']
    );
  });

  it('maps ascending redis ranks to 1-based places', () => {
    assert.equal(placeFromAscendingRank(76, 77), 1);
    assert.equal(placeFromAscendingRank(0, 77), 77);
    assert.equal(placeFromAscendingRank(68, 77), 9);
  });
});

function targetOf(step: number) {
  const choice = choiceFor(date, player, step, attempt);
  const painting = choice.options[choice.correctIndex];
  if (!painting) throw new Error('missing target');
  return painting;
}

function foils(step: number) {
  const choice = choiceFor(date, player, step, attempt);
  const targetId = choice.options[choice.correctIndex]?.id;
  return choice.options.filter((painting) => painting.id !== targetId);
}
