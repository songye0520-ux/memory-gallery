import './index.css';

import { StrictMode, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameResponse, Painting } from '../shared/api';
import { formatDuration } from '../shared/api';
import coverUrl from './assets/cover.jpg';
import { drawPainting } from './paint';

export const App = () => {
  const [data, setData] = useState<GameResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const timedOutFor = useRef<number | null>(null);

  const post = async (path: string, body?: unknown) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const payload = (await response.json()) as GameResponse | { message?: string; status?: string };
      if (!response.ok || !('phase' in payload)) {
        throw new Error('message' in payload && payload.message ? payload.message : 'Try that again');
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Try that again');
    } finally {
      setBusy(false);
    }
  };

  const onDeadline = useEffectEvent((deadlineAt: number) => {
    if (busy || timedOutFor.current === deadlineAt) return;
    timedOutFor.current = deadlineAt;
    void post('/api/timeout');
  });

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as GameResponse | { status?: string; message?: string };
      if (!('phase' in body)) throw new Error(body.message ?? 'Could not load the gallery');
      setData(body);
    };
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not load the gallery');
    });
  }, []);

  const deadlineAt =
    data && data.phase !== 'done' && data.deadlineAt !== null ? data.deadlineAt : null;

  useEffect(() => {
    if (deadlineAt === null) return;

    const sync = () => {
      const now = Date.now();
      setNowMs(now);
      if (now >= deadlineAt) onDeadline(deadlineAt);
    };

    const immediate = window.setTimeout(sync, 0);
    const id = window.setInterval(sync, 250);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(id);
    };
  }, [deadlineAt]);

  const secondsLeft =
    deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - nowMs) / 1000));

  if (!data) {
    return (
      <div className="game">
        <CubistShards />
        <div className="panel">
          <p className="eyebrow">Memory Gallery</p>
          <h1>{error || 'Opening the atelier…'}</h1>
        </div>
      </div>
    );
  }

  if (data.phase === 'done') {
    return (
      <div className="game game-result">
        <CoverHero
          overlay={
            <div className="cover-score">
              <p className="cover-score-kicker">
                {data.status === 'won' ? 'Chain complete' : 'Chain broken'}
              </p>
              <div className="cover-score-duo">
                <div>
                  <p className="cover-score-label">Time</p>
                  <p className="cover-score-value">{formatDuration(data.elapsedMs)}</p>
                </div>
                <div>
                  <p className="cover-score-label">Clears</p>
                  <p className="cover-score-value">{data.score}</p>
                </div>
              </div>
              {data.personalBest ? (
                <p className="cover-score-meta">
                  Best {data.personalBest.score} · rank {data.personalBest.rank}/
                  {data.personalBest.players}
                </p>
              ) : null}
            </div>
          }
        />
        <div className="panel splash-enter-panel result-panel">
          <p className="eyebrow">
            {data.galleryName} · {data.dateLabel}
          </p>
          <ResultPanel
            data={data}
            busy={busy}
            onShare={() => void post('/api/share')}
            onReplay={() => void post('/api/replay')}
          />
          {error ? <p className="error">{error}</p> : null}
          <Leaderboard entries={data.leaderboard} limit={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      <CubistShards />
      <div className="panel">
        <p className="eyebrow">
          {data.galleryName} · {data.dateLabel}
        </p>
        <h1>Memory Gallery</h1>
        <div className="hud">
          <p className="hud-copy">
            Step {data.step}/{data.total} · streak {data.streak}
          </p>
          {secondsLeft !== null ? (
            <div className="timer-wrap">
              <span className={secondsLeft <= 5 ? 'timer urgent' : 'timer safe'}>{secondsLeft}s</span>
            </div>
          ) : null}
        </div>
        <StepRail step={data.step} total={data.total} phase={data.phase} score={data.score} />
        {data.phase === 'memorize' && data.painting ? (
          <>
            <p className="prompt">Study this cubist panel. It starts the chain.</p>
            <PaintingFrame painting={data.painting} hero />
            <button
              type="button"
              className="seal"
              disabled={busy}
              onClick={() => void post('/api/remember')}
            >
              I remember this
            </button>
          </>
        ) : null}
        {data.phase === 'choose' && data.top && data.options ? (
          <>
            <p className="prompt">Remember the painting on top.</p>
            <PaintingFrame painting={data.top} hero />
            <p className="prompt">Which panel was on top last time?</p>
            <div className="grid">
              {data.options.map((painting, index) => (
                <button
                  key={painting.id}
                  type="button"
                  className="choice"
                  disabled={busy}
                  onClick={() => void post('/api/choose', { index })}
                >
                  <PaintingFrame painting={painting} />
                </button>
              ))}
            </div>
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <PersonalBestCard best={data.personalBest} />
        <Leaderboard entries={data.leaderboard} limit={8} />
      </div>
    </div>
  );
};

const CoverHero = ({ overlay }: { overlay?: ReactNode }) => (
  <div className={overlay ? 'splash-cover splash-cover-scored' : 'splash-cover'}>
    <img src={coverUrl} alt="" className="splash-cover-img" aria-hidden />
    <div className="splash-cover-veil" aria-hidden />
    {overlay}
  </div>
);

const CubistShards = () => (
  <>
    <div className="shard shard-a" aria-hidden />
    <div className="shard shard-b" aria-hidden />
    <div className="shard shard-c" aria-hidden />
  </>
);

const StepRail = ({
  step,
  total,
  phase,
  score,
}: {
  step: number;
  total: number;
  phase: GameResponse['phase'];
  score: number;
}) => {
  const filled = phase === 'done' ? score : Math.max(0, step - 1);
  return (
    <div className="progress" aria-hidden>
      {Array.from({ length: total }, (_, index) => {
        const n = index + 1;
        const cls = n <= filled ? 'on' : n === step && phase !== 'done' ? 'now' : '';
        return <span key={n} className={cls} />;
      })}
    </div>
  );
};

const ResultPanel = ({
  data,
  busy,
  onShare,
  onReplay,
}: {
  data: GameResponse;
  busy: boolean;
  onShare: () => void;
  onReplay: () => void;
}) => (
  <section className="result">
    {data.canPost ? (
      <div className="result-actions">
        <button type="button" className="seal" disabled={busy} onClick={onShare}>
          Leave a comment
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={onReplay}>
          Play again
        </button>
      </div>
    ) : (
      <div className="result-actions">
        <button type="button" className="seal" disabled={busy} onClick={onReplay}>
          Play again
        </button>
      </div>
    )}
  </section>
);

const PaintingFrame = ({ painting, hero = false }: { painting: Painting; hero?: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => drawPainting(canvas, painting);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [painting]);

  return (
    <div className={hero ? 'mat hero' : 'mat'}>
      <canvas ref={ref} className="art" />
    </div>
  );
};

const PersonalBestCard = ({ best }: { best: GameResponse['personalBest'] }) => {
  if (!best) return null;
  return (
    <section className="personal-best">
      <p className="leader-title">Your best today</p>
      <div className="personal-best-row">
        <span>
          {best.score} clears · {formatDuration(best.elapsedMs)}
        </span>
        <span className="personal-rank">
          {best.rank}/{best.players}
        </span>
      </div>
    </section>
  );
};

const MEDALS = [
  { icon: '🥇', label: 'gold' },
  { icon: '🥈', label: 'silver' },
  { icon: '🥉', label: 'bronze' },
] as const;

const Leaderboard = ({
  entries,
  limit = 8,
}: {
  entries: GameResponse['leaderboard'];
  limit?: number;
}) => {
  const rows = entries.slice(0, limit);
  return (
    <section className="splash-board">
      <p className="leader-title">Today’s salon</p>
      {rows.length === 0 ? <p className="meta">No scores yet.</p> : null}
      <ol className="board">
        {rows.map((entry, index) => {
          const medal = MEDALS[index];
          return (
            <li key={`${entry.username}-${index}`}>
              <span className="board-name">
                <span>{entry.username}</span>
                {medal ? (
                  <span className="medal" aria-label={medal.label}>
                    {medal.icon}
                  </span>
                ) : null}
              </span>
              <span className="score">
                {entry.score} clears · {formatDuration(entry.elapsedMs)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
