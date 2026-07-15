import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx');
console.log('Cargando archivo Excel:', filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = 'MAESTRA';

if (!workbook.SheetNames.includes(sheetName)) {
  console.error(`La hoja "${sheetName}" no existe en el libro de Excel.`);
  console.log('Hojas disponibles:', workbook.SheetNames);
  process.exit(1);
}

const sheetsToCheck = ['COMPRAS', 'INVERSION INICIAL', 'PARAM'];
for (const name of sheetsToCheck) {
  const sh = workbook.Sheets[name];
  if (sh) {
    const shData = XLSX.utils.sheet_to_json(sh);
    console.log(`\n--- Hoja: ${name} ---`);
    console.log('Total filas:', shData.length);
    if (shData.length > 0) {
      console.log('Fila 0 (Encabezados leídos):', shData[0]);
      console.log('Fila 1 (Ejemplo de datos):', shData[1]);
    }
  }
}

console.log('Todas las hojas del archivo:', workbook.SheetNames);
for (const name of workbook.SheetNames) {
  const sh = workbook.Sheets[name];
  console.log(`Hoja: "${name}", Rango: ${sh['!ref']}`);
}
