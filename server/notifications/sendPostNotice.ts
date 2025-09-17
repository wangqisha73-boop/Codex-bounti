import { isBlocked } from '../blocksApi';
interface Post { id: string; title: string; authorId: string; }
export async function sendPostNotice(recipientId: string, post: Post) {
  if (await isBlocked(recipientId, post.authorId)) {
    console.log(`[notice] suppressed: ${recipientId} blocked ${post.authorId}`);
    return;
  }
  console.log(`[notice] delivered to ${recipientId} about post ${post.id}`);
}
