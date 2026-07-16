import express from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  removeExpense,
  bulkSyncExpenses,
  getCategories,
  createCategory,
  updateCategory,
  removeCategory,
  bulkSyncCategories,
  getBudgets,
  saveBudget,
  bulkSyncBudgets
} from '../controllers/expensesController.js';

const router = express.Router();

// Expenses CRUD & Sync
router.get('/', getExpenses);
router.post('/bulk', bulkSyncExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', removeExpense);

// Expense Categories CRUD & Sync
router.get('/categories', getCategories);
router.post('/categories/bulk', bulkSyncCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', removeCategory);

// Expense Budgets & Sync
router.get('/budgets', getBudgets);
router.post('/budgets/bulk', bulkSyncBudgets);
router.post('/budgets', saveBudget);

export default router;
