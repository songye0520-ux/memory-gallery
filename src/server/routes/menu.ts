import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { createDailyPost, postUrl } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json<UiResponse>({ navigateTo: postUrl(post.id) }, 200);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create today\'s gallery' }, 400);
  }
});
