import React, { useState, useEffect } from 'react';
import { salesService } from '../services/SalesService';
import { inventoryService } from '../services/InventoryService';
import { expensesService } from '../services/ExpensesService';

export default function Dashboard({ triggerUpdate, currentStoreId }) {
  const [stats, setStats] = useState({
    totalSalesRevenue: 0,
    totalSalesProfit: 0,
    totalPurchasesCost: 0,
    totalInventoryValueCost: 0,
    totalInventoryValueSell: 0,
    salesCount: 0,
    purchasesCount: 0
  });

  const [lowStock, setLowStock] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState({ totalBudget: 0, totalActual: 0, totalRemaining: 0, totalProgress: 0 });

  // Inicializar rango de fechas (desde hace 30 días hasta hoy)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    // Load financial stats for the active store
    const financialStats = salesService.getFinancialStats(currentStoreId);
    setStats(financialStats);

    // Load low stock alerts for the active store
    const alerts = inventoryService.getLowStockAlerts(currentStoreId);
    setLowStock(alerts.slice(0, 5)); // show top 5

    // Load recent sales for the active store
    const sales = salesService.getAll(currentStoreId);
    setRecentSales(sales.slice(0, 5)); // show top 5

    // Check if user is admin to show expenses budget comparison
    const currentUser = JSON.parse(sessionStorage.getItem('becasual_current_user') || '{}');
    const isAdminUser = currentUser.role === 'admin';
    setIsAdmin(isAdminUser);

    if (isAdminUser) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const comp = expensesService.getBudgetComparison(currentStoreId, currentMonth, currentYear);
      setBudgetInfo(comp);
    }
  }, [triggerUpdate, currentStoreId]);

  // Recalcular productos más vendidos cuando cambien las fechas
  useEffect(() => {
    const list = salesService.getTopSellingProducts(startDate, endDate, currentStoreId, 5);
    setTopProducts(list);
  }, [startDate, endDate, currentStoreId, triggerUpdate]);

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMarginPercentage = () => {
    if (stats.totalSalesRevenue === 0) return '0%';
    const pct = (stats.totalSalesProfit / stats.totalSalesRevenue) * 100;
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* KPI Cards */}
      <div className="grid-stats">
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Total Ventas</span>
            <span className="stat-value">{formatCOP(stats.totalSalesRevenue)}</span>
            <span className="stat-desc">{stats.salesCount} ventas registradas</span>
          </div>
          <div className="stat-icon">💰</div>
        </div>

        <div className="card-stat gold">
          <div className="stat-info">
            <span className="stat-label">Margen Utilidad</span>
            <span className="stat-value">{formatCOP(stats.totalSalesProfit)}</span>
            <span className="stat-desc">{getMarginPercentage()} de margen bruto</span>
          </div>
          <div className="stat-icon">📈</div>
        </div>

        <div className="card-stat red">
          <div className="stat-info">
            <span className="stat-label">Inversión Compras</span>
            <span className="stat-value">{formatCOP(stats.totalPurchasesCost)}</span>
            <span className="stat-desc">{stats.purchasesCount} facturas ingresadas</span>
          </div>
          <div className="stat-icon">💸</div>
        </div>

        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Valor de Inventario</span>
            <span className="stat-value">{formatCOP(stats.totalInventoryValueCost)}</span>
            <span className="stat-desc">A precio de costo ({formatCOP(stats.totalInventoryValueSell)} venta)</span>
          </div>
          <div className="stat-icon">📦</div>
        </div>
      </div>

      {/* Administrador: Resumen de Presupuestos y Gastos */}
      {isAdmin && (
        <div className="card-table-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                💸 Presupuesto de Gastos Operativos (Este Mes)
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Comparativa del presupuesto total planeado contra los egresos registrados
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge secondary" style={{ fontSize: '12.5px', padding: '4px 10px' }}>
                Período: {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Presupuestado</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCOP(budgetInfo.totalBudget)}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Gastado Real</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--danger)' }}>{formatCOP(budgetInfo.totalActual)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Disponible</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: budgetInfo.totalRemaining >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCOP(budgetInfo.totalRemaining)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                <span>Progreso de Ejecución</span>
                <span style={{ color: budgetInfo.totalProgress > 100 ? 'var(--danger)' : budgetInfo.totalProgress > 85 ? 'var(--secondary)' : 'var(--success)' }}>
                  {budgetInfo.totalProgress.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, budgetInfo.totalProgress)}%`,
                  height: '100%',
                  backgroundColor: budgetInfo.totalProgress > 100 ? 'var(--danger)' : budgetInfo.totalProgress > 85 ? 'var(--secondary)' : 'var(--success)',
                  borderRadius: '5px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main grids */}
      <div className="grid-2">
        {/* Low Stock Alerts */}
        <div className="card-table-wrapper">
          <div className="card-header">
            <div>
              <h3 className="card-title">⚠️ Alertas de Stock Crítico</h3>
              <span className="card-subtitle">Productos por debajo del stock mínimo</span>
            </div>
            <span className="badge danger">{lowStock.length} productos</span>
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay alertas de stock. ¡Todo al día!
                    </td>
                  </tr>
                ) : (
                  lowStock.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {p.name}
                        {currentStoreId === 'all' && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            🏬 {p.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                          </div>
                        )}
                      </td>
                      <td><code>{p.sku}</code></td>
                      <td>
                        <span className={`badge ${p.stock === 0 ? 'danger' : 'warning'}`}>
                          {p.stock} unidades
                        </span>
                      </td>
                      <td>{p.minStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card-table-wrapper">
          <div className="card-header">
            <div>
              <h3 className="card-title">🧾 Últimas Ventas</h3>
              <span className="card-subtitle">Movimiento de facturación reciente</span>
            </div>
            <span className="badge primary">Reciente</span>
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se han registrado ventas hoy.
                    </td>
                  </tr>
                ) : (
                  recentSales.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}><code>{s.invoiceNumber}</code></td>
                      <td>
                        {s.clientName}
                        {currentStoreId === 'all' && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            🏬 {s.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge secondary">{s.paymentMethod}</span>
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: '700' }}>
                        {formatCOP(s.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Selling Products Block */}
      <div className="card-table-wrapper" style={{ width: '100%' }}>
        <div className="card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">🔥 Top 5 Productos Más Vendidos</h3>
            <span className="card-subtitle">Prendas con mayor rotación e ingresos generados</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>DESDE</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="input-premium" 
                style={{ padding: '6px 12px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>HASTA</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="input-premium" 
                style={{ padding: '6px 12px', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Prenda / Producto</th>
                <th>SKU</th>
                <th>Código de Barras</th>
                <th style={{ textAlign: 'center' }}>Cantidad Vendida</th>
                <th style={{ textAlign: 'right' }}>Total de Ventas</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No se registran ventas para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={p.productId}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      <span style={{ marginRight: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>#{idx + 1}</span>
                      {p.name}
                    </td>
                    <td><code>{p.sku}</code></td>
                    <td><code>{p.barcode}</code></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      <span className="badge success" style={{ fontSize: '13px', padding: '4px 10px' }}>
                        {p.quantity} uds
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: '700', fontSize: '14px' }}>
                      {formatCOP(p.totalRevenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
