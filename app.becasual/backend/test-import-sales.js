import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseCSVNumber(val) {
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

function parseSalesCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(';').map(h => h.trim());
  
  const sales = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(';');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = parts[idx] ? parts[idx].trim() : '';
    });
    sales.push(row);
  }
  return sales;
}

async function main() {
  const csvPath = path.resolve('data/plantilla_ventas-3.csv');
  console.log('Parseando CSV:', csvPath);
  const rows = parseSalesCSV(csvPath);
  console.log(`Se leyeron ${rows.length} líneas del CSV.`);

  const grouped = {};
  rows.forEach(row => {
    const invNum = row['Numero Factura'];
    if (!invNum) return;

    if (!grouped[invNum]) {
      grouped[invNum] = {
        id: `sale_${invNum}`,
        invoiceNumber: invNum,
        date: row['Fecha y Hora'] || new Date().toISOString(),
        clientName: row['Nombre Cliente'] || 'Cliente Final',
        clientDocument: row['Documento Cliente'] || null,
        sellerId: row['Usuario Vendedor'] || 'admin',
        paymentMethod: row['Metodo Pago'] || 'Efectivo',
        accumulatedSubtotal: 0,
        accumulatedTax: 0,
        accumulatedTotal: 0,
        accumulatedDiscount: 0,
        items: []
      };
    }

    const currentItemSubtotal = parseCSVNumber(row['Subtotal Factura']);
    const currentItemTax = parseCSVNumber(row['IVA Factura']);
    const currentItemTotal = parseCSVNumber(row['Total Factura']);
    const currentItemDiscount = parseCSVNumber(row['Descuento Porcentaje']);

    grouped[invNum].accumulatedSubtotal += currentItemSubtotal;
    grouped[invNum].accumulatedTax += currentItemTax;
    grouped[invNum].accumulatedTotal += currentItemTotal;
    grouped[invNum].accumulatedDiscount += currentItemDiscount;

    const cleanBarcode = String(row['Codigo de Barras'] || '').replace(/\*/g, '').trim();

    grouped[invNum].items.push({
      productId: `prod_generico_${cleanBarcode}`,
      name: row['Nombre Producto'] || 'Producto Genérico',
      barcode: cleanBarcode,
      quantity: parseCSVNumber(row['Cantidad']) || 1,
      sellPrice: parseCSVNumber(row['Precio']) || 0,
      discount: parseCSVNumber(row['Descuento Porcentaje']) || 0,
      costPrice: 0
    });
  });

  const flatSales = Object.values(grouped);
  console.log(`Agrupadas en ${flatSales.length} facturas únicas.`);

  // 1. Precargar catálogo de productos en memoria para evitar llamadas repetidas
  console.log('Precargando catálogo de productos desde GCP...');
  const allProducts = await prisma.product.findMany();
  const productMapById = new Map(allProducts.map(p => [p.id, p]));
  const productMapBySku = new Map(allProducts.map(p => [p.sku.toLowerCase(), p]));
  const productMapByBarcode = new Map(allProducts.map(p => [p.barcode.toLowerCase(), p]));
  console.log(`Mapeados ${allProducts.length} productos en memoria.`);

  const validStores = await prisma.store.findMany({ select: { id: true } });
  const storeIds = validStores.map(s => s.id);
  const defaultStoreId = storeIds[0] || 'store_1';

  const validEmployees = await prisma.employee.findMany({ select: { id: true } });
  const employeeIds = validEmployees.map(e => e.id);

  const CHUNK_SIZE = 100;
  for (let i = 0; i < flatSales.length; i += CHUNK_SIZE) {
    const chunk = flatSales.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- Procesando bloque ${i / CHUNK_SIZE + 1} (${chunk.length} ventas) ---`);
    
    const startTime = Date.now();

    // Consultar qué ventas de este bloque ya existen en GCP
    const existingSales = await prisma.sale.findMany({
      where: { id: { in: chunk.map(s => s.id) } },
      select: { id: true }
    });
    const existingIds = new Set(existingSales.map(s => s.id));

    const salesToInsert = [];
    const detailsToInsert = [];

    for (const sale of chunk) {
      if (existingIds.has(sale.id)) {
        continue; // Omitir si la factura ya existe para evitar errores
      }

      const targetStoreId = storeIds.includes(sale.storeId) ? sale.storeId : defaultStoreId;
      const targetEmployeeId = employeeIds.includes(sale.sellerId) ? sale.sellerId : null;

      salesToInsert.push({
        id: sale.id,
        storeId: targetStoreId,
        invoiceNumber: sale.invoiceNumber,
        date: sale.date ? new Date(sale.date) : new Date(),
        clientName: sale.clientName || 'Cliente Final',
        employeeId: targetEmployeeId,
        paymentMethod: sale.paymentMethod || 'Efectivo',
        total: Number(sale.total || sale.accumulatedTotal) || 0
      });

      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (!item.productId) continue;

          let cleanBarcode = String(item.barcode || '').replace(/\*/g, '').trim();
          if (!cleanBarcode && String(item.productId).startsWith('prod_generico_')) {
            cleanBarcode = String(item.productId).replace('prod_generico_', '').replace(/\*/g, '').trim();
          }

          // Buscar en memoria
          let prod = productMapById.get(item.productId);
          if (!prod && cleanBarcode) {
            prod = productMapBySku.get(cleanBarcode.toLowerCase()) || productMapByBarcode.get(cleanBarcode.toLowerCase());
          }

          if (!prod) {
            // Si el producto no existe en GCP, lo creamos de forma síncrona
            prod = await prisma.product.create({
              data: {
                id: item.productId,
                storeId: defaultStoreId,
                barcode: cleanBarcode || `GEN_${Math.random().toString(36).slice(2, 8)}`,
                sku: cleanBarcode || `GEN_${Math.random().toString(36).slice(2, 8)}`,
                name: item.name || 'Producto Genérico',
                stock: 0,
                costPrice: Number(item.costPrice) || 0,
                sellPrice: Number(item.sellPrice || item.price) || 0,
                line: 'Genérico',
                category: 'Importación',
                gender: 'Unisex',
                style: 'Genérico',
                color: 'N/A',
                size: 'U',
                provider: 'Genérico'
              }
            });

            // Registrar en memoria
            productMapById.set(prod.id, prod);
            productMapBySku.set(prod.sku.toLowerCase(), prod);
            productMapByBarcode.set(prod.barcode.toLowerCase(), prod);
          }

          // Vincular el ID del producto resuelto
          item.productId = prod.id;

          detailsToInsert.push({
            id: `det_${Math.random().toString(36).slice(2, 10)}`,
            saleId: sale.id,
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
            price: Number(item.sellPrice || item.price) || (prod ? prod.sellPrice : 0),
            subtotal: Number(item.subtotal) || (Number(item.quantity) * (prod ? prod.sellPrice : 0))
          });
        }
      }
    }

    try {
      // Inserción masiva ultra veloz
      if (salesToInsert.length > 0) {
        await prisma.sale.createMany({
          data: salesToInsert,
          skipDuplicates: true
        });
      }

      if (detailsToInsert.length > 0) {
        await prisma.saleDetail.createMany({
          data: detailsToInsert,
          skipDuplicates: true
        });
      }

      console.log(`Bloque ${i / CHUNK_SIZE + 1} insertado con éxito en ${((Date.now() - startTime) / 1000).toFixed(2)}s. (Insertadas: ${salesToInsert.length} ventas, ${detailsToInsert.length} detalles)`);
    } catch (err) {
      console.error(`Error al insertar lote ${i / CHUNK_SIZE + 1}:`, err);
      break;
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
