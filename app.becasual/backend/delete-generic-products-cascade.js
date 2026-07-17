import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando borrado en cascada de productos genéricos/vacíos en GCP...');

  // 1. Identificar productos que cumplen con la condición
  const productsToDelete = await prisma.product.findMany({
    where: {
      OR: [
        { sku: '' },
        { barcode: '' },
        { name: { startsWith: 'Producto Genérico' } }
      ]
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true
    }
  });

  const productIds = productsToDelete.map(p => p.id);
  console.log(`Se encontraron ${productsToDelete.length} productos que cumplen con la condición de borrado.`);

  if (productIds.length === 0) {
    console.log('No hay productos que cumplan con la condición. Finalizando.');
    return;
  }

  // 2. Contar detalles de venta asociados para reportar
  const detailsCount = await prisma.saleDetail.count({
    where: {
      productId: { in: productIds }
    }
  });

  console.log(`Estos productos tienen asociados ${detailsCount} registros de detalles de venta (SaleDetail).`);

  // 3. Ejecutar borrado en cascada mediante una transacción atómica
  console.log('Ejecutando borrado en base de datos...');
  
  await prisma.$transaction(async (tx) => {
    // A. Borrar detalles de venta asociados (cascada manual para evitar fallos de clave foránea)
    if (detailsCount > 0) {
      const deletedDetails = await tx.saleDetail.deleteMany({
        where: {
          productId: { in: productIds }
        }
      });
      console.log(`  -> Eliminados ${deletedDetails.count} registros de detalles de venta (SaleDetail).`);
    }

    // B. Borrar los productos
    const deletedProducts = await tx.product.deleteMany({
      where: {
        id: { in: productIds }
      }
    });
    console.log(`  -> Eliminados ${deletedProducts.count} productos de la tabla Product.`);
  });

  console.log('¡Borrado en cascada completado con éxito en la base de datos de GCP! 🎉');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
