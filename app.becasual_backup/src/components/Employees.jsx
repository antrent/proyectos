import React, { useState, useEffect } from 'react';
import { storageRepository } from '../services/StorageRepository';
import { CsvHelper } from '../services/CsvHelper';

const ROLES = ['Administrador', 'Vendedor', 'Cajero', 'Comprador', 'Almacenista', 'Auxiliar'];
const STATUS = ['activo', 'inactivo', 'vacaciones', 'licencia'];

const EMPTY_FORM = {
  id: '', name: '', document: '', documentType: 'CC',
  role: 'Vendedor', phone: '', email: '',
  salary: 0, startDate: new Date().toISOString().split('T')[0],
  address: '', emergencyContact: '', emergencyPhone: '',
  status: 'activo', notes: ''
};

const STATUS_BADGES = {
  activo: 'success',
  inactivo: 'danger',
  vacaciones: 'warning',
  licencia: 'secondary'
};

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  const load = () => setEmployees(storageRepository.getEmployees());

  const EMPLOYEE_COLUMNS = [
    { label: 'Nombre Completo', key: 'name' },
    { label: 'Tipo Documento', key: 'documentType' },
    { label: 'Documento', key: 'document' },
    { label: 'Cargo', key: 'role' },
    { label: 'Telefono', key: 'phone' },
    { label: 'Email', key: 'email' },
    { label: 'Salario', key: 'salary' },
    { label: 'Fecha Ingreso', key: 'startDate' },
    { label: 'Contacto Emergencia', key: 'emergencyContact' },
    { label: 'Telefono Emergencia', key: 'emergencyPhone' },
    { label: 'Estado', key: 'status' },
    { label: 'Notas', key: 'notes' }
  ];

  const handleExportCSV = () => {
    const csvContent = CsvHelper.jsonToCsv(employees, EMPLOYEE_COLUMNS);
    CsvHelper.download(csvContent, 'empleados_becasual.csv');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 
        name: 'Maria Gomez', documentType: 'CC', document: '1023456789', role: 'Vendedor', 
        phone: '3129876543', email: 'maria.gomez@email.com', salary: '1500000', startDate: '2026-01-15', 
        emergencyContact: 'Pedro Gomez', emergencyPhone: '3201234567', status: 'activo', notes: 'Turno tarde' 
      }
    ];
    const csvContent = CsvHelper.jsonToCsv(templateData, EMPLOYEE_COLUMNS);
    CsvHelper.download(csvContent, 'plantilla_empleados.csv');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = CsvHelper.csvToJson(text, EMPLOYEE_COLUMNS);
        if (parsed.length === 0) {
          setError('El archivo CSV está vacío o no tiene el formato correcto.');
          return;
        }

        const all = storageRepository.getEmployees();
        let addedCount = 0;
        let duplicateCount = 0;

        parsed.forEach(row => {
          if (!row.name || !row.name.trim()) return;
          
          const docTrimmed = (row.document || '').trim();
          const isDuplicate = docTrimmed && all.some(emp => (emp.document || '').trim() === docTrimmed);
          
          if (isDuplicate) {
            duplicateCount++;
          } else {
            all.unshift({
              id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: row.name.trim(),
              documentType: row.documentType.trim() || 'CC',
              document: docTrimmed,
              role: row.role.trim() || 'Vendedor',
              phone: (row.phone || '').trim(),
              email: (row.email || '').trim(),
              salary: Number(row.salary) || 0,
              startDate: (row.startDate || '').trim() || new Date().toISOString().split('T')[0],
              emergencyContact: (row.emergencyContact || '').trim(),
              emergencyPhone: (row.emergencyPhone || '').trim(),
              status: (row.status || '').trim().toLowerCase() || 'activo',
              notes: (row.notes || '').trim(),
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        if (addedCount > 0) {
          storageRepository.saveEmployees(all);
          load();
          setSuccess(`Se importaron ${addedCount} empleados con éxito.${duplicateCount > 0 ? ` Se omitieron ${duplicateCount} duplicados.` : ''}`);
          setTimeout(() => setSuccess(''), 4000);
        } else {
          setError('No se agregaron empleados nuevos (todos estaban duplicados o vacíos).');
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchQuery = !q || e.name.toLowerCase().includes(q) || (e.document || '').includes(q) || (e.role || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const openAdd = () => {
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (e) => {
    setEditingEmployee(e);
    setForm({ ...e });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (id === 'emp_1') { alert('No se puede eliminar al empleado administrador principal.'); return; }
    if (!window.confirm('¿Eliminar este empleado del sistema?')) return;
    const updated = employees.filter(e => e.id !== id);
    storageRepository.saveEmployees(updated);
    load();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }

    const all = storageRepository.getEmployees();
    if (editingEmployee) {
      const idx = all.findIndex(e => e.id === editingEmployee.id);
      all[idx] = { ...all[idx], ...form };
      storageRepository.saveEmployees(all);
      setSuccess('Empleado actualizado correctamente.');
    } else {
      all.unshift({ ...form, id: `emp_${Date.now()}`, createdAt: new Date().toISOString() });
      storageRepository.saveEmployees(all);
      setSuccess('Empleado registrado correctamente.');
    }
    setIsModalOpen(false);
    load();
    setTimeout(() => setSuccess(''), 4000);
  };

  const formatCOP = (amount) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);

  const totalPayroll = employees.filter(e => e.status === 'activo').reduce((s, e) => s + (Number(e.salary) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header actions */}
      <div className="card-table-wrapper" style={{ padding: '20px 24px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '260px' }}
            placeholder="🔍 Buscar por nombre, documento o cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-control" style={{ width: '180px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">-- Todo el personal --</option>
            {STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}>➕ Nuevo Empleado</button>
        </div>
      </div>

      {/* Acciones Masivas */}
      <div className="card-table-wrapper" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-body)', border: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>👥</span>
          <div>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Acciones Masivas</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carga o descarga de empleados en lote por archivos CSV</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>📥 Exportar CSV</button>
          <button className="btn btn-outline btn-sm" onClick={() => document.getElementById('csv-file-input').click()}>📤 Importar CSV</button>
          <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} style={{ borderStyle: 'dotted' }}>📄 Plantilla</button>
          <input 
            type="file" 
            id="csv-file-input" 
            accept=".csv" 
            style={{ display: 'none' }} 
            onChange={handleImportCSV} 
          />
        </div>
      </div>

      {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}
      {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

      {/* Stats */}
      <div className="grid-stats">
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Empleados Activos</span>
            <span className="stat-value">{employees.filter(e => e.status === 'activo').length}</span>
          </div>
          <div className="stat-icon">👤</div>
        </div>
        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Total Personal</span>
            <span className="stat-value">{employees.length}</span>
          </div>
          <div className="stat-icon">👥</div>
        </div>
        <div className="card-stat gold">
          <div className="stat-info">
            <span className="stat-label">Nómina Mensual Activos</span>
            <span className="stat-value" style={{ fontSize: '18px' }}>{formatCOP(totalPayroll)}</span>
          </div>
          <div className="stat-icon">💰</div>
        </div>
      </div>

      {/* Table */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <h3 className="card-title">📋 Gestión de Personal</h3>
          <span className="badge primary">{filtered.length} empleados</span>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Cargo</th>
                <th>Teléfono</th>
                <th>Salario</th>
                <th>Inicio</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {employees.length === 0 ? 'No hay empleados registrados.' : 'Sin resultados.'}
                </td></tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{e.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.email || ''}</div>
                    </td>
                    <td><code>{e.documentType} {e.document}</code></td>
                    <td><span className="badge primary">{e.role}</span></td>
                    <td>{e.phone || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{formatCOP(e.salary)}</td>
                    <td style={{ fontSize: '13px' }}>{e.startDate || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGES[e.status] || 'secondary'}`}>{e.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>✏️ Editar</button>
                        {e.id !== 'emp_1' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>🗑️</button>
                        )}
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
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
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
                    <label className="form-label">Cargo / Rol</label>
                    <input type="text" className="form-control" list="rolesList" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                    <datalist id="rolesList">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Tipo de Documento</label>
                    <select className="form-control" value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })}>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Cédula Extranjería</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Número de Documento</label>
                    <input type="text" className="form-control" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Teléfono / Celular</label>
                    <input type="text" className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Salario Mensual (COP)</label>
                    <input type="number" className="form-control" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de Ingreso</label>
                    <input type="date" className="form-control" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Contacto de Emergencia</label>
                    <input type="text" className="form-control" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono Emergencia</label>
                    <input type="text" className="form-control" value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas Adicionales</label>
                  <textarea className="form-control" style={{ minHeight: '70px' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Guardar Cambios' : 'Registrar Empleado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
