import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { createDailyPost } from '../core/post';

export const scheduler = new Hono();

scheduler.post('/daily-post', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: post.created ? `Posted ${post.id}` : `Already posted ${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Daily post failed: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to create daily post' }, 400);
  }
});
