import React, { useState, useEffect } from 'react';
import { expensesService } from '../services/ExpensesService';
import { storageRepository } from '../services/StorageRepository';

export default function Expenses({ user, currentStoreId, triggerUpdate, onDataChange }) {
  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' | 'budget' | 'categories'

  // --- Expenses Tab States ---
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  
  // Date range defaults to current month
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Form fields for expense
  const [expDate, setExpDate] = useState('');
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expRef, setExpRef] = useState('');
  const [expPayment, setExpPayment] = useState('Efectivo');
  const [formError, setFormError] = useState('');

  // --- Budget Tab States ---
  const [budgetMonth, setBudgetMonth] = useState(() => new Date().getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState(() => new Date().getFullYear());
  const [budgetComparison, setBudgetComparison] = useState({ breakdown: [], totalBudget: 0, totalActual: 0, totalRemaining: 0, totalProgress: 0 });
  const [editedBudgets, setEditedBudgets] = useState({}); // categoryId -> amount
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);

  // --- Categories Tab States ---
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // Loaded once & on sync updates
  useEffect(() => {
    loadCategories();
    loadExpenses();
  }, [currentStoreId, triggerUpdate]);

  // Load budgets comparison when budget tabs filter changes
  useEffect(() => {
    loadBudgetComparison();
  }, [currentStoreId, budgetMonth, budgetYear, expenses, categories]);

  // Listen to background syncs to auto-refresh UI
  useEffect(() => {
    const handleSyncComplete = () => {
      loadCategories();
      loadExpenses();
    };
    window.addEventListener('becasual_db_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('becasual_db_sync_complete', handleSyncComplete);
  }, []);

  const loadCategories = () => {
    const list = expensesService.getCategories();
    setCategories(list);
  };

  const loadExpenses = () => {
    const list = expensesService.getExpenses(currentStoreId, {
      categoryId: filterCategory || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      query: filterQuery || undefined
    });
    
    // Additional payment method filter (since it's evaluated client side in UI)
    let filtered = list;
    if (filterPayment) {
      filtered = list.filter(e => e.paymentMethod === filterPayment);
    }
    setExpenses(list);
    setFilteredExpenses(filtered);
  };

  // Re-run filter application locally when query or selections change
  useEffect(() => {
    loadExpenses();
  }, [filterCategory, filterPayment, filterQuery, startDate, endDate]);

  const loadBudgetComparison = () => {
    if (currentStoreId) {
      const comp = expensesService.getBudgetComparison(currentStoreId, budgetMonth, budgetYear);
      setBudgetComparison(comp);
      
      // Initialize edit budgets map
      const initialBudgets = {};
      comp.breakdown.forEach(item => {
        initialBudgets[item.category.id] = item.budget;
      });
      setEditedBudgets(initialBudgets);
    }
  };

  // --- Helper Helpers ---
  const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const paymentMethods = storageRepository.getPaymentMethods() || ['Efectivo', 'Nequi', 'Daviplata', 'SisteCredito', 'Addi', 'Bold'];

  // --- EXPENSE HANDLERS ---
  const handleOpenExpenseModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpDate(expense.date ? expense.date.split('T')[0] : '');
      setExpCategoryId(expense.categoryId);
      setExpDescription(expense.description);
      setExpAmount(expense.amount);
      setExpRef(expense.referenceNumber || '');
      setExpPayment(expense.paymentMethod);
    } else {
      setEditingExpense(null);
      setExpDate(new Date().toISOString().split('T')[0]);
      setExpCategoryId(categories[0]?.id || '');
      setExpDescription('');
      setExpAmount('');
      setExpRef('');
      setExpPayment('Efectivo');
    }
    setFormError('');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    setFormError('');

    if (!expCategoryId) return setFormError('La categoría es obligatoria.');
    if (!expDescription || expDescription.trim() === '') return setFormError('La descripción es obligatoria.');
    if (!expAmount || Number(expAmount) <= 0) return setFormError('El monto debe ser un valor positivo.');

    try {
      if (editingExpense) {
        expensesService.updateExpense(editingExpense.id, {
          categoryId: expCategoryId,
          description: expDescription,
          amount: expAmount,
          date: expDate,
          referenceNumber: expRef,
          paymentMethod: expPayment
        });
      } else {
        expensesService.addExpense({
          storeId: currentStoreId === 'all' ? 'store_1' : currentStoreId,
          categoryId: expCategoryId,
          description: expDescription,
          amount: expAmount,
          date: expDate,
          referenceNumber: expRef,
          paymentMethod: expPayment
        });
      }
      setExpenseModalOpen(false);
      onDataChange();
      loadExpenses();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este registro de gasto?')) {
      try {
        expensesService.deleteExpense(id);
        onDataChange();
        loadExpenses();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // --- BUDGET HANDLERS ---
  const handleBudgetChange = (catId, val) => {
    setEditedBudgets(prev => ({
      ...prev,
      [catId]: val === '' ? '' : Number(val)
    }));
  };

  const handleSaveBudgets = () => {
    if (currentStoreId === 'all') {
      alert('Por favor selecciona una sede específica para planificar presupuestos.');
      return;
    }

    try {
      Object.entries(editedBudgets).forEach(([catId, amount]) => {
        expensesService.saveBudget(currentStoreId, catId, Number(amount) || 0, budgetMonth, budgetYear);
      });
      setIsEditingBudgets(false);
      onDataChange();
      loadBudgetComparison();
      alert('Presupuestos actualizados de forma exitosa.');
    } catch (err) {
      alert(`Error al guardar presupuestos: ${err.message}`);
    }
  };

  // --- CATEGORY HANDLERS ---
  const handleOpenCatModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatDesc(category.description || '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
    }
    setCatError('');
    setCatModalOpen(true);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    setCatError('');

    if (!catName || catName.trim() === '') {
      return setCatError('El nombre de la categoría es obligatorio.');
    }

    try {
      if (editingCategory) {
        expensesService.updateCategory(editingCategory.id, {
          name: catName,
          description: catDesc
        });
      } else {
        expensesService.addCategory({
          name: catName,
          description: catDesc
        });
      }
      setCatModalOpen(false);
      onDataChange();
      loadCategories();
    } catch (err) {
      setCatError(err.message);
    }
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta categoría de gastos?')) {
      try {
        expensesService.deleteCategory(id);
        onDataChange();
        loadCategories();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // --- Calc Statistics for KPIs ---
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = filteredExpenses.length;
  const averageExpense = expenseCount > 0 ? totalAmount / expenseCount : 0;
  const maxExpense = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(e => e.amount)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Sub-tab Selection Header */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border-color)',
        gap: '8px',
        paddingBottom: '2px'
      }}>
        <button
          className={`btn ${activeSubTab === 'expenses' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveSubTab('expenses')}
        >
          📋 Historial de Gastos
        </button>
        <button
          className={`btn ${activeSubTab === 'budget' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveSubTab('budget')}
        >
          📊 Presupuesto Mensual
        </button>
        <button
          className={`btn ${activeSubTab === 'categories' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveSubTab('categories')}
        >
          ⚙️ Tipologías / Categorías
        </button>
      </div>

      {/* ========================================================== */}
      {/* SUBTAB 1: EXPENSES HISTORY */}
      {/* ========================================================== */}
      {activeSubTab === 'expenses' && (
        <>
          {/* Statistics Cards */}
          <div className="grid-stats">
            <div className="card-stat red">
              <div className="stat-info">
                <span className="stat-label">Total Gastos Operativos</span>
                <span className="stat-value">{formatCOP(totalAmount)}</span>
                <span className="stat-desc">{expenseCount} registros en el período</span>
              </div>
              <div className="stat-icon">💸</div>
            </div>

            <div className="card-stat">
              <div className="stat-info">
                <span className="stat-label">Promedio de Gasto</span>
                <span className="stat-value">{formatCOP(averageExpense)}</span>
                <span className="stat-desc">Por cada registro realizado</span>
              </div>
              <div className="stat-icon">📊</div>
            </div>

            <div className="card-stat gold">
              <div className="stat-info">
                <span className="stat-label">Mayor Gasto Registrado</span>
                <span className="stat-value">{formatCOP(maxExpense)}</span>
                <span className="stat-desc">Egreso de valor máximo</span>
              </div>
              <div className="stat-icon">🔝</div>
            </div>

            <div className="card-stat green">
              <div className="stat-info">
                <span className="stat-label">Categorías Activas</span>
                <span className="stat-value">{categories.length}</span>
                <span className="stat-desc">Tipologías de gasto registradas</span>
              </div>
              <div className="stat-icon">⚙️</div>
            </div>
          </div>

          {/* Filtering Bar & Actions */}
          <div className="card-table-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                🔍 Filtros del Periodo
              </h3>
              <button 
                className="btn btn-primary" 
                onClick={() => handleOpenExpenseModal()}
                disabled={currentStoreId === 'all'}
                title={currentStoreId === 'all' ? 'Selecciona una sede específica para registrar gastos' : ''}
              >
                ➕ Registrar Gasto
              </button>
            </div>
            
            <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', width: '100%' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  DESDE
                </label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="form-control" 
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  HASTA
                </label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="form-control" 
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  CATEGORÍA
                </label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)} 
                  className="form-control"
                >
                  <option value="">Todas las Categorías</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  MÉTODO DE PAGO
                </label>
                <select 
                  value={filterPayment} 
                  onChange={(e) => setFilterPayment(e.target.value)} 
                  className="form-control"
                >
                  <option value="">Todos los Métodos</option>
                  {paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  BUSCADOR
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Papel, Recibo..." 
                  value={filterQuery} 
                  onChange={(e) => setFilterQuery(e.target.value)} 
                  className="form-control" 
                />
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="card-table-wrapper">
            <div className="card-header">
              <div>
                <h3 className="card-title">📖 Listado de Egresos</h3>
                <span className="card-subtitle">Historial ordenado cronológicamente</span>
              </div>
              <span className="badge secondary">{filteredExpenses.length} egresos</span>
            </div>
            
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Referencia</th>
                    <th>Método Pago</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    {currentStoreId !== 'all' && <th style={{ textAlign: 'center' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={currentStoreId !== 'all' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                        No se encontraron registros de gastos para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: '600' }}>
                          {new Date(e.date).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          {currentStoreId === 'all' && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              🏬 {e.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge secondary" style={{ fontWeight: '700' }}>
                            {e.category?.name || 'Desconocido'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.description}>
                          {e.description}
                        </td>
                        <td>
                          {e.referenceNumber ? <code>{e.referenceNumber}</code> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                        <td>
                          <span className="badge success" style={{
                            background: 'hsla(39, 65%, 48%, 0.08)',
                            color: 'var(--secondary)',
                            border: '1px solid hsla(39, 65%, 48%, 0.15)'
                          }}>
                            💵 {e.paymentMethod}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--danger)', fontSize: '14px' }}>
                          {formatCOP(e.amount)}
                        </td>
                        {currentStoreId !== 'all' && (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => handleOpenExpenseModal(e)}
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn btn-danger btn-sm" 
                                style={{ padding: '4px 8px', fontSize: '12px', background: 'hsla(4, 70%, 48%, 0.1)', color: 'var(--danger)', border: '1px solid hsla(4, 70%, 48%, 0.2)' }}
                                onClick={() => handleDeleteExpense(e.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================== */}
      {/* SUBTAB 2: MONTHLY BUDGET PLANNING */}
      {/* ========================================================== */}
      {activeSubTab === 'budget' && (
        <>
          {/* Month/Year selectors and Budgets KPIs */}
          <div className="card-table-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                📅 Período de Planeación
              </h3>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select 
                  className="form-control" 
                  style={{ width: '130px', height: '38px', padding: '6px 12px' }}
                  value={budgetMonth} 
                  onChange={(e) => setBudgetMonth(Number(e.target.value))}
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>

                <select 
                  className="form-control" 
                  style={{ width: '100px', height: '38px', padding: '6px 12px' }}
                  value={budgetYear} 
                  onChange={(e) => setBudgetYear(Number(e.target.value))}
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Consolidado warning alert */}
            {currentStoreId === 'all' && (
              <div style={{
                background: 'hsla(39, 65%, 48%, 0.1)',
                color: 'var(--secondary)',
                border: '1px solid hsla(39, 65%, 48%, 0.2)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                ℹ️ Estás visualizando el consolidado de presupuestos de todas las sedes. Para planificar o modificar presupuestos, selecciona una sede específica arriba.
              </div>
            )}
          </div>

          <div className="grid-stats">
            <div className="card-stat">
              <div className="stat-info">
                <span className="stat-label">Presupuesto Planeado</span>
                <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{formatCOP(budgetComparison.totalBudget)}</span>
                <span className="stat-desc">Asignado para el mes</span>
              </div>
              <div className="stat-icon">📋</div>
            </div>

            <div className="card-stat red">
              <div className="stat-info">
                <span className="stat-label">Gasto Real Registrado</span>
                <span className="stat-value" style={{ color: 'var(--danger)' }}>{formatCOP(budgetComparison.totalActual)}</span>
                <span className="stat-desc">Egresos efectivos realizados</span>
              </div>
              <div className="stat-icon">💸</div>
            </div>

            <div className="card-stat green">
              <div className="stat-info">
                <span className="stat-label">Cupo Disponible</span>
                <span className="stat-value" style={{ color: budgetComparison.totalRemaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatCOP(budgetComparison.totalRemaining)}
                </span>
                <span className="stat-desc">Diferencia presupuesto - gasto</span>
              </div>
              <div className="stat-icon">⚖️</div>
            </div>

            <div className="card-stat gold">
              <div className="stat-info">
                <span className="stat-label">Ejecución del Presupuesto</span>
                <span className="stat-value" style={{ color: budgetComparison.totalProgress > 100 ? 'var(--danger)' : budgetComparison.totalProgress > 85 ? 'var(--secondary)' : 'var(--success)' }}>
                  {budgetComparison.totalProgress.toFixed(1)}%
                </span>
                <span className="stat-desc">Porcentaje consumido</span>
              </div>
              <div className="stat-icon">📈</div>
            </div>
          </div>

          {/* Budget Planning Grid */}
          <div className="card-table-wrapper">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">📊 Planificación de Presupuesto por Categoría</h3>
                <span className="card-subtitle">Asignación de cupo mensual y progreso de consumo</span>
              </div>
              
              {currentStoreId !== 'all' && (
                isEditingBudgets ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={() => { setIsEditingBudgets(false); loadBudgetComparison(); }}>
                      Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveBudgets}>
                      💾 Guardar Cambios
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setIsEditingBudgets(true)}>
                    ✏️ Editar Presupuestos
                  </button>
                )
              )}
            </div>

            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Categoría / Tipo de Gasto</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Presupuesto Planeado</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Gasto Real</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Disponible</th>
                    <th style={{ width: '25%' }}>Consumo / Ejecución</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetComparison.breakdown.map(item => {
                    const isExceeded = item.actual > item.budget;
                    const isAlert = item.budget > 0 && (item.actual / item.budget) >= 0.85;
                    const remainingColor = item.remaining >= 0 ? 'var(--success)' : 'var(--danger)';
                    
                    // Progress Bar Color Mapping
                    let barColor = 'var(--success)';
                    if (isExceeded) barColor = 'var(--danger)';
                    else if (isAlert) barColor = 'var(--secondary)';

                    return (
                      <tr key={item.category.id}>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.category.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.category.description || 'Sin descripción'}</div>
                        </td>
                        
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>
                          {isEditingBudgets ? (
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '140px', display: 'inline-block', textAlign: 'right', padding: '6px 10px', height: '32px' }}
                              value={editedBudgets[item.category.id] !== undefined ? editedBudgets[item.category.id] : ''}
                              onChange={(e) => handleBudgetChange(item.category.id, e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                          ) : (
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{formatCOP(item.budget)}</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--danger)' }}>
                          {formatCOP(item.actual)}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: '800', color: remainingColor }}>
                          {formatCOP(item.remaining)}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                              <span style={{ color: barColor }}>{item.progress.toFixed(0)}% Consumido</span>
                              {item.budget > 0 && <span>de {formatCOP(item.budget)}</span>}
                            </div>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              backgroundColor: 'var(--border-color)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${Math.min(100, item.progress)}%`,
                                height: '100%',
                                backgroundColor: barColor,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================== */}
      {/* SUBTAB 3: EXPENSE CATEGORIES CONFIG */}
      {/* ========================================================== */}
      {activeSubTab === 'categories' && (
        <div className="card-table-wrapper">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">⚙️ Configuración de Categorías de Gastos</h3>
              <span className="card-subtitle">Administra los diferentes tipos y conceptos de egresos del almacén</span>
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenCatModal()}>
              ➕ Nueva Categoría
            </button>
          </div>

          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Nombre de la Categoría</th>
                  <th style={{ width: '50%' }}>Descripción</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No se registran categorías creadas.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => {
                    // Check if system default category (prevent deletion of basic ones to maintain integrity)
                    const isSystem = ['cat_1', 'cat_2', 'cat_3', 'cat_4', 'cat_5', 'cat_6', 'cat_7', 'cat_8', 'cat_9'].includes(cat.id);

                    return (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{cat.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{cat.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción</span>}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button 
                              className="btn btn-outline btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleOpenCatModal(cat)}
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '12px', background: 'hsla(4, 70%, 48%, 0.1)', color: 'var(--danger)', border: '1px solid hsla(4, 70%, 48%, 0.2)' }}
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={isSystem}
                              title={isSystem ? 'Las categorías del sistema no pueden ser eliminadas.' : ''}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* EXPENSE REGISTRATION / EDIT MODAL */}
      {/* ========================================================== */}
      {expenseModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingExpense ? '✏️ Editar Registro de Gasto' : '💸 Registrar Gasto Operativo'}
              </h3>
              <button className="modal-close" onClick={() => setExpenseModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {formError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--danger-glow)',
                    color: 'var(--danger)',
                    border: '1px solid hsla(4, 70%, 48%, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Fecha del Egreso *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Categoría de Gasto *
                  </label>
                  <select
                    className="form-control"
                    value={expCategoryId}
                    onChange={(e) => setExpCategoryId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Seleccione una categoría...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Descripción *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Pago recibo energía junio 2026"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Monto (COP) *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Monto"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Método de Pago *
                    </label>
                    <select
                      className="form-control"
                      value={expPayment}
                      onChange={(e) => setExpPayment(e.target.value)}
                      required
                    >
                      {paymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Número de Referencia / Soporte (Opcional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Recibo de caja, N° Factura..."
                    value={expRef}
                    onChange={(e) => setExpRef(e.target.value)}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setExpenseModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CATEGORY CREATION / EDIT MODAL */}
      {/* ========================================================== */}
      {catModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '450px', width: '90%', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? '✏️ Editar Categoría' : '⚙️ Crear Categoría de Gasto'}
              </h3>
              <button className="modal-close" onClick={() => setCatModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveCategory}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {catError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--danger-glow)',
                    color: 'var(--danger)',
                    border: '1px solid hsla(4, 70%, 48%, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    ⚠️ {catError}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Papelería, Seguridad, etc."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Descripción / Detalles (Opcional)
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Escribe detalles del concepto de este egreso..."
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setCatModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
