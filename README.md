# Memory Gallery

A daily memory chain that runs inside a Reddit post. One abstract painting starts the day. Each later step shows a new painting on top and four below. One of the four is the painting that was on top last time. Pick it within **10 seconds** to continue. The chain is **20 clears** long. A miss, a timeout, or a perfect clear ends the run.

Every player gets a different chain from the date and their account, so a comment cannot give the answer away. Everyone shares that day's gallery name. After each finished run you see **this run’s** time and clears, plus your **best run today** with your place among everyone who played (for example `9/77`). The salon leaderboard shows the **top 8** for the day (more clears first, then faster time), with gold / silver / bronze marks on the top three. Replay as often as you like; only a better score updates your best and the board. Leaving a comment under the post is optional.

The paintings are drawn from a seed. Nothing is fetched from the network, and there is no daily authoring step.

## Play

1. Open today's Memory Gallery post.
2. Study the first painting, then continue.
3. On each following step, remember the new painting on top and tap the one below that you just saw. You have 10 seconds per step.
4. Reach 20 clears, or miss / time out. Leave and come back to resume an unfinished chain. You can play again the same day; your best and the salon update only when you improve.
5. On the result screen, tap **Leave a comment** only if you want today’s time and clears under the post.

A result comment looks like this:

```text
⏱  1m 12s
🖼  🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜  7/20
🔥  streak 4

Memory Gallery · Dec 9
```

### Difficulty

- **Clears 1–10**: the original foil curve — distant galleries, then same palette, then near-twins of the same motif.
- **Clears 11–20**: four panels from the same structure family. Distractors differ by color layout, shape scale, or angle. Similarity rises in three tiers (11–13, 14–16, 17–20).

## Develop

Node 24 or newer.

```bash
npm install
npm run login
npm run dev
```

`npm run dev` opens a playtest subreddit and installs the app. The install trigger posts today's gallery. Moderators can also use **Post today's gallery**. A scheduler posts the next one at 13:00 UTC if that date does not have a post yet.

```bash
npm run deploy   # type-check, lint, upload (private)
npm run test:unit
npm run test:types
```
