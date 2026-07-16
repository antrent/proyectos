import { storageRepository } from './StorageRepository';

class ExpensesService {
  // ==========================================
  // CATEGORIES SERVICES
  // ==========================================

  getCategories() {
    return storageRepository.getExpenseCategories();
  }

  addCategory({ name, description }) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

    const categories = this.getCategories();
    const nameLower = name.trim().toLowerCase();
    
    // Validar duplicado
    if (categories.some(c => c.name.toLowerCase() === nameLower)) {
      throw new Error('Ya existe una categoría con este nombre.');
    }

    const newCategory = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      description: description ? description.trim() : null
    };

    categories.push(newCategory);
    storageRepository.saveExpenseCategories(categories);
    storageRepository.syncWithCloud();

    return newCategory;
  }

  updateCategory(id, { name, description }) {
    if (!name || name.trim() === '') {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Categoría no encontrada.');

    // Validar duplicado con otros IDs
    const nameLower = name.trim().toLowerCase();
    if (categories.some((c, idx) => idx !== index && c.name.toLowerCase() === nameLower)) {
      throw new Error('Ya existe otra categoría con este nombre.');
    }

    categories[index] = {
      ...categories[index],
      name: name.trim(),
      description: description !== undefined ? description.trim() : categories[index].description
    };

    storageRepository.saveExpenseCategories(categories);
    storageRepository.syncWithCloud();

    return categories[index];
  }

  deleteCategory(id) {
    // Validar si la categoría está en uso en gastos
    const expenses = storageRepository.getExpenses();
    if (expenses.some(e => e.categoryId === id)) {
      throw new Error('No se puede eliminar la categoría porque tiene gastos asociados.');
    }

    // Validar si la categoría está en uso en presupuestos
    const budgets = storageRepository.getExpenseBudgets();
    if (budgets.some(b => b.categoryId === id)) {
      throw new Error('No se puede eliminar la categoría porque tiene presupuestos planificados.');
    }

    const categories = this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    if (categories.length === filtered.length) {
      throw new Error('Categoría no encontrada.');
    }

    storageRepository.saveExpenseCategories(filtered);
    storageRepository.syncWithCloud();
    return true;
  }


  // ==========================================
  // EXPENSES SERVICES
  // ==========================================

  getAll(storeId = 'all') {
    const expenses = storageRepository.getExpenses();
    const categories = this.getCategories();

    // Mapear con su objeto categoría para facilitar la visualización en tablas
    const populated = expenses.map(e => ({
      ...e,
      category: categories.find(c => c.id === e.categoryId) || { id: e.categoryId, name: 'Desconocido' }
    }));

    if (storeId === 'all') return populated;
    return populated.filter(e => e.storeId === storeId);
  }

  getExpenses(storeId = 'all', { categoryId, startDate, endDate, query } = {}) {
    let list = this.getAll(storeId);

    if (categoryId) {
      list = list.filter(e => e.categoryId === categoryId);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(e => new Date(e.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(e => new Date(e.date) <= end);
    }

    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      list = list.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q))
      );
    }

    // Ordenar de más reciente a más antiguo
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addExpense({ storeId, categoryId, description, amount, date, referenceNumber, paymentMethod }) {
    if (!storeId) throw new Error('La sucursal es obligatoria.');
    if (!categoryId) throw new Error('La categoría del gasto es obligatoria.');
    if (!description || description.trim() === '') throw new Error('La descripción del gasto es obligatoria.');
    if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
      throw new Error('El monto del gasto debe ser un número positivo.');
    }

    const expenses = storageRepository.getExpenses();
    const newExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      storeId,
      categoryId,
      description: description.trim(),
      amount: Number(amount),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      referenceNumber: referenceNumber ? referenceNumber.trim() : null,
      paymentMethod: paymentMethod || 'Efectivo'
    };

    expenses.push(newExpense);
    storageRepository.saveExpenses(expenses);
    storageRepository.syncWithCloud();

    return newExpense;
  }

  updateExpense(id, { categoryId, description, amount, date, referenceNumber, paymentMethod }) {
    const expenses = storageRepository.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Gasto no encontrado.');

    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      throw new Error('El monto del gasto debe ser un número positivo.');
    }

    expenses[index] = {
      ...expenses[index],
      categoryId: categoryId || expenses[index].categoryId,
      description: description !== undefined ? description.trim() : expenses[index].description,
      amount: amount !== undefined ? Number(amount) : expenses[index].amount,
      date: date ? new Date(date).toISOString() : expenses[index].date,
      referenceNumber: referenceNumber !== undefined ? (referenceNumber ? referenceNumber.trim() : null) : expenses[index].referenceNumber,
      paymentMethod: paymentMethod || expenses[index].paymentMethod
    };

    storageRepository.saveExpenses(expenses);
    storageRepository.syncWithCloud();

    return expenses[index];
  }

  deleteExpense(id) {
    const expenses = storageRepository.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    if (expenses.length === filtered.length) throw new Error('Gasto no encontrado.');

    storageRepository.saveExpenses(filtered);
    storageRepository.syncWithCloud();
    return true;
  }


  // ==========================================
  // BUDGET SERVICES
  // ==========================================

  getBudgets(storeId = 'all', month, year) {
    const budgets = storageRepository.getExpenseBudgets();
    const categories = this.getCategories();

    let list = budgets.map(b => ({
      ...b,
      category: categories.find(c => c.id === b.categoryId) || { id: b.categoryId, name: 'Desconocido' }
    }));

    if (storeId !== 'all') {
      list = list.filter(b => b.storeId === storeId);
    }
    if (month !== undefined) {
      list = list.filter(b => Number(b.month) === Number(month));
    }
    if (year !== undefined) {
      list = list.filter(b => Number(b.year) === Number(year));
    }

    return list;
  }

  saveBudget(storeId, categoryId, amount, month, year) {
    if (!storeId) throw new Error('La sucursal es obligatoria.');
    if (!categoryId) throw new Error('La categoría es obligatoria.');
    if (amount === undefined || amount === null || isNaN(amount) || amount < 0) {
      throw new Error('El monto del presupuesto debe ser un número mayor o igual a cero.');
    }
    if (!month || !year) throw new Error('El mes y año son obligatorios.');

    const budgets = storageRepository.getExpenseBudgets();
    const index = budgets.findIndex(b => 
      b.storeId === storeId &&
      b.categoryId === categoryId &&
      Number(b.month) === Number(month) &&
      Number(b.year) === Number(year)
    );

    if (index >= 0) {
      budgets[index].amount = Number(amount);
    } else {
      budgets.push({
        id: `budg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        storeId,
        categoryId,
        amount: Number(amount),
        month: Number(month),
        year: Number(year)
      });
    }

    storageRepository.saveExpenseBudgets(budgets);
    storageRepository.syncWithCloud();
    return true;
  }

  /**
   * Compara los gastos reales registrados contra el presupuesto planeado
   * para una sede, mes y año específicos.
   */
  getBudgetComparison(storeId, month, year) {
    if (!storeId) return { breakdown: [], totalBudget: 0, totalActual: 0, totalRemaining: 0, totalProgress: 0 };
    
    const categories = this.getCategories();
    const expenses = storageRepository.getExpenses();
    const budgets = storageRepository.getExpenseBudgets();

    // Filtrar los gastos para la tienda, el mes y el año especificados
    const targetExpenses = expenses.filter(e => {
      const isStore = storeId === 'all' || e.storeId === storeId;
      if (!isStore) return false;

      const dateObj = new Date(e.date);
      const isMonth = (dateObj.getMonth() + 1) === Number(month);
      const isYear = dateObj.getFullYear() === Number(year);
      
      return isMonth && isYear;
    });

    // Calcular el desglose
    let totalBudget = 0;
    let totalActual = 0;

    const breakdown = categories.map(cat => {
      // Sumar presupuestos. Si es consolidado (storeId === 'all'), sumamos los de todas las tiendas.
      let budgetAmount = 0;
      if (storeId === 'all') {
        const matchingBudgets = budgets.filter(b => b.categoryId === cat.id && Number(b.month) === Number(month) && Number(b.year) === Number(year));
        budgetAmount = matchingBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      } else {
        const budgetObj = budgets.find(b => b.storeId === storeId && b.categoryId === cat.id && Number(b.month) === Number(month) && Number(b.year) === Number(year));
        budgetAmount = budgetObj ? (Number(budgetObj.amount) || 0) : 0;
      }

      // Sumar gastos reales
      const catExpenses = targetExpenses.filter(e => e.categoryId === cat.id);
      const actualAmount = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      totalBudget += budgetAmount;
      totalActual += actualAmount;

      const remaining = budgetAmount - actualAmount;
      const progress = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

      return {
        category: cat,
        budget: budgetAmount,
        actual: actualAmount,
        remaining,
        progress
      };
    });

    const totalRemaining = totalBudget - totalActual;
    const totalProgress = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      breakdown,
      totalBudget,
      totalActual,
      totalRemaining,
      totalProgress
    };
  }
}

export const expensesService = new ExpensesService();
