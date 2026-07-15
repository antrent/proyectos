import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseExcelDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Convertir días de Excel a época Unix
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const parsed = Date.parse(val);
  return isNaN(parsed) ? new Date() : new Date(parsed);
}

async function main() {
  const filePath = path.resolve('data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx');
  console.log('Cargando archivo Excel:', filePath);

  const workbook = XLSX.readFile(filePath);
  const comprasSheet = workbook.Sheets['COMPRAS'];
  if (!comprasSheet) {
    throw new Error('La hoja "COMPRAS" no existe en el archivo Excel.');
  }

  const comprasRows = XLSX.utils.sheet_to_json(comprasSheet, { header: 1 });
  const headers = comprasRows[2].map(h => String(h || '').toUpperCase().trim());

  const dateIdx = headers.indexOf('FECHA INGRESO');
  const skuIdx = headers.indexOf('SKU');
  const barcodeIdx = headers.indexOf('CODIGO DE BARRAS');
  const nameIdx = headers.indexOf('NOMBRE COMPLETO');
  const providerIdx = headers.indexOf('PROVEEDOR MARCA');
  const qtyIdx = headers.indexOf('CANTIDAD COMPRA');
  const costIdx = headers.indexOf('VALOR UNT');
  const totalIdx = headers.indexOf('VALOR TOTAL COMPRA ');
  const sellIdx = headers.indexOf('PRECIO DE VENTA');

  console.log('Índices de columnas de COMPRAS:', { skuIdx, qtyIdx, costIdx, sellIdx });

  // 1. Obtener listado de productos de la base de datos actual (importados de MAESTRA)
  const products = await prisma.product.findMany();
  const productSkus = new Set(products.map(p => p.sku));
  const productBarcodeMap = new Map(products.map(p => [p.sku, p.barcode]));

  console.log(`Productos actuales en el catálogo de GCP: ${products.length}`);

  const purchasesToCreate = [];
  const stockMap = new Map(); // Acumulador de stock por SKU
  const orphanSkus = new Map(); // SKUs en compras que no están en la maestra

  for (let r = 3; r < comprasRows.length; r++) {
    const row = comprasRows[r];
    if (!row || row.length === 0) continue;

    let sku = String(row[skuIdx] || '').trim();
    let barcode = String(row[barcodeIdx] || '').replace(/\*/g, '').trim();
    if (!sku && barcode) sku = barcode; // Fallback si falta el SKU
    if (!sku) continue;

    const qty = Number(row[qtyIdx]) || 0;
    const costPrice = Number(row[costIdx]) || 0;
    const sellPrice = Number(row[sellIdx]) || 0;
    const totalPrice = Number(row[totalIdx]) || (qty * costPrice);
    const name = String(row[nameIdx] || 'Producto Comprado').trim();
    const provider = String(row[providerIdx] || 'Genérico').trim();
    const date = parseExcelDate(row[dateIdx]);

    // Verificar si el SKU existe en el catálogo
    if (!productSkus.has(sku)) {
      orphanSkus.set(sku, { name, barcode, provider, costPrice, sellPrice });
    }

    // Acumular stock
    stockMap.set(sku, (stockMap.get(sku) || 0) + qty);

    purchasesToCreate.push({
      id: `pur_${Math.random().toString(36).slice(2, 10)}`,
      storeId: 'store_1',
      date,
      sku,
      barcode: barcode || productBarcodeMap.get(sku) || sku,
      name,
      provider,
      quantity: qty,
      costPrice,
      totalPrice,
      sellPrice
    });
  }

  console.log(`Se procesaron ${purchasesToCreate.length} registros de compras.`);
  console.log(`Se detectaron ${orphanSkus.size} SKUs huérfanos de compras que no estaban en la hoja MAESTRA.`);

  // 2. Resolver SKUs huérfanos creando los productos en la base de datos
  if (orphanSkus.size > 0) {
    console.log('Creando productos para los SKUs huérfanos en PostgreSQL...');
    const orphansToInsert = [];
    for (const [sku, item] of orphanSkus.entries()) {
      orphansToInsert.push({
        id: `prod_orphan_${Math.random().toString(36).slice(2, 8)}`,
        storeId: 'store_1',
        barcode: item.barcode || sku,
        sku,
        name: item.name,
        stock: 0, // Se actualizará a continuación
        costPrice: item.costPrice,
        sellPrice: item.sellPrice,
        line: 'Adicional Compras',
        category: 'Importación',
        gender: 'Unisex',
        style: 'Estándar',
        color: 'N/A',
        size: 'U',
        provider: item.provider,
        minStock: 5
      });
    }

    await prisma.product.createMany({
      data: orphansToInsert
    });
    console.log(`Se crearon ${orphansToInsert.length} productos adicionales en PostgreSQL.`);
  }

  // 3. Limpiar tabla Purchase e insertar registros
  console.log('Limpiando tabla Purchase en la base de datos...');
  await prisma.purchase.deleteMany({});

  console.log('Insertando registros de compras en PostgreSQL...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < purchasesToCreate.length; i += BATCH_SIZE) {
    const batch = purchasesToCreate.slice(i, i + BATCH_SIZE);
    await prisma.purchase.createMany({
      data: batch
    });
  }
  console.log('Registros de compras insertados correctamente.');

  // 4. Actualizar stock total en la tabla Product
  console.log('Actualizando stock total de productos en PostgreSQL...');
  const allProducts = await prisma.product.findMany();
  let updatedCount = 0;

  for (const prod of allProducts) {
    const stockCalculated = stockMap.get(prod.sku) || 0;
    
    // Sólo actualizamos si el stock es diferente de 0 para optimizar llamadas
    if (stockCalculated > 0) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { stock: stockCalculated }
      });
      updatedCount++;
    }
  }

  console.log(`¡Carga de compras y actualización de stock de ${updatedCount} productos completada con éxito! 🎉`);

  // 5. Generar reporte de SKUs huérfanos
  let md = `# Reporte de Compras con SKUs Huérfanos (No presentes en MAESTRA)\n\n`;
  md += `Este reporte lista los SKUs de la hoja de **COMPRAS** que no estaban presentes en la hoja **MAESTRA** del archivo Excel y que fueron creados automáticamente en la base de datos.\n\n`;
  md += `*   **Total de SKUs huérfanos creados:** ${orphanSkus.size}\n\n`;
  md += `| SKU | Código Barras | Nombre Completo | Proveedor | Costo | Venta |\n`;
  md += `| :---: | :---: | :--- | :--- | :---: | :---: |\n`;

  for (const [sku, item] of orphanSkus.entries()) {
    md += `| ${sku} | \`${item.barcode || '—'}\` | ${item.name} | ${item.provider} | $${item.costPrice.toLocaleString()} | $${item.sellPrice.toLocaleString()} |\n`;
  }

  fs.writeFileSync('compras_huerfanas.md', md, 'utf-8');
  console.log('Reporte de compras huérfanas generado en "compras_huerfanas.md".');
}

main()
  .catch((e) => {
    console.error('Error durante la migración de compras:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
