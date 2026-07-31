import { PrismaClient } from '@prisma/client';

// Asegurar que en desarrollo local no apuntemos a la IP remota por error, redirigiendo a localhost
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('136.112.170.11') || process.env.DATABASE_URL.includes('136.112.'))) {
  console.log('🛡️ [Prisma] Detectada URL de base de datos remota en entorno local.');
  console.log('Redirigiendo conexión a PostgreSQL local (localhost:5432) por política Local-First.');
  process.env.DATABASE_URL = 'postgresql://becasual_user:becasual_password_987@localhost:5432/becasual?schema=public';
}

export const prisma = new PrismaClient();
