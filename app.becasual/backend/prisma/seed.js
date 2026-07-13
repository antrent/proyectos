import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de semilla (seeding)...');

  // 1. Cargar el JSON de datos procesados
  const dataPath = path.join(__dirname, '../data/parsed_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error('No se encontró el archivo parsed_data.json. Ejecuta primero el actualizador de datos.');
  }
  const seedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 2. Limpieza de datos existentes (orden inverso de dependencias de FKs)
  console.log('Limpiando base de datos...');
  await prisma.closing.deleteMany({});
  await prisma.layaway.deleteMany({});
  await prisma.saleDetail.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.store.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.employee.deleteMany({});

  // 3. Crear Sedes (Stores)
  console.log('Creando sedes (cargando configuración)...');
  await prisma.store.create({
    data: {
      id: 'store_1',
      name: seedData.config.nombre || 'tienda.Be casual Principal',
      slogan: 'Vístete para ser tú mismo.',
      address: seedData.config.dirección || 'Calle 132 # 92-32',
      phone: String(seedData.config.celular || '3115929346'),
      email: seedData.config.correo || 'ventas@tiendabecasual.com',
      rent: seedData.config.monto || '2 millones',
      taxRate: 19,
    },
  });

  await prisma.store.create({
    data: {
      id: 'store_2',
      name: 'tienda.Be casual Centro',
      slogan: 'Calidad y diseño para tu estilo.',
      address: 'Carrera 10 # 12-45',
      phone: '3204567890',
      email: 'centro@tiendabecasual.com',
      rent: '1.5 millones',
      taxRate: 19,
    },
  });

  // 4. Crear Usuarios Iniciales
  console.log('Creando usuarios iniciales...');
  const hashedPassword = await bcrypt.hash('123', 10);
  await prisma.user.createMany({
    data: [
      { username: 'admin', password: hashedPassword, name: 'Administrador BeCasual', role: 'admin' },
      { username: 'cajero', password: hashedPassword, name: 'Carlos Vendedor', role: 'vendedor' },
      { username: 'comprador', password: hashedPassword, name: 'María Compras', role: 'comprador' },
    ],
  });

  // 5. Crear Empleado inicial (Administrador)
  console.log('Creando registros de empleados...');
  await prisma.employee.create({
    data: {
      id: 'emp_1',
      name: 'Administrador BeCasual',
      document: '00000001',
      role: 'Administrador',
      phone: '3115929346',
      email: 'admin@tiendabecasual.com',
      salary: 0,
      startDate: new Date(),
      status: 'activo',
    },
  });

  // 6. Crear Productos (Inventario)
  console.log(`Cargando ${seedData.products.length} productos en el inventario...`);
  const productsData = seedData.products.map((p) => ({
    storeId: 'store_1',
    barcode: String(p.barcode || ''),
    sku: String(p.sku || ''),
    name: p.name || '',
    stock: p.stock || 0,
    costPrice: p.costPrice || 0,
    sellPrice: p.sellPrice || 0,
    line: p.line || '-',
    category: p.category || '-',
    gender: p.gender || '-',
    style: p.style || '-',
    color: p.color || '-',
    size: String(p.size || '-'),
    provider: p.provider || '-',
    minStock: 5,
  }));

  // Agrupamos en bloques para evitar desbordes en createMany
  const prodChunkSize = 200;
  for (let i = 0; i < productsData.length; i += prodChunkSize) {
    const chunk = productsData.slice(i, i + prodChunkSize);
    await prisma.product.createMany({
      data: chunk,
    });
  }

  // 7. Crear Compras históricas
  console.log(`Cargando ${seedData.purchases.length} registros de compras...`);
  const purchasesData = seedData.purchases.map((pur) => ({
    storeId: 'store_1',
    date: new Date(pur.date),
    barcode: String(pur.barcode || ''),
    sku: String(pur.sku || ''),
    name: pur.name || '',
    provider: pur.provider || '-',
    quantity: pur.quantity || 0,
    costPrice: pur.costPrice || 0,
    totalPrice: pur.totalPrice || 0,
    sellPrice: pur.sellPrice || 0,
  }));

  const chunkSize = 200;
  for (let i = 0; i < purchasesData.length; i += chunkSize) {
    const chunk = purchasesData.slice(i, i + chunkSize);
    await prisma.purchase.createMany({
      data: chunk,
    });
  }

  console.log('Carga de semilla completada con éxito. 🎉');
}

main()
  .catch((e) => {
    console.error('Error durante la carga de semilla:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
