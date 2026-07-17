import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando saneamiento global de productos genéricos en GCP...');

  // 1. Obtener todos los productos de la base de datos
  const allProducts = await prisma.product.findMany();
  console.log(`Se encontraron ${allProducts.length} productos en la base de datos.`);

  // Clasificar productos
  const realProducts = allProducts.filter(p => 
    p.name !== 'Producto Genérico' && 
    !p.sku.startsWith('GEN_') && 
    p.sku !== 'unknown'
  );

  const genericProducts = allProducts.filter(p => 
    p.name === 'Producto Genérico' || 
    p.sku.startsWith('GEN_') || 
    p.sku === 'unknown'
  );

  console.log(`Productos Reales: ${realProducts.length}`);
  console.log(`Productos Genéricos a evaluar: ${genericProducts.length}`);

  let unifiedCount = 0;
  let updatedGenericCount = 0;

  for (const genProd of genericProducts) {
    // Intentar extraer el SKU/código original de su ID (ej. prod_generico_1143 -> 1143)
    const cleanCode = genProd.id.replace('prod_generico_', '').replace(/\*/g, '').trim();

    // Intentar buscar un producto real que coincida por SKU o Barcode
    const matchedReal = realProducts.find(p => 
      p.sku.toLowerCase() === cleanCode.toLowerCase() || 
      p.barcode.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedReal) {
      console.log(`[UNIFICANDO] Producto genérico (${genProd.id}) coincide con producto real: "${matchedReal.name}" (${matchedReal.sku})`);
      
      // Redireccionar detalles de venta a producto real
      const updateRes = await prisma.saleDetail.updateMany({
        where: { productId: genProd.id },
        data: { productId: matchedReal.id }
      });
      
      console.log(`  -> Redireccionados ${updateRes.count} detalles de venta.`);

      // Eliminar el producto genérico huérfano
      await prisma.product.delete({
        where: { id: genProd.id }
      });
      console.log(`  -> Eliminado producto genérico duplicado de GCP.`);
      unifiedCount++;
    } else {
      // Si no hay un producto real en el catálogo, es un producto huérfano histórico.
      // Saneamos sus códigos para que muestre el SKU/código real de su ID en lugar de GEN_ o unknown
      if (genProd.sku.startsWith('GEN_') || genProd.sku === 'unknown' || genProd.barcode.startsWith('GEN_') || genProd.barcode === 'unknown') {
        const targetSku = cleanCode || `GEN_${genProd.id.slice(-6)}`;
        console.log(`[SANEANDO HUÉRFANO] Saneando códigos para producto huérfano histórico (${genProd.id}):`);
        console.log(`  -> SKU anterior: "${genProd.sku}" -> Nuevo SKU: "${targetSku}"`);
        
        await prisma.product.update({
          where: { id: genProd.id },
          data: {
            sku: targetSku,
            barcode: targetSku,
            name: `Producto Genérico (${targetSku})`
          }
        });
        updatedGenericCount++;
      }
    }
  }

  console.log('\n--- SANEAMIENTO COMPLETADO ---');
  console.log(`Productos unificados y eliminados: ${unifiedCount}`);
  console.log(`Productos huérfanos saneados con códigos correctos: ${updatedGenericCount}`);
  console.log('¡La base de datos de producción en GCP ha quedado 100% saneada! 🎉');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
