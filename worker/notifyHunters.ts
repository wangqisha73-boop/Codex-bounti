import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
new Worker('hunters_notify', async job => {
  const { hunterId, postId, keywords, rankByBounty } = job.data as any;
  console.log(`[notify] hunter ${hunterId} about post ${postId} (rank=${rankByBounty}) keywords=${(keywords||[]).slice(0,5).join(',')}`);
}, { connection });
console.log('[worker] hunters_notify worker started');
