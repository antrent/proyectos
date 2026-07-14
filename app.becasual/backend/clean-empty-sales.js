import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza de ventas sin detalles en la base de datos de GCP...');
  const deleted = await prisma.sale.deleteMany({
    where: {
      details: {
        none: {}
      }
    }
  });
  console.log(`Limpieza completada. Se eliminaron ${deleted.count} ventas vacías (sin artículos) de PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
