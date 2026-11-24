import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { LeaderEntry, SplashResponse } from '../shared/api';
import { formatDuration } from '../shared/api';
import coverUrl from './assets/cover.jpg';

export const Splash = () => {
  const [data, setData] = useState<SplashResponse | null>(null);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setError('');
        const response = await fetch('/api/splash');
        const body = (await response.json()) as
          | SplashResponse
          | { status?: string; message?: string };
        if (!response.ok) {
          throw new Error(
            'message' in body && body.message ? body.message : `HTTP ${response.status}`
          );
        }
        if (!('galleryName' in body)) throw new Error('Could not open today’s gallery');
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Could not open today’s gallery');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (data?.phase === 'done') {
    const timeMs = data.personalBest?.elapsedMs ?? data.elapsedMs;
    const clears = data.personalBest?.score ?? data.score;
    return (
      <div className="splash splash-enter splash-result">
        <CoverHero
          overlay={
            <div className="cover-score">
              <p className="cover-score-kicker">
                {data.personalBest ? 'Your best today' : 'Your run'}
              </p>
              <div className="cover-score-duo">
                <div>
                  <p className="cover-score-label">Time</p>
                  <p className="cover-score-value">{formatDuration(timeMs)}</p>
                </div>
                <div>
                  <p className="cover-score-label">Clears</p>
                  <p className="cover-score-value">{clears}</p>
                </div>
              </div>
              <p className="cover-score-meta">
                {data.personalBest
                  ? `Rank ${data.personalBest.rank}/${data.personalBest.players} · streak ${data.streak}`
                  : `streak ${data.streak}`}
              </p>
            </div>
          }
        />
        <div className="panel splash-enter-panel result-panel">
          <p className="eyebrow">
            {data.galleryName} · {data.dateLabel}
          </p>
          {error ? <p className="error">{error}</p> : null}
          <button
            type="button"
            className="seal"
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            {data.posted ? 'Play again' : 'Open result'}
          </button>
          <SplashLeaderboard entries={data.leaderboard} limit={8} />
        </div>
      </div>
    );
  }

  const label = data ? buttonLabel(data) : 'Play';

  return (
    <div className="splash splash-enter">
      <CoverHero />
      <div className="panel splash-enter-panel">
        <p className="eyebrow">Daily starry chain</p>
        <h1>Memory Gallery</h1>
        <p className="meta">
          {data
            ? `${data.galleryName} · ${data.dateLabel} · streak ${data.streak}`
            : error
              ? 'Could not open today’s room'
              : 'Opening today’s atelier'}
        </p>
        {data ? <SplashLeaderboard entries={data.leaderboard} limit={8} /> : null}
        {error ? <p className="error">{error}</p> : null}
        {error ? (
          <button type="button" className="seal" onClick={() => setReloadToken((n) => n + 1)}>
            Try again
          </button>
        ) : (
          <button
            type="button"
            className="seal"
            disabled={!data}
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            {label}
          </button>
        )}
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

const MEDALS = [
  { icon: '🥇', label: 'gold' },
  { icon: '🥈', label: 'silver' },
  { icon: '🥉', label: 'bronze' },
] as const;

const SplashLeaderboard = ({
  entries,
  limit = 8,
}: {
  entries: LeaderEntry[];
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

function buttonLabel(data: SplashResponse): string {
  if (data.phase === 'choose') return 'Continue';
  return 'Enter the room';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
