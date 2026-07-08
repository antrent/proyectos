import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/InventoryService';
import { CsvHelper } from '../services/CsvHelper';

export default function StockBreak({ onGoToPurchases, currentStoreId }) {
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('critical'); // 'critical' | 'broken' | 'projections' | 'weeklyProjections' | 'byProvider'
  const [minStockFilter, setMinStockFilter] = useState('');
  const [weeklyPeriod, setWeeklyPeriod] = useState(4); // default 4 weeks
  const [weeklyProjections, setWeeklyProjections] = useState([]);
  
  const [weeklyBudget, setWeeklyBudget] = useState(() => Number(localStorage.getItem('becasual_weekly_budget')) || 2000000);
  const [checkedItems, setCheckedItems] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    const data = inventoryService.getStockBreakAnalysis(currentStoreId);
    setAnalysis(data);
    const weeklyData = inventoryService.getWeeklyProjections(currentStoreId, weeklyPeriod);
    setWeeklyProjections(weeklyData);
  }, [currentStoreId, weeklyPeriod]);

  useEffect(() => {
    if (!analysis) return;
    const savedPlan = localStorage.getItem('becasual_weekly_plan');
    if (savedPlan) {
      try {
        const { budget, checked, quantities } = JSON.parse(savedPlan);
        if (budget !== undefined) setWeeklyBudget(budget);
        
        const newChecked = { ...checked };
        const newQuantities = { ...quantities };
        analysis.projections.forEach(proj => {
          if (newChecked[proj.product.id] === undefined) {
            newChecked[proj.product.id] = true;
          }
          if (newQuantities[proj.product.id] === undefined) {
            newQuantities[proj.product.id] = proj.suggestedQuantity;
          }
        });
        
        setCheckedItems(newChecked);
        setSelectedItems(newQuantities);
      } catch (e) {
        console.error("Error loading weekly plan", e);
      }
    } else {
      const initialQuantities = {};
      const initialChecked = {};
      analysis.projections.forEach(proj => {
        initialQuantities[proj.product.id] = proj.suggestedQuantity;
        initialChecked[proj.product.id] = true;
      });
      setSelectedItems(initialQuantities);
      setCheckedItems(initialChecked);
    }
  }, [analysis]);

  const formatCOP = (amount) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);

  // Calculate total cost for the current plan
  const totalPlannedCost = analysis?.projections.reduce((sum, proj) => {
    const isChecked = checkedItems[proj.product.id] ?? false;
    if (!isChecked) return sum;
    const qty = selectedItems[proj.product.id] ?? proj.suggestedQuantity;
    return sum + (qty * (proj.product.costPrice || 0));
  }, 0) || 0;

  const budgetRemaining = weeklyBudget - totalPlannedCost;
  const budgetProgressPercent = weeklyBudget > 0 ? Math.min((totalPlannedCost / weeklyBudget) * 100, 100) : 0;
  const isOverBudget = totalPlannedCost > weeklyBudget;

  const handleSavePlan = () => {
    localStorage.setItem('becasual_weekly_plan', JSON.stringify({
      budget: weeklyBudget,
      checked: checkedItems,
      quantities: selectedItems
    }));
    // Also save budget alone for default loader
    localStorage.setItem('becasual_weekly_budget', weeklyBudget);
    setSaveSuccess('¡Plan semanal de reposición guardado con éxito!');
    setTimeout(() => setSaveSuccess(''), 4000);
  };

  const handleClearPlan = () => {
    setCheckedItems({});
    const resetQuantities = {};
    analysis.projections.forEach(proj => {
      resetQuantities[proj.product.id] = 0;
    });
    setSelectedItems(resetQuantities);
  };

  const handleExportPlanCSV = () => {
    const planItems = analysis.projections
      .filter(proj => checkedItems[proj.product.id])
      .map(proj => {
        const qty = selectedItems[proj.product.id] ?? proj.suggestedQuantity;
        return {
          name: proj.product.name,
          sku: proj.product.sku,
          provider: proj.provider,
          stock: proj.stock,
          priority: proj.stock === 0 ? 'CRÍTICA' : 'ALTA',
          quantity: qty,
          costPrice: proj.product.costPrice,
          totalPrice: qty * proj.product.costPrice
        };
      });

    const columns = [
      { label: 'Producto', key: 'name' },
      { label: 'SKU', key: 'sku' },
      { label: 'Proveedor', key: 'provider' },
      { label: 'Stock Actual', key: 'stock' },
      { label: 'Prioridad', key: 'priority' },
      { label: 'Cantidad a Comprar', key: 'quantity' },
      { label: 'Costo Unitario', key: 'costPrice' },
      { label: 'Costo Total', key: 'totalPrice' }
    ];

    const csvContent = CsvHelper.jsonToCsv(planItems, columns);
    CsvHelper.download(csvContent, 'plan_reposicion_semanal.csv');
  };

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
    { id: 'weeklyProjections', label: '📈 Sugerido Semanal', count: weeklyProjections.filter(p => p.suggestedToBuy > 0).length, color: 'var(--secondary)' },
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
            <span className="stat-label">
              {activeTab === 'weeklyProjections' ? 'Inversión Sugerida (Semanal)' : 'Inversión Recomendada (Mínimo)'}
            </span>
            <span className="stat-value" style={{ fontSize: '20px' }}>
              {activeTab === 'weeklyProjections' 
                ? formatCOP(weeklyProjections.reduce((s, p) => s + p.estimatedCost, 0))
                : formatCOP(analysis.projections.reduce((s, p) => s + p.estimatedCost, 0))}
            </span>
            <span className="stat-desc">
              {activeTab === 'weeklyProjections' 
                ? `Para cubrir demanda de ${weeklyPeriod} semanas`
                : 'Para reponer inventario crítico y agotados'}
            </span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {saveSuccess && <div className="alert alert-success"><span>✅</span><span>{saveSuccess}</span></div>}

          {/* Budget & Expense Control Panel */}
          <div className="grid-2">
            <div className="card-table-wrapper" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>💰 Presupuesto de Compra Semanal</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ flex: 1, fontSize: '18px', fontWeight: 800, padding: '8px 12px' }}
                  value={weeklyBudget}
                  onChange={e => setWeeklyBudget(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Ingresa presupuesto..."
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Establece el tope de gastos estimado para realizar compras de reposición esta semana.
              </span>
            </div>

            <div className="card-table-wrapper" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>📊 Control de Gastos Proyectados</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inversión Planeada</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: isOverBudget ? 'var(--danger)' : 'var(--primary)' }}>
                    {formatCOP(totalPlannedCost)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disponible</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: budgetRemaining < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatCOP(budgetRemaining)}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{
                  height: '100%',
                  width: `${budgetProgressPercent}%`,
                  background: isOverBudget ? 'var(--danger)' : 'var(--success)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              {isOverBudget && (
                <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>
                  ⚠️ ¡Has excedido el presupuesto semanal asignado! Reduzca cantidades o aumente el presupuesto.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Planner Card */}
          <div className="card-table-wrapper">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px' }}>
              <div>
                <h3 className="card-title">📋 Planificador Interactivo Semanal</h3>
                <span className="card-subtitle">Selecciona los productos y ajusta las cantidades a comprar para la semana</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline btn-sm" onClick={handleExportPlanCSV}>📥 Exportar CSV</button>
                <button className="btn btn-outline btn-sm" onClick={handleClearPlan} style={{ color: 'var(--danger)' }}>🗑️ Reiniciar</button>
                <button className="btn btn-primary btn-sm" onClick={handleSavePlan}>💾 Guardar Plan</button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>Incluir</th>
                    <th>Producto</th>
                    <th>Proveedor</th>
                    <th>Stock Actual</th>
                    <th>Prioridad</th>
                    <th style={{ width: '130px' }}>Cant. a Reponer</th>
                    <th>Costo Unit.</th>
                    <th>Costo Proyectado</th>
                  </tr>
                </thead>
                <tbody>
                  {filterByName(analysis.projections.map(p => ({ ...p.product, ...p, product: p.product }))).length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Sin resultados.
                    </td></tr>
                  ) : (
                    analysis.projections
                      .filter(proj => {
                        if (!minStockFilter.trim()) return true;
                        const q = minStockFilter.toLowerCase();
                        return proj.product.name.toLowerCase().includes(q) || proj.provider.toLowerCase().includes(q);
                      })
                      .map(proj => {
                        const pId = proj.product.id;
                        const isChecked = checkedItems[pId] ?? false;
                        const qty = selectedItems[pId] ?? proj.suggestedQuantity;
                        const unitCost = proj.product.costPrice || 0;
                        const totalCost = qty * unitCost;

                        // Priority tag
                        let priorityLabel = 'MEDIA';
                        let priorityBadge = 'secondary';
                        if (proj.stock === 0) {
                          priorityLabel = 'CRÍTICA';
                          priorityBadge = 'danger';
                        } else if (proj.stock <= proj.product.minStock) {
                          priorityLabel = 'ALTA';
                          priorityBadge = 'warning';
                        }

                        return (
                          <tr key={pId} style={{ opacity: isChecked ? 1 : 0.6 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => setCheckedItems(prev => ({ ...prev, [pId]: e.target.checked }))}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{proj.product.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>T. {proj.product.size} | {proj.product.color} | SKU: {proj.product.sku}</div>
                            </td>
                            <td style={{ fontSize: '13px' }}>{proj.provider}</td>
                            <td>
                              <span className={`badge ${proj.stock === 0 ? 'danger' : 'warning'}`}>
                                {proj.stock} uds
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${priorityBadge}`}>{priorityLabel}</span>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: '90px', padding: '4px 8px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}
                                min="0"
                                value={qty}
                                onChange={e => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setSelectedItems(prev => ({ ...prev, [pId]: val }));
                                  if (val > 0 && !isChecked) {
                                    setCheckedItems(prev => ({ ...prev, [pId]: true }));
                                  }
                                }}
                                disabled={!isChecked}
                              />
                            </td>
                            <td>{formatCOP(unitCost)}</td>
                            <td style={{ fontWeight: 700, color: isChecked ? 'var(--secondary)' : 'var(--text-muted)' }}>
                              {formatCOP(totalCost)}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* TAB: Weekly Projections */}
      {activeTab === 'weeklyProjections' && (
        <div className="card-table-wrapper">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="card-title">📈 Sugerido de Compra por Historial Semanal</h3>
              <span className="card-subtitle">Cálculo basado en la velocidad de ventas real de las últimas 8 semanas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Proyectar demanda:</span>
              <select
                className="form-control"
                style={{ width: '155px', height: '36px', padding: '0 8px', fontSize: '13px' }}
                value={weeklyPeriod}
                onChange={e => setWeeklyPeriod(Number(e.target.value))}
              >
                <option value={1}>1 Semana</option>
                <option value={2}>2 Semanas</option>
                <option value={4}>4 Semanas (1 Mes)</option>
                <option value={8}>8 Semanas (2 Meses)</option>
                <option value={12}>12 Semanas (3 Meses)</option>
              </select>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Proveedor</th>
                  <th>Ventas Semanales</th>
                  <th>Stock Actual</th>
                  <th>Demanda Proyectada ({weeklyPeriod} sem)</th>
                  <th>Sugerido a Comprar</th>
                  <th>Costo Unit.</th>
                  <th>Inversión Estimada</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filterByName(weeklyProjections.map(p => ({ ...p.product, ...p, product: p.product }))).length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron proyecciones semanales para los filtros especificados.
                    </td>
                  </tr>
                ) : (
                  weeklyProjections
                    .filter(proj => {
                      if (!minStockFilter.trim()) return true;
                      const q = minStockFilter.toLowerCase();
                      return proj.product.name.toLowerCase().includes(q) || proj.product.provider.toLowerCase().includes(q);
                    })
                    .map(proj => {
                      const statusBadges = {
                        healthy: 'success',
                        out_of_stock: 'danger',
                        critical: 'warning',
                        reorder_soon: 'secondary'
                      };
                      const statusLabels = {
                        healthy: 'Saludable',
                        out_of_stock: 'Agotado',
                        critical: 'Stock Crítico',
                        reorder_soon: 'Reordenar pronto'
                      };

                      return (
                        <tr key={proj.product.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{proj.product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Talla {proj.product.size} | {proj.product.color} | SKU: {proj.product.sku}</div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{proj.product.provider}</td>
                          <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                            {proj.weeklyVelocity.toFixed(2)} uds/sem
                          </td>
                          <td>
                            <span className={`badge ${proj.stock === 0 ? 'danger' : proj.stock <= proj.minStock ? 'warning' : 'success'}`}>
                              {proj.stock} uds
                            </span>
                          </td>
                          <td>
                            {proj.projectedDemand.toFixed(1)} uds
                          </td>
                          <td>
                            <span style={{ 
                              fontWeight: 800, 
                              fontSize: '16px', 
                              color: proj.suggestedToBuy > 0 ? 'var(--secondary)' : 'var(--text-muted)' 
                            }}>
                              {proj.suggestedToBuy} uds
                            </span>
                          </td>
                          <td>{formatCOP(proj.product.costPrice)}</td>
                          <td style={{ fontWeight: 700, color: proj.estimatedCost > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                            {formatCOP(proj.estimatedCost)}
                          </td>
                          <td>
                            <span className={`badge ${statusBadges[proj.status]}`}>
                              {statusLabels[proj.status]}
                            </span>
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
    </div>
  );
}
