import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx');
const workbook = XLSX.readFile(filePath);

const sheets = ['COMPRAS', 'MAESTRA'];
for (const name of sheets) {
  const sh = workbook.Sheets[name];
  console.log(`\n=== Hoja: ${name} (Rango: ${sh['!ref']}) ===`);
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    console.log(`Fila física ${i + 1}:`, rows[i]);
  }
}
