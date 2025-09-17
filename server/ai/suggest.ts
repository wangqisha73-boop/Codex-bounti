import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { Pool } from 'pg';

const app = express();
app.use(bodyParser.json());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function extractKeywords(text: string): Promise<string[]> {
  const tokens = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>2);
  const stop = new Set(['the','and','for','you','with','that','this','have','from','your','about','into','over','under','https','http','www']);
  const counts = new Map<string, number>();
  for (const t of tokens){ if (!stop.has(t)) counts.set(t,(counts.get(t)||0)+1); }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k);
}

app.post('/ai/suggest-solution', async (req, res)=>{
  try{
    const { text, postId } = req.body || {};
    let queryText = text || '';
    if (postId){
      const { rows } = await pool.query(`SELECT title, body FROM posts WHERE id=$1`, [postId]);
      if (!rows[0]) return res.status(404).json({ error: 'post_not_found' });
      queryText = `${rows[0].title}\n${rows[0].body}`;
    }
    const kws = await extractKeywords(queryText);
    const { rows } = await pool.query(
      `SELECT post_id, content
         FROM solved_knowledge
        WHERE EXISTS (
          SELECT 1 FROM unnest($1::text[]) kw
           WHERE position(kw in content) > 0
        )
        LIMIT 5`, [kws]
    );
    const suggestions = rows.map((r:any)=>({ postId: r.post_id, snippet: r.content.slice(0,500) }));
    res.json({ keywords: kws, suggestions });
  }catch(e:any){ res.status(500).json({ error: String(e?.message||e) }); }
});

const PORT = Number(process.env.AI_SUGGEST_PORT || 8800);
app.listen(PORT, ()=> console.log(`[ai-suggest] listening :${PORT}`));
