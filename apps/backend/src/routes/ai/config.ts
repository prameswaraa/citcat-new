import { Hono } from 'hono';
import { prisma } from '../../utils/database.js';
import { z } from 'zod';

const app = new Hono();

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  filterWords: z.array(z.string()).optional(),
});

app.get('/', async (c) => {
  const user = (c as any).user;
  
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Use 'any' casting for aIConfig due to potential type generation lag
  let config = await (prisma as any).aIConfig.findUnique({
    where: { userId: user.id },
  });

  if (!config) {
    config = await (prisma as any).aIConfig.create({
      data: { userId: user.id },
    });
  }

  return c.json({
    enabled: config.enabled,
    systemPrompt: config.systemPrompt,
    model: config.model,
    temperature: config.temperature,
    filterWords: config.filterWords || [],
  });
});

app.post('/', async (c) => {
  const user = (c as any).user;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const result = updateConfigSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid input', details: (result.error as any).errors }, 400);
  }

  const config = await (prisma as any).aIConfig.upsert({
    where: { userId: user.id },
    update: result.data,
    create: {
      userId: user.id,
      ...result.data,
    },
  });

  return c.json(config);
});

export default app;