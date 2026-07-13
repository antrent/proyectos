import React, { useState } from 'react';

export default function OpeningBoxForm({ storeName, onOpen }) {
  const [openingCash, setOpeningCash] = useState(150000);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (openingCash < 0) {
      setError('El saldo inicial no puede ser negativo.');
      return;
    }
    onOpen(openingCash, notes);
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '40px auto',
      padding: '32px',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>💵</span>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Apertura Diaria de Caja
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Sucursal: <strong>{storeName || 'Sede Principal'}</strong>
        </span>
      </div>

      <div className="alert alert-warning" style={{ fontSize: '12.5px', margin: 0 }}>
        <span>⚠️</span>
        <span>
          <strong>Caja Cerrada.</strong> Debes registrar el saldo inicial en caja (base) para abrir la caja y poder registrar ventas en esta sucursal.
        </span>
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: '12.5px', margin: 0 }}>
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Saldo Inicial de Caja (Base en pesos) *</label>
          <input
            type="number"
            className="form-control"
            min="0"
            required
            value={openingCash}
            onChange={e => setOpeningCash(Math.max(0, parseFloat(e.target.value) || 0))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notas de Apertura (Opcional)</label>
          <textarea
            className="form-control"
            style={{ minHeight: '60px' }}
            placeholder="Ej: Base entregada en billetes de baja denominación..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}>
          🚀 Registrar Apertura y Abrir Caja
        </button>
      </form>
    </div>
  );
}
