import XLSX from 'xlsx';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.resolve('data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx');
  console.log('Cargando archivo Excel:', filePath);

  const workbook = XLSX.readFile(filePath);

  // 1. Cargar precios y costos de la hoja "COMPRAS"
  console.log('Procesando costos y precios de la hoja "COMPRAS"...');
  const comprasSheet = workbook.Sheets['COMPRAS'];
  if (!comprasSheet) {
    throw new Error('La hoja "COMPRAS" no existe en el archivo Excel.');
  }

  const comprasRows = XLSX.utils.sheet_to_json(comprasSheet, { header: 1 });
  const headersCompras = comprasRows[2].map(h => String(h || '').toUpperCase().trim());
  const barcodeIdxCompras = headersCompras.indexOf('CODIGO DE BARRAS');
  const costIdxCompras = headersCompras.indexOf('VALOR UNT');
  const sellIdxCompras = headersCompras.indexOf('PRECIO DE VENTA');

  if (barcodeIdxCompras === -1 || costIdxCompras === -1 || sellIdxCompras === -1) {
    throw new Error('No se encontraron las columnas requeridas (CODIGO DE BARRAS, VALOR UNT, PRECIO DE VENTA) en la hoja COMPRAS.');
  }

  const priceMap = new Map();
  for (let r = 3; r < comprasRows.length; r++) {
    const row = comprasRows[r];
    let barcode = String(row[barcodeIdxCompras] || '').replace(/\*/g, '').trim();
    if (!barcode) continue;

    const costPrice = Number(row[costIdxCompras]) || 0;
    const sellPrice = Number(row[sellIdxCompras]) || 0;

    // Guardar en el mapa (el último precio registrado prevalece)
    priceMap.set(barcode, { costPrice, sellPrice });
  }
  console.log(`Se mapearon precios para ${priceMap.size} códigos de barras únicos de compras.`);

  // 2. Procesar productos de la hoja "MAESTRA"
  console.log('Procesando productos de la hoja "MAESTRA"...');
  const maestraSheet = workbook.Sheets['MAESTRA'];
  if (!maestraSheet) {
    throw new Error('La hoja "MAESTRA" no existe en el archivo Excel.');
  }

  const maestraRows = XLSX.utils.sheet_to_json(maestraSheet, { header: 1 });
  const headersMaestra = maestraRows[2].map(h => String(h || '').toUpperCase().trim());
  const barcodeIdxMaestra = headersMaestra.indexOf('CODIGO DE BARRAS');
  const nameIdxMaestra = headersMaestra.indexOf('NOMBRE COMPLETO');
  const lineIdxMaestra = headersMaestra.indexOf('LINEA');
  const categoryIdxMaestra = headersMaestra.indexOf('CATEGORIA');
  const genderIdxMaestra = headersMaestra.indexOf('GENERO');
  const styleIdxMaestra = headersMaestra.indexOf('ESTILO-DETALLE');
  const colorIdxMaestra = headersMaestra.indexOf('COLOR');
  const sizeIdxMaestra = headersMaestra.indexOf('TALLA');
  const providerIdxMaestra = headersMaestra.indexOf('PROVEEDOR-MARCA');

  if (barcodeIdxMaestra === -1 || nameIdxMaestra === -1) {
    throw new Error('No se encontraron las columnas críticas (CODIGO DE BARRAS, NOMBRE COMPLETO) en la hoja MAESTRA.');
  }

  const processedBarcodes = new Set();
  const productsToCreate = [];

  for (let r = 3; r < maestraRows.length; r++) {
    const row = maestraRows[r];
    let barcode = String(row[barcodeIdxMaestra] || '').replace(/\*/g, '').trim();
    if (!barcode) continue;

    // Control de unicidad de código de barra
    if (processedBarcodes.has(barcode)) {
      continue;
    }
    processedBarcodes.add(barcode);

    // SKU igual al código de barras (el código de barras prevalece)
    const sku = barcode;

    const name = String(row[nameIdxMaestra] || 'Producto Sin Nombre').trim();
    const line = String(row[lineIdxMaestra] || 'Genérico').trim();
    const category = String(row[categoryIdxMaestra] || 'Importación').trim();
    const gender = String(row[genderIdxMaestra] || 'Unisex').trim();
    const style = String(row[styleIdxMaestra] || 'Estándar').trim();
    const color = String(row[colorIdxMaestra] || 'N/A').trim();
    const size = String(row[sizeIdxMaestra] || 'U').trim();
    const provider = String(row[providerIdxMaestra] || 'Genérico').trim();

    // Consultar precios desde el mapa de COMPRAS
    const prices = priceMap.get(barcode) || { costPrice: 0, sellPrice: 0 };

    productsToCreate.push({
      id: `prod_${Math.random().toString(36).slice(2, 10)}`,
      storeId: 'store_1',
      barcode,
      sku,
      name,
      stock: 0, // Inicia con stock 0
      costPrice: prices.costPrice,
      sellPrice: prices.sellPrice,
      line,
      category,
      gender,
      style,
      color,
      size,
      provider,
      minStock: 5
    });
  }

  console.log(`Se procesaron ${productsToCreate.length} productos listos para insertar (descartados duplicados).`);

  // 3. Conexión y limpieza de la Base de Datos en GCP
  console.log('Conectando a PostgreSQL y limpiando base de datos...');
  
  // Garantizar que la tienda store_1 exista
  const storeExists = await prisma.store.findUnique({ where: { id: 'store_1' } });
  if (!storeExists) {
    await prisma.store.create({
      data: {
        id: 'store_1',
        name: 'tienda.Be casual',
        slogan: 'Estilo y comodidad',
        address: 'Bogotá, Colombia',
        phone: '3000000000',
        defaultOpeningCash: 0
      }
    });
  }

  // Borrados en cascada para evitar errores de clave foránea
  await prisma.saleDetail.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.layaway.deleteMany({});
  await prisma.product.deleteMany({});
  
  console.log('Limpieza completada. Base de datos vacía de productos y transacciones.');

  // 4. Inserción de productos
  console.log('Insertando productos en PostgreSQL...');
  // Insertar en lotes de 100 para evitar desbordes de memoria o queries gigantes en Prisma
  const BATCH_SIZE = 100;
  for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
    const batch = productsToCreate.slice(i, i + BATCH_SIZE);
    await prisma.product.createMany({
      data: batch
    });
    console.log(`Insertados productos del ${i + 1} al ${Math.min(i + BATCH_SIZE, productsToCreate.length)}`);
  }

  console.log('¡Migración y carga de productos completada con éxito! 🎉');
}

main()
  .catch((e) => {
    console.error('Error durante la migración de productos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
