import 'dotenv/config';
import { Pool } from 'pg';
import { Worker } from 'bullmq';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
new Worker('ingest_solved', async job => {
  const { postId } = job.data as any;
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.body, s.solution_text
       FROM posts p
       JOIN solutions s ON s.post_id = p.id AND s.approved = true
      WHERE p.id = $1`, [postId]
  );
  if (!rows[0]) return;
  const row = rows[0];
  const doc = `${row.title}\n${row.body}\n---\nSOLUTION:\n${row.solution_text}`;
  await pool.query(
    `INSERT INTO solved_knowledge(post_id, content, created_at)
     VALUES($1, $2, NOW())
     ON CONFLICT (post_id) DO UPDATE SET content = EXCLUDED.content, created_at = NOW()`,
    [postId, doc]
  );
  console.log(`[ingest] stored solved knowledge for post ${postId}`);
}, { connection });
console.log('[worker] ingest_solved worker started');
