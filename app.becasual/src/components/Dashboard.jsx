import React, { useState, useEffect } from 'react';
import { salesService } from '../services/SalesService';
import { inventoryService } from '../services/InventoryService';

export default function Dashboard({ triggerUpdate }) {
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

  useEffect(() => {
    // Load financial stats
    const financialStats = salesService.getFinancialStats();
    setStats(financialStats);

    // Load low stock alerts
    const alerts = inventoryService.getLowStockAlerts();
    setLowStock(alerts.slice(0, 5)); // show top 5

    // Load recent sales
    const sales = salesService.getAll();
    setRecentSales(sales.slice(0, 5)); // show top 5
  }, [triggerUpdate]);

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
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</td>
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
                      <td>{s.clientName}</td>
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
    </div>
  );
}
