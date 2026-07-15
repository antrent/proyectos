import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando recálculo global de stock (Compras - Ventas)...');
  
  // 1. Agrupar compras por SKU
  const purchasesAgg = await prisma.purchase.groupBy({
    by: ['sku'],
    _sum: { quantity: true }
  });
  const purchasesMap = new Map(purchasesAgg.map(p => [p.sku.toLowerCase(), p._sum.quantity || 0]));

  // 2. Agrupar ventas por productId
  const salesAgg = await prisma.saleDetail.groupBy({
    by: ['productId'],
    _sum: { quantity: true }
  });
  const salesMap = new Map(salesAgg.map(s => [s.productId, s._sum.quantity || 0]));

  // 3. Obtener todos los productos
  const allProducts = await prisma.product.findMany();
  console.log(`Procesando stock para ${allProducts.length} productos...`);

  let updatedCount = 0;
  for (const prod of allProducts) {
    const totalBought = purchasesMap.get(prod.sku.toLowerCase()) || 0;
    const totalSold = salesMap.get(prod.id) || 0;
    
    const calculatedStock = Math.max(0, totalBought - totalSold);

    if (prod.stock !== calculatedStock) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { stock: calculatedStock }
      });
      updatedCount++;
    }
  }

  console.log(`¡Recálculo completado! Se actualizaron los stocks de ${updatedCount} productos en GCP. 🎉`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
