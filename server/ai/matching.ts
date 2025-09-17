import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { Queue } from 'bullmq';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } } as const;
const notifyQueue = new Queue('hunters_notify', redis);
const ingestQueue = new Queue('ingest_solved', redis);

async function extractKeywords(text: string): Promise<string[]> {
  const tokens = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>2);
  const stop = new Set(['the','and','for','you','with','that','this','have','from','your','about','into','over','under','https','http','www']);
  const counts = new Map<string, number>();
  for (const t of tokens){ if (!stop.has(t)) counts.set(t,(counts.get(t)||0)+1); }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k);
}

async function selectTopHunters(keywords: string[], limit = 20){
  const { rows } = await pool.query(
    `SELECT user_id, bounty_received_total, skills
     FROM hunters
     WHERE approved = true AND skills && $1::text[]
     ORDER BY bounty_received_total DESC
     LIMIT $2`,
     [keywords, limit]
  );
  return rows as { user_id: string, bounty_received_total: number, skills: string[] }[];
}

async function getPost(postId: string){
  const { rows } = await pool.query(`SELECT id, title, body, author_id, status FROM posts WHERE id = $1`, [postId]);
  return rows[0];
}

app.post('/ai/keywords', async (req, res) => {
  try{
    const { text, postId } = req.body || {};
    let src = text || '';
    if (postId){ const post = await getPost(postId); if (!post) return res.status(404).json({ error: 'post_not_found' }); src = `${post.title}\n${post.body}`; }
    const kws = await extractKeywords(src);
    res.json({ keywords: kws });
  }catch(e:any){ res.status(500).json({ error: String(e?.message||e) }); }
});

app.post('/ai/notify-hunters', async (req, res) => {
  try{
    const { postId } = req.body || {};
    if(!postId) return res.status(400).json({ error: 'missing_postId' });
    const post = await getPost(postId); if(!post) return res.status(404).json({ error:'post_not_found' });
    const keywords = await extractKeywords(`${post.title}\n${post.body}`);
    const hunters = await selectTopHunters(keywords, 20);
    for (const h of hunters){
      await notifyQueue.add('notify', { hunterId: h.user_id, postId: post.id, keywords, rankByBounty: h.bounty_received_total });
    }
    res.json({ ok:true, notified: hunters.map(h=>h.user_id), keywords });
  }catch(e:any){ res.status(500).json({ error: String(e?.message||e) }); }
});

app.post('/ai/ingest-solved', async (req, res) => {
  try{
    const { postId } = req.body || {};
    if(!postId) return res.status(400).json({ error: 'missing_postId' });
    const post = await getPost(postId); if(!post) return res.status(404).json({ error:'post_not_found' });
    await ingestQueue.add('ingest', { postId });
    res.json({ ok:true });
  }catch(e:any){ res.status(500).json({ error: String(e?.message||e) }); }
});

const PORT = Number(process.env.AI_MATCH_PORT || 8799);
app.listen(PORT, ()=> console.log(`[ai-matching] listening :${PORT}`));
