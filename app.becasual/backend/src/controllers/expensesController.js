import { prisma } from '../config/db.js';

// ==========================================
// CATEGORIES CONTROLLERS
// ==========================================

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías de gastos.', details: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null
      }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear categoría de gastos.', details: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined
      }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar categoría de gastos.', details: error.message });
  }
};

export const removeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar si tiene gastos asociados
    const expensesCount = await prisma.expense.count({
      where: { categoryId: id }
    });
    if (expensesCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene gastos asociados.' });
    }

    // Validar si tiene presupuestos asociados
    const budgetsCount = await prisma.expenseBudget.count({
      where: { categoryId: id }
    });
    if (budgetsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene presupuestos planificados.' });
    }

    await prisma.expenseCategory.delete({
      where: { id }
    });
    res.json({ message: 'Categoría eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar categoría de gastos.', details: error.message });
  }
};

export const bulkSyncCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Se requiere una lista de categorías.' });
    }

    if (categories.length > 0) {
      await prisma.expenseCategory.createMany({
        data: categories.map(c => ({
          id: c.id,
          name: c.name.trim(),
          description: c.description ? c.description.trim() : null
        })),
        skipDuplicates: true
      });
    }

    const allCategories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(allCategories);
  } catch (error) {
    res.status(500).json({ error: 'Error en sincronización masiva de categorías.', details: error.message });
  }
};


// ==========================================
// EXPENSES CONTROLLERS
// ==========================================

export const getExpenses = async (req, res) => {
  try {
    const { storeId, categoryId, startDate, endDate, query } = req.query;
    const where = {};

    if (storeId && storeId !== 'all') {
      where.storeId = storeId;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (query && query.trim() !== '') {
      where.description = {
        contains: query.trim(),
        mode: 'insensitive'
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener gastos.', details: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { id, storeId, categoryId, description, amount, date, referenceNumber, paymentMethod } = req.body;

    if (!storeId) return res.status(400).json({ error: 'La sucursal (storeId) es obligatoria.' });
    if (!categoryId) return res.status(400).json({ error: 'La categoría de gasto es obligatoria.' });
    if (!description || description.trim() === '') return res.status(400).json({ error: 'La descripción es obligatoria.' });
    if (amount === undefined || amount === null) return res.status(400).json({ error: 'El monto es obligatorio.' });

    const expense = await prisma.expense.create({
      data: {
        id: id || undefined,
        storeId,
        categoryId,
        description: description.trim(),
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        paymentMethod: paymentMethod || 'Efectivo'
      },
      include: {
        category: true
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar gasto.', details: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, description, amount, date, referenceNumber, paymentMethod } = req.body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        categoryId: categoryId || undefined,
        description: description ? description.trim() : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        date: date ? new Date(date) : undefined,
        referenceNumber: referenceNumber !== undefined ? referenceNumber.trim() : undefined,
        paymentMethod: paymentMethod || undefined
      },
      include: {
        category: true
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar gasto.', details: error.message });
  }
};

export const removeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id }
    });
    res.json({ message: 'Gasto eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar gasto.', details: error.message });
  }
};

export const bulkSyncExpenses = async (req, res) => {
  try {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) {
      return res.status(400).json({ error: 'Se requiere una lista de gastos.' });
    }

    if (expenses.length > 0) {
      // Verificar qué gastos ya existen en la base de datos para omitir o actualizar
      const existingIds = new Set(
        (await prisma.expense.findMany({
          where: { id: { in: expenses.map(e => e.id) } },
          select: { id: true }
        })).map(e => e.id)
      );

      const toInsert = expenses.filter(e => !existingIds.has(e.id)).map(e => ({
        id: e.id,
        storeId: e.storeId,
        categoryId: e.categoryId,
        description: e.description || '',
        amount: Number(e.amount) || 0,
        date: e.date ? new Date(e.date) : new Date(),
        referenceNumber: e.referenceNumber || null,
        paymentMethod: e.paymentMethod || 'Efectivo'
      }));

      if (toInsert.length > 0) {
        await prisma.expense.createMany({
          data: toInsert,
          skipDuplicates: true
        });
      }
    }

    const allExpenses = await prisma.expense.findMany({
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(allExpenses);
  } catch (error) {
    res.status(500).json({ error: 'Error en sincronización masiva de gastos.', details: error.message });
  }
};


// ==========================================
// BUDGETS CONTROLLERS
// ==========================================

export const getBudgets = async (req, res) => {
  try {
    const { storeId, month, year } = req.query;
    const where = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);

    const budgets = await prisma.expenseBudget.findMany({
      where,
      include: {
        category: true
      }
    });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener presupuestos.', details: error.message });
  }
};

export const saveBudget = async (req, res) => {
  try {
    const { storeId, categoryId, amount, month, year } = req.body;

    if (!storeId) return res.status(400).json({ error: 'La sucursal (storeId) es obligatoria.' });
    if (!categoryId) return res.status(400).json({ error: 'La categoría es obligatoria.' });
    if (amount === undefined || amount === null) return res.status(400).json({ error: 'El monto es obligatorio.' });
    if (!month || !year) return res.status(400).json({ error: 'El mes y año son obligatorios.' });

    const budget = await prisma.expenseBudget.upsert({
      where: {
        storeId_categoryId_month_year: {
          storeId,
          categoryId,
          month: Number(month),
          year: Number(year)
        }
      },
      update: {
        amount: Number(amount)
      },
      create: {
        storeId,
        categoryId,
        amount: Number(amount),
        month: Number(month),
        year: Number(year)
      },
      include: {
        category: true
      }
    });

    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar presupuesto.', details: error.message });
  }
};

export const bulkSyncBudgets = async (req, res) => {
  try {
    const { budgets } = req.body;
    if (!Array.isArray(budgets)) {
      return res.status(400).json({ error: 'Se requiere una lista de presupuestos.' });
    }

    if (budgets.length > 0) {
      // Para presupuestos, al tener una clave compuesta única, ejecutamos upserts dentro de una transacción
      await prisma.$transaction(
        budgets.map(b => 
          prisma.expenseBudget.upsert({
            where: {
              storeId_categoryId_month_year: {
                storeId: b.storeId,
                categoryId: b.categoryId,
                month: Number(b.month),
                year: Number(b.year)
              }
            },
            update: {
              amount: Number(b.amount)
            },
            create: {
              id: b.id || undefined,
              storeId: b.storeId,
              categoryId: b.categoryId,
              amount: Number(b.amount),
              month: Number(b.month),
              year: Number(b.year)
            }
          })
        )
      );
    }

    const allBudgets = await prisma.expenseBudget.findMany({
      include: {
        category: true
      }
    });
    res.json(allBudgets);
  } catch (error) {
    res.status(500).json({ error: 'Error en sincronización masiva de presupuestos.', details: error.message });
  }
};
