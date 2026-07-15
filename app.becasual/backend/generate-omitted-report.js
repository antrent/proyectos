import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve('data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx');
console.log('Cargando archivo Excel:', filePath);

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['MAESTRA'];
if (!sheet) {
  console.error('No se encontró la hoja MAESTRA.');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const headers = rows[2].map(h => String(h || '').toUpperCase().trim());
const barcodeIdx = headers.indexOf('CODIGO DE BARRAS');
const nameIdx = headers.indexOf('NOMBRE COMPLETO');
const skuIdx = headers.indexOf('SKU');
const lineIdx = headers.indexOf('LINEA');

if (barcodeIdx === -1 || nameIdx === -1) {
  console.error('No se encontraron columnas requeridas.');
  process.exit(1);
}

const processedBarcodes = new Set();
const omitted = [];

for (let r = 3; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length === 0) continue; // Saltar filas completamente vacías al final del archivo

  const originalBarcode = row[barcodeIdx];
  const barcode = String(originalBarcode || '').replace(/\*/g, '').trim();
  const name = String(row[nameIdx] || 'Producto Sin Nombre').trim();
  const sku = String(row[skuIdx] || '').trim();
  const line = String(row[lineIdx] || '').trim();

  // Si la fila está vacía en los campos críticos
  if (!barcode && name === 'Producto Sin Nombre') {
    continue; // Omitir filas en blanco de separadores visuales
  }

  if (!barcode) {
    omitted.push({
      filaExcel: r + 1,
      sku,
      barcode: '[VACÍO]',
      name,
      line,
      motivo: 'Código de barras vacío'
    });
    continue;
  }

  if (processedBarcodes.has(barcode)) {
    omitted.push({
      filaExcel: r + 1,
      sku,
      barcode: originalBarcode,
      name,
      line,
      motivo: `Código de barras duplicado (ya se cargó previamente el código "${barcode}")`
    });
    continue;
  }
  
  processedBarcodes.add(barcode);
}

let md = `# Reporte de Productos Omitidos del Inventario (Hoja MAESTRA)\n\n`;
md += `Este reporte detalla cada uno de los productos de la hoja **MAESTRA** del archivo Excel que **no** se cargaron a la base de datos de producción remota de GCP y el motivo correspondiente.\n\n`;
md += `*   **Total de productos cargados con éxito:** ${processedBarcodes.size}\n`;
md += `*   **Total de productos/filas excluidos:** ${omitted.length}\n\n`;
md += `### Detalle de Productos Excluidos\n\n`;
md += `| Fila Excel | SKU | Código Barras | Nombre Completo | Línea | Motivo Exclusión |\n`;
md += `| :---: | :---: | :---: | :--- | :--- | :--- |\n`;

omitted.forEach(item => {
  md += `| ${item.filaExcel} | ${item.sku || '—'} | \`${item.barcode}\` | ${item.name} | ${item.line || '—'} | ${item.motivo} |\n`;
});

fs.writeFileSync('productos_omitidos.md', md, 'utf-8');
console.log(`Reporte generado con éxito en "productos_omitidos.md" con ${omitted.length} registros omitidos.`);
