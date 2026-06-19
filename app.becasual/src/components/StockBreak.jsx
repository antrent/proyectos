import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/InventoryService';

export default function StockBreak({ onGoToPurchases }) {
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('critical'); // 'critical' | 'broken' | 'projections' | 'byProvider'
  const [minStockFilter, setMinStockFilter] = useState('');

  useEffect(() => {
    const data = inventoryService.getStockBreakAnalysis();
    setAnalysis(data);
  }, []);

  const formatCOP = (amount) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);

  if (!analysis) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando análisis...</div>;

  const getStockBar = (stock, minStock) => {
    if (minStock === 0) return 100;
    const pct = Math.min((stock / (minStock * 3)) * 100, 100);
    return pct;
  };

  const getStockColor = (stock, minStock) => {
    if (stock === 0) return 'var(--danger)';
    if (stock <= minStock) return 'var(--warning)';
    return 'var(--success)';
  };

  const filterByName = (list) => {
    if (!minStockFilter.trim()) return list;
    const q = minStockFilter.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q));
  };

  const tabs = [
    { id: 'critical', label: '⚠️ Stock Crítico', count: analysis.criticalCount, color: 'var(--warning)' },
    { id: 'broken', label: '🔴 Agotados', count: analysis.brokenCount, color: 'var(--danger)' },
    { id: 'projections', label: '📋 Plan de Reposición', count: analysis.projections.length, color: 'var(--primary)' },
    { id: 'byProvider', label: '🏭 Por Proveedor', count: analysis.providerProjections.length, color: 'var(--secondary)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* KPI Summary */}
      <div className="grid-stats">
        <div className="card-stat red">
          <div className="stat-info">
            <span className="stat-label">Productos Agotados</span>
            <span className="stat-value">{analysis.brokenCount}</span>
            <span className="stat-desc">Stock = 0 unidades</span>
          </div>
          <div className="stat-icon">🔴</div>
        </div>
        <div className="card-stat gold">
          <div className="stat-info">
            <span className="stat-label">Stock Crítico</span>
            <span className="stat-value">{analysis.criticalCount}</span>
            <span className="stat-desc">Por debajo del mínimo</span>
          </div>
          <div className="stat-icon">⚠️</div>
        </div>
        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Inversión Recomendada</span>
            <span className="stat-value" style={{ fontSize: '20px' }}>
              {formatCOP(analysis.projections.reduce((s, p) => s + p.estimatedCost, 0))}
            </span>
            <span className="stat-desc">Para reponer inventario crítico</span>
          </div>
          <div className="stat-icon">💰</div>
        </div>
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Proveedores Involucrados</span>
            <span className="stat-value">{analysis.providerProjections.length}</span>
            <span className="stat-desc">Requieren reorden</span>
          </div>
          <div className="stat-icon">🏭</div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ position: 'relative' }}
          >
            {tab.label}
            <span style={{
              marginLeft: '6px',
              background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : tab.color,
              color: activeTab === tab.id ? 'white' : 'white',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Shared search */}
      <input
        type="text"
        className="form-control"
        placeholder="🔍 Filtrar por nombre de producto o proveedor..."
        value={minStockFilter}
        onChange={e => setMinStockFilter(e.target.value)}
      />

      {/* TAB: Critical */}
      {activeTab === 'critical' && (
        <div className="card-table-wrapper">
          <div className="card-header">
            <div>
              <h3 className="card-title">⚠️ Productos con Stock Crítico</h3>
              <span className="card-subtitle">Stock por debajo del mínimo configurado — requieren reposición urgente</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Proveedor</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                  <th>Nivel de Stock</th>
                  <th>Precio Costo</th>
                </tr>
              </thead>
              <tbody>
                {filterByName(analysis.criticalProducts).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {analysis.criticalCount === 0 ? '✅ ¡No hay productos en stock crítico!' : 'Sin resultados para el filtro.'}
                  </td></tr>
                ) : (
                  filterByName(analysis.criticalProducts).map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{p.provider}</td>
                      <td><span className="badge warning">{p.stock} uds</span></td>
                      <td>{p.minStock} uds</td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${getStockBar(p.stock, p.minStock)}%`,
                            background: getStockColor(p.stock, p.minStock),
                            borderRadius: '4px'
                          }} />
                        </div>
                      </td>
                      <td>{formatCOP(p.costPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Broken/Out of stock */}
      {activeTab === 'broken' && (
        <div className="card-table-wrapper">
          <div className="card-header">
            <div>
              <h3 className="card-title">🔴 Productos Agotados (Quiebres)</h3>
              <span className="card-subtitle">Stock = 0 — ventas bloqueadas para estos productos</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Precio Venta</th>
                  <th>Precio Costo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filterByName(analysis.brokenProducts).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {analysis.brokenCount === 0 ? '✅ ¡No hay quiebres de inventario!' : 'Sin resultados para el filtro.'}
                  </td></tr>
                ) : (
                  filterByName(analysis.brokenProducts).map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talla {p.size} | {p.color} | {p.barcode}</div>
                      </td>
                      <td>{p.category} / {p.line}</td>
                      <td>{p.provider}</td>
                      <td style={{ fontWeight: 700 }}>{formatCOP(p.sellPrice)}</td>
                      <td>{formatCOP(p.costPrice)}</td>
                      <td><span className="badge danger">🔴 AGOTADO</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Projections */}
      {activeTab === 'projections' && (
        <div className="card-table-wrapper">
          <div className="card-header">
            <div>
              <h3 className="card-title">📋 Plan de Reposición de Inventario</h3>
              <span className="card-subtitle">Cantidades y costos sugeridos para restablecer niveles óptimos</span>
            </div>
            {onGoToPurchases && (
              <button className="btn btn-primary" onClick={onGoToPurchases}>
                ➕ Ir a Registrar Compra
              </button>
            )}
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Proveedor</th>
                  <th>Stock Actual</th>
                  <th>Cantidad Sugerida</th>
                  <th>Costo Unit.</th>
                  <th>Inversión Estimada</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filterByName(analysis.projections.map(p => ({ ...p.product, ...p, product: p.product }))).length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Sin resultados.
                  </td></tr>
                ) : (
                  analysis.projections
                    .filter(proj => {
                      if (!minStockFilter.trim()) return true;
                      const q = minStockFilter.toLowerCase();
                      return proj.product.name.toLowerCase().includes(q) || proj.provider.toLowerCase().includes(q);
                    })
                    .map(proj => (
                      <tr key={proj.product.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{proj.product.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talla {proj.product.size} | {proj.product.color}</div>
                        </td>
                        <td>{proj.provider}</td>
                        <td><span className={`badge ${proj.stock === 0 ? 'danger' : 'warning'}`}>{proj.stock} uds</span></td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)' }}>
                            {proj.suggestedQuantity} uds
                          </span>
                        </td>
                        <td>{formatCOP(proj.product.costPrice)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{formatCOP(proj.estimatedCost)}</td>
                        <td>
                          {proj.stock === 0
                            ? <span className="badge danger">🔴 Quiebre</span>
                            : <span className="badge warning">⚠️ Crítico</span>}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: By Provider */}
      {activeTab === 'byProvider' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {analysis.providerProjections
            .filter(pp => !minStockFilter.trim() || pp.providerName.toLowerCase().includes(minStockFilter.toLowerCase()))
            .map(pp => (
              <div key={pp.providerName} className="card-table-wrapper">
                <div className="card-header">
                  <div>
                    <h4 className="card-title">🏭 {pp.providerName}</h4>
                    <span className="card-subtitle">
                      {pp.itemCount} referencias — {pp.totalQuantity} uds totales
                    </span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--secondary)' }}>
                    {formatCOP(pp.totalInvestment)}
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table-premium" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr><th>Producto</th><th>Stock</th><th>Sugerido</th><th>Inversión</th></tr>
                    </thead>
                    <tbody>
                      {pp.items.map(item => (
                        <tr key={item.product.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>T.{item.product.size} | {item.product.color}</div>
                          </td>
                          <td><span className={`badge ${item.stock === 0 ? 'danger' : 'warning'}`}>{item.stock}</span></td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.suggestedQuantity} uds</td>
                          <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{formatCOP(item.estimatedCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          {analysis.providerProjections.length === 0 && (
            <div className="card-table-wrapper" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✅ No hay quiebres por proveedor actualmente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
