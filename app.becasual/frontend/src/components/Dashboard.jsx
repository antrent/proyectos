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
  const [topLimit, setTopLimit] = useState(5);
  const [topPage, setTopPage] = useState(1);
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

  // Recalcular productos más vendidos cuando cambien las fechas o el límite
  useEffect(() => {
    const list = salesService.getTopSellingProducts(startDate, endDate, currentStoreId, topLimit);
    setTopProducts(list);
    setTopPage(1);
  }, [startDate, endDate, currentStoreId, topLimit, triggerUpdate]);

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

  const TOP_ITEMS_PER_PAGE = 5;
  const totalTopPages = Math.ceil(topProducts.length / TOP_ITEMS_PER_PAGE);
  const paginatedTopProducts = topProducts.slice((topPage - 1) * TOP_ITEMS_PER_PAGE, topPage * TOP_ITEMS_PER_PAGE);

  const handlePrintTopReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, habilita las ventanas emergentes (popups) en tu navegador para poder ver e imprimir el reporte.");
      return;
    }

    const storeName = currentStoreId === 'all' 
      ? 'Todas las Sedes (Consolidado)' 
      : (stores.find(s => s.id === currentStoreId)?.name || 'Sede Principal');
    
    const rowsHtml = topProducts.map((p, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center; color: #64748b;">#${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${p.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${p.sku}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #475569;">${p.barcode}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #059669;">${p.quantity} uds</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #2563eb; font-size: 14px;">${formatCOP(p.totalRevenue)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Productos Más Vendidos - BeCasual</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; }
            h1 { font-size: 26px; color: #0f172a; margin: 0 0 5px; font-weight: 800; letter-spacing: -0.5px; }
            .subtitle { font-size: 14px; color: #64748b; margin-bottom: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 35px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-item { font-size: 13.5px; color: #334155; }
            .info-item strong { color: #0f172a; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0f172a; color: white; padding: 12px 10px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            td { font-size: 13.5px; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              button { display: none; }
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <h1>🔥 Reporte de Productos Más Vendidos</h1>
              <div class="subtitle">Análisis de rotación e ingresos generados para el almacén</div>
            </div>
            <button onclick="window.print()" style="padding: 10px 22px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">🖨️ Imprimir Reporte</button>
          </div>
          
          <div class="info-grid">
            <div class="info-item"><strong>Sucursal/Sede:</strong> ${storeName}</div>
            <div class="info-item"><strong>Rango de Fechas:</strong> ${startDate} hasta ${endDate}</div>
            <div class="info-item"><strong>Productos en Reporte:</strong> Top ${topLimit === 99999 ? 'Completo' : topLimit} (${topProducts.length} listados)</div>
            <div class="info-item"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Pos</th>
                <th>Prenda / Producto</th>
                <th>SKU</th>
                <th>Código de Barras</th>
                <th style="text-align: center; width: 140px;">Cantidad Vendida</th>
                <th style="text-align: right; width: 160px;">Total Ingresos</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #94a3b8; font-weight: 500;">No hay registros de ventas en este período.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            BeCasual Store Manager v1.9.0 — Reporte Generado de forma Automática
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    // Trigger printing from the parent context after content loads
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
            <h3 className="card-title">🔥 Top {topLimit === 99999 ? 'Todos los' : topLimit} Productos Más Vendidos</h3>
            <span className="card-subtitle">Prendas con mayor rotación e ingresos generados</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CANTIDAD TOP</label>
              <select 
                value={topLimit} 
                onChange={(e) => setTopLimit(Number(e.target.value))} 
                className="input-premium" 
                style={{ padding: '6px 12px', fontSize: '13px', height: '31px', minWidth: '95px' }}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={99999}>Todos</option>
              </select>
            </div>
            <button
              onClick={handlePrintTopReport}
              className="btn btn-primary"
              style={{ height: '31px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '0 12px' }}
              title="Generar Impresión del Reporte de Tops"
            >
              🖨️ Imprimir
            </button>
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
                paginatedTopProducts.map((p, idx) => {
                  const absoluteIndex = (topPage - 1) * TOP_ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr key={p.productId}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        <span style={{ marginRight: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>#{absoluteIndex}</span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalTopPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-body)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Mostrando página <strong>{topPage}</strong> de <strong>{totalTopPages}</strong> ({topProducts.length} productos filtrados)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setTopPage(p => Math.max(p - 1, 1))}
                disabled={topPage === 1}
              >
                ◀ Anterior
              </button>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={() => setTopPage(p => Math.min(p + 1, totalTopPages))}
                disabled={topPage === totalTopPages}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
