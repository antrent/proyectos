import React, { useState, useEffect } from 'react';
import { storageRepository } from '../services/StorageRepository';

const EMPTY_FORM = {
  id: '', name: '', document: '', documentType: 'CC',
  phone: '', email: '', address: '', city: 'Bogotá',
  birthDate: '', notes: ''
};

export default function Clients({ user }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  const load = () => setClients(storageRepository.getClients());

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.document || '').includes(q) || (c.phone || '').includes(q);
  });

  const openAdd = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingClient(c);
    setForm({ ...c });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    const updated = clients.filter(c => c.id !== id);
    storageRepository.saveClients(updated);
    load();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }

    const all = storageRepository.getClients();
    if (editingClient) {
      const idx = all.findIndex(c => c.id === editingClient.id);
      all[idx] = { ...all[idx], ...form };
      storageRepository.saveClients(all);
      setSuccess('Cliente actualizado.');
    } else {
      all.unshift({ ...form, id: `cli_${Date.now()}`, createdAt: new Date().toISOString() });
      storageRepository.saveClients(all);
      setSuccess('Cliente registrado.');
    }
    setIsModalOpen(false);
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header actions */}
      <div className="card-table-wrapper" style={{ padding: '20px 24px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '260px' }}
            placeholder="🔍 Buscar por nombre, documento o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openAdd}>➕ Nuevo Cliente</button>
        </div>
      </div>

      {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}

      {/* Stats */}
      <div className="grid-stats">
        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Total Clientes</span>
            <span className="stat-value">{clients.length}</span>
          </div>
          <div className="stat-icon">👥</div>
        </div>
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Clientes con Email</span>
            <span className="stat-value">{clients.filter(c => c.email).length}</span>
          </div>
          <div className="stat-icon">📧</div>
        </div>
      </div>

      {/* Table */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <h3 className="card-title">📋 Listado de Clientes</h3>
          <span className="badge primary">{filtered.length} resultados</span>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ciudad</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {clients.length === 0 ? 'No hay clientes registrados aún.' : 'Sin resultados para la búsqueda.'}
                </td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td><code>{c.documentType} {c.document}</code></td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.city || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre Completo *</label>
                    <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Documento</label>
                    <select className="form-control" value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })}>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Cédula Extranjería</option>
                      <option value="PP">Pasaporte</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Número de Documento</label>
                    <input type="text" className="form-control" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono / Celular</label>
                    <input type="text" className="form-control" placeholder="3001234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <input type="text" className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input type="text" className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notas Adicionales</label>
                  <textarea className="form-control" style={{ minHeight: '70px' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
