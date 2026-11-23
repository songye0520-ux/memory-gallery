import './index.css';

import { StrictMode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameResponse, Painting } from '../shared/api';
import { formatDuration } from '../shared/api';
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
        {data.phase === 'done' ? (
          <ResultPanel
            data={data}
            busy={busy}
            onShare={() => void post('/api/share')}
            onReplay={() => void post('/api/replay')}
          />
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <PersonalBestCard best={data.personalBest} />
        <Leaderboard entries={data.leaderboard} />
      </div>
    </div>
  );
};

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
    <p className="result-label">{data.status === 'won' ? 'Chain complete' : 'Chain broken'}</p>
    <div className="result-duo">
      <div className="result-stat">
        <p className="result-stat-label">This run · Time</p>
        <p className="result-stat-value">{formatDuration(data.elapsedMs)}</p>
      </div>
      <div className="result-stat">
        <p className="result-stat-label">This run · Clears</p>
        <p className="result-stat-value">{data.score}</p>
      </div>
    </div>
    {data.status === 'lost' ? (
      <p className="meta">
        {data.failedStep === 1
          ? 'Time ran out before the first panel stuck.'
          : `Broke on step ${data.failedStep}.`}
      </p>
    ) : (
      <p className="meta">You kept every panel in today’s room.</p>
    )}
    {data.canPost ? (
      <>
        <p className="meta">
          Proud of today’s run? Leave a comment under this post with your score.
        </p>
        <button type="button" className="seal" disabled={busy} onClick={onShare}>
          Leave a comment
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={onReplay}>
          Play again
        </button>
      </>
    ) : (
      <>
        <p className="meta">
          {data.posted
            ? 'Your score comment is under this post. You can start a new run anytime.'
            : 'Replay anytime — only a better run updates your best.'}
        </p>
        <button type="button" className="seal" disabled={busy} onClick={onReplay}>
          Play again
        </button>
      </>
    )}
    {data.status === 'lost' && data.options ? (
      <div className="grid">
        {data.options.map((painting, index) => (
          <div key={painting.id} className={index === data.revealIndex ? 'choice right' : 'choice'}>
            <PaintingFrame painting={painting} />
            {index === data.revealIndex ? <p className="caption">This one</p> : null}
          </div>
        ))}
      </div>
    ) : null}
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

const Leaderboard = ({ entries }: { entries: GameResponse['leaderboard'] }) => (
  <section>
    <p className="leader-title">Today’s salon</p>
    {entries.length === 0 ? <p className="meta">No scores yet.</p> : null}
    <ol className="board">
      {entries.map((entry, index) => {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
