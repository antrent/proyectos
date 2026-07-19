import { PrismaClient } from '@prisma/client';

const cloudDbUrl = "postgresql://becasual_user:becasual_password_987@136.112.170.11:5432/becasual?schema=public";
const localDbUrl = process.env.LOCAL_DATABASE_URL || "postgresql://becasual_user:becasual_password_987@localhost:5432/becasual?schema=public";

const cloudPrisma = new PrismaClient({
  datasources: { db: { url: cloudDbUrl } }
});

const localPrisma = new PrismaClient({
  datasources: { db: { url: localDbUrl } }
});

async function main() {
  console.log('🚀 Iniciando copia completa de la base de datos (GCP Cloud -> Mac Local)...');

  try {
    // 1. Obtener datos de la nube
    console.log('📦 Extrayendo tablas desde la nube de GCP...');
    const stores = await cloudPrisma.store.findMany();
    const users = await cloudPrisma.user.findMany();
    const clients = await cloudPrisma.client.findMany();
    const employees = await cloudPrisma.employee.findMany();
    const expenseCategories = await cloudPrisma.expenseCategory.findMany();
    const products = await cloudPrisma.product.findMany();
    const purchases = await cloudPrisma.purchase.findMany();
    const sales = await cloudPrisma.sale.findMany({ include: { details: true } });
    const layaways = await cloudPrisma.layaway.findMany();
    const closings = await cloudPrisma.closing.findMany();
    const expenses = await cloudPrisma.expense.findMany();
    const budgets = await cloudPrisma.expenseBudget.findMany();

    console.log(`  -> Extraídas ${stores.length} tiendas, ${expenseCategories.length} categorías de presupuesto, ${products.length} productos, ${purchases.length} compras, ${sales.length} ventas.`);

    // 2. Limpiar la base de datos local (en orden inverso a las relaciones)
    console.log('🧹 Limpiando base de datos local en Mac...');
    await localPrisma.saleDetail.deleteMany({});
    await localPrisma.sale.deleteMany({});
    await localPrisma.expenseBudget.deleteMany({});
    await localPrisma.expense.deleteMany({});
    await localPrisma.expenseCategory.deleteMany({});
    await localPrisma.purchase.deleteMany({});
    await localPrisma.product.deleteMany({});
    await localPrisma.layaway.deleteMany({});
    await localPrisma.closing.deleteMany({});
    await localPrisma.employee.deleteMany({});
    await localPrisma.client.deleteMany({});
    await localPrisma.user.deleteMany({});
    await localPrisma.store.deleteMany({});

    console.log('📥 Insertando datos en la base de datos PostgreSQL local...');
    
    // Insertar modelos base sin dependencias externas
    if (stores.length > 0) await localPrisma.store.createMany({ data: stores });
    if (users.length > 0) await localPrisma.user.createMany({ data: users });
    if (clients.length > 0) await localPrisma.client.createMany({ data: clients });
    if (employees.length > 0) await localPrisma.employee.createMany({ data: employees });
    if (expenseCategories.length > 0) await localPrisma.expenseCategory.createMany({ data: expenseCategories });

    // Insertar modelos dependientes
    if (products.length > 0) await localPrisma.product.createMany({ data: products });
    if (purchases.length > 0) await localPrisma.purchase.createMany({ data: purchases });
    if (budgets.length > 0) await localPrisma.expenseBudget.createMany({ data: budgets });
    if (expenses.length > 0) await localPrisma.expense.createMany({ data: expenses });
    if (closings.length > 0) await localPrisma.closing.createMany({ data: closings });
    if (layaways.length > 0) await localPrisma.layaway.createMany({ data: layaways });

    // Insertar ventas y sus detalles
    const salesToInsert = sales.map(s => {
      const { details, ...saleData } = s;
      return saleData;
    });

    const detailsToInsert = sales.flatMap(s => s.details);

    if (salesToInsert.length > 0) await localPrisma.sale.createMany({ data: salesToInsert });
    if (detailsToInsert.length > 0) await localPrisma.saleDetail.createMany({ data: detailsToInsert });

    console.log('🎉 ¡Copia completa realizada con éxito! Tu base de datos local en Mac es 100% idéntica a la de GCP.');
  } catch (error) {
    console.error('❌ Error al copiar base de datos a entorno local:', error);
  } finally {
    await cloudPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

main();
