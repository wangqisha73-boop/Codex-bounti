import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { createClient } from 'redis';

const app = express();
app.use(bodyParser.json());

function getUserId(req: express.Request) {
  const uid = String(req.headers['x-user-id'] || '');
  if (!uid) throw Object.assign(new Error('unauthorized'), { status: 401 });
  return uid;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: REDIS_URL });
redis.on('error', e => console.error('[blocks] redis error', e));
await redis.connect();

function blocksKey(userId: string) { return `user:${userId}:blocks`; }

app.post('/blocks/:targetId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const targetId = String(req.params.targetId);
    if (!targetId || targetId === userId) return res.status(400).json({ error: 'bad_target' });
    await redis.sAdd(blocksKey(userId), targetId);
    res.json({ ok: true });
  } catch (e: any) { res.status(e.status || 500).json({ error: String(e.message || e) }); }
});

app.delete('/blocks/:targetId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const targetId = String(req.params.targetId);
    await redis.sRem(blocksKey(userId), targetId);
    res.json({ ok: true });
  } catch (e: any) { res.status(e.status || 500).json({ error: String(e.message || e) }); }
});

app.get('/blocks', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ids = await redis.sMembers(blocksKey(userId));
    res.json({ blocked: ids });
  } catch (e: any) { res.status(e.status || 500).json({ error: String(e.message || e) }); }
});

export async function isBlocked(recipientId: string, fromUserId: string) {
  return (await redis.sIsMember(blocksKey(recipientId), fromUserId)) === 1;
}

const PORT = Number(process.env.BLOCKS_PORT || 8797);
app.listen(PORT, () => console.log(`[blocks] API on :${PORT}`));
