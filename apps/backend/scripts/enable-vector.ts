import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Enabling pgvector extension...');
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension enabled successfully.');
  } catch (error) {
    console.error('Error enabling pgvector extension:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();