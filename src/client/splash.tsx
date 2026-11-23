import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SplashResponse } from '../shared/api';
import { formatDuration } from '../shared/api';

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
    return (
      <div className="splash splash-result">
        <CubistShards />
        <div className="panel">
          <p className="eyebrow">
            {data.galleryName} · {data.dateLabel}
          </p>
          <p className="result-label">
            {data.personalBest ? 'Your best today' : 'Your run'}
          </p>
          <div className="result-duo">
            <div className="result-stat">
              <p className="result-stat-label">Time</p>
              <p className="result-stat-value">
                {formatDuration(data.personalBest?.elapsedMs ?? data.elapsedMs)}
              </p>
            </div>
            <div className="result-stat">
              <p className="result-stat-label">Clears</p>
              <p className="result-stat-value">
                {data.personalBest?.score ?? data.score}
              </p>
            </div>
          </div>
          {data.personalBest ? (
            <p className="result-stats">
              Rank {data.personalBest.rank}/{data.personalBest.players} · streak {data.streak}
            </p>
          ) : (
            <p className="result-stats">streak {data.streak}</p>
          )}
          <p className="meta">
            {data.posted
              ? 'You already left a score comment. Open to play again.'
              : 'Open to leave a score comment or play again.'}
          </p>
          {error ? <p className="error">{error}</p> : null}
          <button
            type="button"
            className="seal"
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            {data.posted ? 'Play again' : 'Open result'}
          </button>
        </div>
      </div>
    );
  }

  const label = data ? buttonLabel(data) : 'Play';

  return (
    <div className="splash">
      <CubistShards />
      <div className="panel">
        <p className="eyebrow">Daily starry chain</p>
        <h1>Memory Gallery</h1>
        <div className="splash-hero" aria-hidden>
          <div className="splash-mark" />
        </div>
        <p className="meta">
          {data
            ? `${data.galleryName} · ${data.dateLabel} · streak ${data.streak}`
            : error
              ? 'Could not open today’s room'
              : 'Opening today’s atelier'}
        </p>
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

const CubistShards = () => (
  <>
    <div className="shard shard-a" aria-hidden />
    <div className="shard shard-b" aria-hidden />
    <div className="shard shard-c" aria-hidden />
  </>
);

function buttonLabel(data: SplashResponse): string {
  if (data.phase === 'choose') return 'Continue';
  return 'Enter the room';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
