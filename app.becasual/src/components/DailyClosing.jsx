import React, { useState, useEffect } from 'react';
import { salesService } from '../services/SalesService';

const PAYMENT_ICONS = {
  Efectivo: '💵',
  Tarjeta: '💳',
  Transferencia: '📱'
};

const PAYMENT_COLORS = {
  Efectivo: 'var(--success)',
  Tarjeta: 'var(--primary)',
  Transferencia: 'var(--secondary)'
};

export default function DailyClosing({ user }) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [expandedClosing, setExpandedClosing] = useState(null);

  useEffect(() => {
    loadSummary();
    loadHistory();
  }, [selectedDate]);

  const loadSummary = () => {
    const s = salesService.getDailySalesSummary(selectedDate);
    setSummary(s);
  };

  const loadHistory = () => {
    const closings = salesService.getDailyClosings();
    setHistory(closings);
  };

  const handleRegisterClosing = () => {
    setError('');
    setSuccess('');
    if (!summary || summary.salesCount === 0) {
      setError('No hay ventas registradas en esta fecha para realizar un cierre.');
      return;
    }
    try {
      salesService.registerDailyClosing({
        date: selectedDate,
        ...summary,
        notes,
        registeredBy: user.name,
        registeredByRole: user.role
      });
      setSuccess(`¡Cierre del día ${selectedDate} registrado exitosamente!`);
      setNotes('');
      loadHistory();
    } catch (err) {
      setError(err.message || 'Error al registrar el cierre.');
    }
  };

  const formatCOP = (amount) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const totalBreakdownSum = summary
    ? Object.values(summary.breakdown || {}).reduce((a, b) => a + b, 0)
    : 0;

  const alreadyClosed = history.some(c => c.date === selectedDate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Date selector */}
      <div className="card-table-wrapper" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h3 className="card-title" style={{ margin: 0 }}>🧾 Cierre Diario de Caja</h3>
          <input
            type="date"
            className="form-control"
            style={{ width: '200px' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          {alreadyClosed && (
            <span className="badge warning">✅ Cierre ya registrado</span>
          )}
        </div>
      </div>

      {/* Main summary grid */}
      {summary && (
        <div className="grid-2">

          {/* Summary card */}
          <div className="card-table-wrapper" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 className="card-title" style={{ margin: 0 }}>📊 Resumen del Día — {formatDate(selectedDate)}</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '20px', background: 'hsla(140,40%,35%,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid hsla(140,40%,35%,0.15)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Ventas Brutas</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--success)' }}>{formatCOP(summary.total)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{summary.salesCount} transacciones</div>
              </div>

              <div style={{ padding: '20px', background: 'hsla(18,76%,53%,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid hsla(18,76%,53%,0.15)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Margen / Utilidad</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)' }}>{formatCOP(summary.profit)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {summary.total > 0 ? ((summary.profit / summary.total) * 100).toFixed(1) : 0}% del total
                </div>
              </div>
            </div>

            {/* Payment method breakdown */}
            <div>
              <h5 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                💳 Desglose por Medio de Pago
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(summary.breakdown || {}).map(([method, amount]) => {
                  const pct = totalBreakdownSum > 0 ? (amount / totalBreakdownSum) * 100 : 0;
                  const color = PAYMENT_COLORS[method] || 'var(--text-muted)';
                  return (
                    <div key={method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {PAYMENT_ICONS[method] || '💰'} {method}
                        </span>
                        <span style={{ fontWeight: 700, color }}>{formatCOP(amount)}</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: color,
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{pct.toFixed(1)}% del total</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Close action card */}
          <div className="card-table-wrapper" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 className="card-title" style={{ margin: 0 }}>📝 Registrar Cierre Oficial</h4>

            {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
            {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}

            {/* Totales finales */}
            <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {[
                { label: 'Ventas Brutas', value: summary.total, color: 'var(--success)' },
                { label: 'Costo de Mercancía', value: summary.cost, color: 'var(--danger)' },
                { label: 'Margen Bruto', value: summary.profit, color: 'var(--primary)' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-app)',
                  borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontWeight: 800, color: row.color }}>{formatCOP(row.value)}</span>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones del Cierre (Opcional)</label>
              <textarea
                className="form-control"
                style={{ minHeight: '90px', resize: 'vertical' }}
                placeholder="Ej: Se presentó inconsistencia en caja menor. Diferencia de $5,000..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
              onClick={handleRegisterClosing}
              disabled={summary.salesCount === 0}
            >
              {alreadyClosed ? '🔄 Re-generar Cierre del Día' : '🏁 Confirmar y Registrar Cierre'}
            </button>

            {summary.salesCount === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                No hay ventas en la fecha seleccionada.
              </p>
            )}
          </div>
        </div>
      )}

      {/* History table */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <div>
            <h3 className="card-title">📋 Historial de Cierres Registrados</h3>
            <span className="card-subtitle">Todos los cierres de caja confirmados</span>
          </div>
          <span className="badge primary">{history.length} cierres</span>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ventas</th>
                <th>Total</th>
                <th>💵 Efectivo</th>
                <th>💳 Tarjeta</th>
                <th>📱 Transferencia</th>
                <th>Utilidad</th>
                <th>Registrado por</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se han registrado cierres aún.
                </td></tr>
              ) : (
                history.map(c => (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td><strong>{formatDate(c.date)}</strong></td>
                      <td><span className="badge primary">{c.salesCount}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCOP(c.total)}</td>
                      <td>{formatCOP(c.breakdown?.Efectivo)}</td>
                      <td>{formatCOP(c.breakdown?.Tarjeta)}</td>
                      <td>{formatCOP(c.breakdown?.Transferencia)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCOP(c.profit)}</td>
                      <td><span style={{ fontSize: '12px' }}>{c.registeredBy}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm"
                          onClick={() => setExpandedClosing(expandedClosing === c.id ? null : c.id)}>
                          {expandedClosing === c.id ? '▲ Cerrar' : '▼ Ver'}
                        </button>
                      </td>
                    </tr>
                    {expandedClosing === c.id && (
                      <tr>
                        <td colSpan="9" style={{ background: 'var(--bg-app)', padding: '16px 24px' }}>
                          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div>
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Hora de registro:</strong>
                              <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                {new Date(c.timestamp).toLocaleString('es-CO')}
                              </span>
                            </div>
                            {c.notes && (
                              <div>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Observaciones:</strong>
                                <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>{c.notes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
