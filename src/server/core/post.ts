import { context, reddit, redis } from '@devvit/web/server';
import { formatDate, galleryName, utcToday } from '../../shared/gallery';

export async function createDailyPost(): Promise<{ id: string; created: boolean }> {
  const date = utcToday();
  const key = `post:${date}`;
  const existing = await redis.get(key);
  if (existing) return { id: existing, created: false };

  const name = galleryName(date);
  const label = formatDate(date);
  const post = await reddit.submitCustomPost({
    title: `Memory Gallery · ${label} · ${name}`,
    entry: 'default',
    postData: { date, gallery: name },
    textFallback: {
      text: `Memory Gallery for ${label}. Open the post to play today's chain.`,
    },
  });
  await redis.set(key, post.id);
  return { id: post.id, created: true };
}

export function postUrl(postId: string): string {
  const bare = postId.replace(/^t3_/, '');
  return `https://reddit.com/r/${context.subredditName}/comments/${bare}`;
}
