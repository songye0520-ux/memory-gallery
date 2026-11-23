import { Hono } from 'hono';
import {
  choosePainting,
  confirmMemory,
  expireStep,
  loadGame,
  loadSplash,
  playAgain,
  shareResult,
} from '../core/game';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/splash', async (c) => {
  try {
    return c.json(await loadSplash());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.get('/state', async (c) => {
  try {
    return c.json(await loadGame());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.post('/remember', async (c) => {
  try {
    return c.json(await confirmMemory());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.post('/choose', async (c) => {
  const body = await c.req.json<{ index?: unknown }>().catch(() => ({ index: undefined }));
  const index = body.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 5) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Choose one of the paintings.' },
      400
    );
  }
  try {
    return c.json(await choosePainting(index));
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.post('/timeout', async (c) => {
  try {
    return c.json(await expireStep());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.post('/share', async (c) => {
  try {
    return c.json(await shareResult());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

api.post('/replay', async (c) => {
  try {
    return c.json(await playAgain());
  } catch (error) {
    return c.json<ErrorResponse>({ status: 'error', message: messageOf(error) }, 400);
  }
});

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
