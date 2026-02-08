import { Hono } from 'hono';
import { prisma } from '../../utils/database.js';
import { AIOrchestrator } from '../../services/ai/AIOrchestrator.js';
import { checkUsageLimit, checkFeatureAccess } from '../../middleware/subscription.js';

const app = new Hono();

// In a real app, use a queue. For now, process in background or await (simple)
const orchestrator = new AIOrchestrator();

app.post('/upload', async (c) => {
  const user = (c as any).user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Check AI feature access first
  const hasAccess = await checkFeatureAccess(user.id, 'aiChatbot');
  if (!hasAccess) {
    return c.json({ error: 'Document uploads are not available in your current plan' }, 403);
  }

  // Check Document limits
  const limitCheck = await checkUsageLimit(user.id, 'maxKnowledgeDocs');
  if (!limitCheck.allowed) {
    return c.json({
      error: `You have reached the maximum number of documents (${limitCheck.limit}) for your plan.`
    }, 403);
  }

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  // Hono file object is Blob/File. We need ArrayBuffer -> Buffer.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check file size (max 10MB)
  if (buffer.length > 10 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 10MB)' }, 400);
  }

  const filename = file.name || 'document.pdf';
  const mimeType = file.type || 'application/pdf';

  // 1. Create Document Record
  const doc = await (prisma as any).knowledgeDocument.create({
    data: {
      userId: user.id,
      filename,
      fileSize: buffer.length,
      mimeType,
      status: 'PROCESSING',
    },
  });

  // 2. Process Async (Fire and forget, or use queue)
  // We use a promise here but don't await it to block response, 
  // but in serverless/lambda this might be killed. 
  // For a long-running server, this is okay-ish but risky.
  // Better: await it if it's fast (PDF parsing + embedding might take 10-30s).
  // Let's await it for now to ensure feedback, or return 202 Accepted.
  
  // Using background processing
  orchestrator.processAndStoreDocument(doc.id, buffer, mimeType)
    .then(() => {
      console.log(`Document ${doc.id} processed successfully`);
    })
    .catch(async (err) => {
      console.error(`Error processing document ${doc.id}:`, err);
      // Only update if document still exists (might have been deleted)
      try {
        await (prisma as any).knowledgeDocument.update({
          where: { id: doc.id },
          data: { 
            status: 'FAILED',
            errorMessage: err.message 
          },
        });
      } catch (updateErr: any) {
        // Document was deleted, ignore the error
        if (updateErr.code === 'P2025') {
          console.log(`Document ${doc.id} was deleted, skipping error update`);
        } else {
          console.error(`Failed to update document ${doc.id} status:`, updateErr);
        }
      }
    });

  return c.json({ 
    message: 'File uploaded, processing started',
    document: doc 
  }, 202);
});

app.get('/', async (c) => {
  const user = (c as any).user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const docs = await (prisma as any).knowledgeDocument.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { chunks: true }
      }
    }
  });

  return c.json(docs);
});

app.delete('/:id', async (c) => {
  const user = (c as any).user;
  const id = c.req.param('id');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Verify ownership
  const doc = await (prisma as any).knowledgeDocument.findFirst({
    where: { id, userId: user.id },
  });

  if (!doc) return c.json({ error: 'Document not found' }, 404);

  // Delete document (cascade deletes chunks)
  await (prisma as any).knowledgeDocument.delete({
    where: { id },
  });
  
  // Also clean up vectors? 
  // Prisma cascade should handle related rows in DocumentChunk.
  // But Vectors in pgvector might need cleanup if stored separately? 
  // No, they are columns in DocumentChunk. So cascade delete works!

  return c.json({ message: 'Document deleted' });
});

export default app;