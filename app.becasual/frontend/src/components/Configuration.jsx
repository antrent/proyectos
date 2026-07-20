import React, { useState, useEffect } from 'react';
import { storageRepository } from '../services/StorageRepository';
import { authService } from '../services/AuthService';
import { notificationService } from '../services/NotificationService';

export default function Configuration({ user, onConfigChange, currentStoreId }) {
  const [config, setConfig] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  const [storesList, setStoresList] = useState([]);
  const [editingStore, setEditingStore] = useState(null); // null | store object
  const [storeForm, setStoreForm] = useState({ name: '', slogan: '', address: '', phone: '', email: '', rent: '', taxRate: 19 });
  const [storeSuccess, setStoreSuccess] = useState('');
  const [storeError, setStoreError] = useState('');
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({ name: '', slogan: '', address: '', phone: '', email: '', rent: '', taxRate: 19 });
  
  // User Form State
  const [userForm, setUserForm] = useState({ id: '', username: '', password: '', name: '', role: 'vendedor' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userError, setUserError] = useState('');
  
  // Parameters Editor State
  const [selectedParamType, setSelectedParamType] = useState('categories');
  const [newParamName, setNewParamName] = useState('');
  const [paramError, setParamError] = useState('');
  const [paramSuccess, setParamSuccess] = useState('');
  const [editingParam, setEditingParam] = useState(null); // { id: number, name: string }
  const [paramSearchTerm, setParamSearchTerm] = useState('');
  const [paramPage, setParamPage] = useState(1);
  const [paramRowsPerPage, setParamRowsPerPage] = useState('10');

  // UX alerts
  const [configSuccess, setConfigSuccess] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Notification Settings State
  const [notifConfig, setNotifConfig] = useState(() => notificationService.getConfig());
  const [notifSuccess, setNotifSuccess] = useState('');

  // Snapshots State
  const [snapshotsList, setSnapshotsList] = useState([]);
  const [snapshotForm, setSnapshotForm] = useState({ name: '', description: '' });
  const [snapshotSuccess, setSnapshotSuccess] = useState('');
  const [snapshotError, setSnapshotError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setConfig(storageRepository.getConfig());
    setUsersList(storageRepository.getUsers());
    setParams(storageRepository.getParams());
    setStoresList(storageRepository.getStores());
    setSnapshotsList(storageRepository.getSnapshots());
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setConfigSuccess('');
    storageRepository.saveConfig(config);
    
    // Guardar en la base de datos de GCP en segundo plano
    const storeId = currentStoreId || 'store_1';
    import('../services/api.js').then(({ api }) => {
      api.put(`/stores/${storeId}`, {
        name: config.name,
        slogan: config.slogan,
        address: config.address,
        phone: config.phone,
        email: config.email,
        rent: config.rent,
        taxRate: config.taxRate,
        defaultOpeningCash: Number(config.defaultOpeningCash) || 150000
      }).catch(err => console.error('Error al actualizar sucursal en GCP:', err));
    });

    setConfigSuccess('Configuración de la tienda guardada con éxito.');
    onConfigChange();
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!userForm.username.trim() || !userForm.password || !userForm.name.trim()) {
      setUserError('Todos los campos son obligatorios.');
      return;
    }

    try {
      if (isEditingUser) {
        authService.updateUser(user.role, userForm.id, userForm);
        setUserSuccess('Usuario actualizado con éxito.');
      } else {
        authService.addUser(user.role, userForm);
        setUserSuccess('Usuario registrado con éxito.');
      }
      handleResetUserForm();
      loadData();
    } catch (err) {
      setUserError(err.message || 'Error al guardar el usuario.');
    }
  };

  const handleEditUserClick = (u) => {
    setUserForm({ ...u });
    setIsEditingUser(true);
    setUserError('');
  };

  const handleDeleteUserClick = (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        authService.deleteUser(user.role, userId);
        setUserSuccess('Usuario eliminado con éxito.');
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleResetUserForm = () => {
    setUserForm({ id: '', username: '', password: '', name: '', role: 'vendedor' });
    setIsEditingUser(false);
    setUserError('');
  };

  const handleAddParameter = (e) => {
    e.preventDefault();
    setParamError('');
    setParamSuccess('');

    if (!newParamName.trim()) {
      setParamError('El valor del parámetro no puede estar vacío.');
      return;
    }

    const cleanName = newParamName.trim().toUpperCase();
    const updatedParams = { ...params };
    const currentList = updatedParams[selectedParamType] || [];
    
    // Check duplication
    if (currentList.some(item => item.name.toUpperCase() === cleanName)) {
      setParamError('Este parámetro ya existe.');
      return;
    }

    const nextId = currentList.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    currentList.push({
      name: cleanName,
      id: nextId
    });

    updatedParams[selectedParamType] = currentList;
    storageRepository.saveParams(updatedParams);
    setNewParamName('');
    setParamSuccess(`Parámetro "${cleanName}" agregado con éxito.`);
    loadData();
  };

  const handleStartEditParam = (item) => {
    setEditingParam({ id: item.id, name: item.name });
    setParamError('');
    setParamSuccess('');
  };

  const handleSaveEditParam = (e) => {
    e.preventDefault();
    setParamError('');
    setParamSuccess('');

    if (!editingParam || !editingParam.name.trim()) {
      setParamError('El nombre del parámetro no puede estar vacío.');
      return;
    }

    const cleanName = editingParam.name.trim().toUpperCase();
    const updatedParams = { ...params };
    const currentList = updatedParams[selectedParamType] || [];

    // Validar duplicados exceptuando el propio ítem que se está editando
    if (currentList.some(item => item.id !== editingParam.id && item.name.toUpperCase() === cleanName)) {
      setParamError('Ya existe otro parámetro con este mismo nombre.');
      return;
    }

    const itemIdx = currentList.findIndex(item => item.id === editingParam.id);
    if (itemIdx === -1) {
      setParamError('Parámetro no encontrado.');
      return;
    }

    currentList[itemIdx] = { ...currentList[itemIdx], name: cleanName };
    updatedParams[selectedParamType] = currentList;
    storageRepository.saveParams(updatedParams);

    setParamSuccess(`Parámetro actualizado a "${cleanName}" con éxito.`);
    setEditingParam(null);
    loadData();
  };

  const handleDeleteParameter = (paramId) => {
    const itemToDelete = (params[selectedParamType] || []).find(item => item.id === paramId);
    if (window.confirm(`¿Estás seguro de que deseas eliminar el parámetro "${itemToDelete?.name || ''}"?`)) {
      const updatedParams = { ...params };
      updatedParams[selectedParamType] = updatedParams[selectedParamType].filter(item => item.id !== paramId);
      storageRepository.saveParams(updatedParams);
      setParamSuccess(`Parámetro eliminado con éxito.`);
      loadData();
    }
  };

  // === Store Management Handlers (Admin only) ===
  const handleEditStore = (store) => {
    setEditingStore(store);
    setIsCreatingStore(false);
    setStoreForm({
      name: store.name,
      slogan: store.slogan || '',
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      rent: store.rent || '',
      taxRate: store.taxRate !== undefined ? store.taxRate : 19
    });
    setStoreError('');
    setStoreSuccess('');
  };

  const handleSaveStore = (e) => {
    e.preventDefault();
    setStoreError('');
    if (!storeForm.name.trim()) { setStoreError('El nombre de la sede es obligatorio.'); return; }
    const stores = storageRepository.getStores();
    const idx = stores.findIndex(s => s.id === editingStore.id);
    if (idx === -1) { setStoreError('Sede no encontrada.'); return; }
    stores[idx] = { 
      ...stores[idx], 
      ...storeForm, 
      taxRate: parseInt(storeForm.taxRate) || 0 
    };
    storageRepository.setData('stores', stores);
    setStoreSuccess(`Sede "${storeForm.name}" actualizada correctamente.`);
    setEditingStore(null);
    loadData();
    onConfigChange();
  };

  const handleCreateStore = (e) => {
    e.preventDefault();
    setStoreError('');
    setStoreSuccess('');

    if (!newStoreForm.name.trim()) {
      setStoreError('El nombre de la sede es obligatorio.');
      return;
    }

    const stores = storageRepository.getStores();
    const newStoreId = `store_${Date.now()}`;

    const newStore = {
      id: newStoreId,
      name: newStoreForm.name.trim(),
      slogan: newStoreForm.slogan.trim() || 'Estilo y moda casual.',
      address: newStoreForm.address.trim() || 'Dirección no asignada',
      phone: newStoreForm.phone.trim() || 'Sin teléfono',
      email: newStoreForm.email.trim() || 'contacto@becasual.com',
      rent: newStoreForm.rent.trim() || '0',
      taxRate: parseInt(newStoreForm.taxRate) || 19
    };

    stores.push(newStore);
    storageRepository.setData('stores', stores);
    setStoreSuccess(`Sede "${newStoreForm.name}" creada con éxito.`);
    setNewStoreForm({ name: '', slogan: '', address: '', phone: '', email: '', rent: '', taxRate: 19 });
    setIsCreatingStore(false);
    loadData();
    onConfigChange();
  };

  // === Database Versioning & Snapshot Handlers ===
  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    setSnapshotError('');
    setSnapshotSuccess('');
    if (!snapshotForm.name.trim()) {
      setSnapshotError('El nombre de la versión es obligatorio.');
      return;
    }
    try {
      storageRepository.createSnapshot(snapshotForm.name.trim(), snapshotForm.description.trim());
      setSnapshotSuccess(`Versión de datos "${snapshotForm.name}" creada con éxito.`);
      setSnapshotForm({ name: '', description: '' });
      loadData();
    } catch (err) {
      setSnapshotError(err.message || 'Error al crear la versión.');
    }
  };

  const handleRestoreSnapshot = (snapshotId, snapshotName) => {
    if (window.confirm(`⚠️ ADVERTENCIA CRÍTICA:\n¿Estás seguro de que deseas restaurar la versión de datos "${snapshotName}"?\n\nTodos los datos actuales del inventario, ventas, clientes y configuraciones serán reemplazados por el estado guardado. El sistema se reiniciará.`)) {
      try {
        storageRepository.restoreSnapshot(snapshotId);
        alert('Base de datos restaurada con éxito. El sistema se recargará ahora.');
        window.location.reload();
      } catch (err) {
        alert('Error al restaurar: ' + err.message);
      }
    }
  };

  const handleDeleteSnapshot = (snapshotId, snapshotName) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la versión de datos "${snapshotName}"? Esta acción no se puede deshacer.`)) {
      try {
        storageRepository.deleteSnapshot(snapshotId);
        setSnapshotSuccess(`Versión "${snapshotName}" eliminada correctamente.`);
        loadData();
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleExportSnapshot = (snapshot) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([snapshot], null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      const cleanName = snapshot.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      downloadAnchor.setAttribute("download", `becasual_backup_${cleanName}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSnapshotSuccess('Copia de datos exportada y descargada.');
    } catch (err) {
      setSnapshotError('Error al exportar la copia.');
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        storageRepository.importSnapshots(importedData);
        setSnapshotSuccess('Copia(s) de seguridad importada(s) correctamente.');
        loadData();
        e.target.value = null;
      } catch (err) {
        setSnapshotError('Error al importar archivo. Asegúrate de que sea un archivo JSON válido de BeCasual: ' + err.message);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  // Lógica de filtrado y paginación para el Catálogo de Parámetros
  const rawParamList = params[selectedParamType] || [];
  const filteredParamList = rawParamList.filter(item =>
    item.name.toLowerCase().includes(paramSearchTerm.toLowerCase().trim())
  );

  const paramLimit = paramRowsPerPage === 'all' ? filteredParamList.length : (parseInt(paramRowsPerPage) || 10);
  const totalParamPages = Math.max(1, Math.ceil(filteredParamList.length / (paramLimit || 1)));
  const validParamPage = Math.min(paramPage, totalParamPages);
  const startIndexParam = (validParamPage - 1) * paramLimit;
  const paginatedParamList = filteredParamList.slice(startIndexParam, startIndexParam + paramLimit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. Store Metadata parameters */}
      <div className="card-table-wrapper" style={{ padding: '32px' }}>
        <h3 className="card-title" style={{ marginBottom: '20px' }}>⚙️ Configuración del Almacén</h3>
        {configSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <span>✅</span> <span>{configSuccess}</span>
          </div>
        )}
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Nombre del Almacén</label>
              <input
                type="text"
                className="form-control"
                value={config.name || ''}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slogan</label>
              <input
                type="text"
                className="form-control"
                value={config.slogan || ''}
                onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Impuesto General (IVA %)</label>
              <input
                type="number"
                className="form-control"
                value={config.taxRate || ''}
                onChange={(e) => setConfig({ ...config, taxRate: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                className="form-control"
                value={config.address || ''}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Celular / Teléfono</label>
              <input
                type="text"
                className="form-control"
                value={config.phone || ''}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input
                type="email"
                className="form-control"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div className="form-group">
              <label className="form-label">Costo de Arriendo Mensual</label>
              <input
                type="text"
                className="form-control"
                value={config.rent || ''}
                onChange={(e) => setConfig({ ...config, rent: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estado Cámara de Comercio (CCB)</label>
              <span className="badge success" style={{ padding: '12px', textAlign: 'center' }}>Vigente / OK</span>
            </div>
            <div className="form-group">
              <label className="form-label">Base de Caja Predeterminada (pesos)</label>
              <input
                type="number"
                className="form-control"
                value={config.defaultOpeningCash || 150000}
                onChange={(e) => setConfig({ ...config, defaultOpeningCash: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '12px 24px' }}>
            Guardar Configuración
          </button>
        </form>
      </div>

      <div className="grid-2">
        {/* 2. RBAC User Privileges management */}
        <div className="card-table-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 className="card-title">👥 Control de Accesos y Privilegios</h3>
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' }}>
            {userError && (
              <div className="alert alert-error">
                <span>⚠️</span> <span>{userError}</span>
              </div>
            )}
            {userSuccess && (
              <div className="alert alert-success">
                <span>✅</span> <span>{userSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                {isEditingUser ? 'EDITAR USUARIO SELECCIONADO' : 'CREAR NUEVO USUARIO'}
              </span>
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Juan Pérez"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol del Sistema</label>
                  <select
                    className="form-control"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="admin">Administrador (Acceso Total)</option>
                    <option value="vendedor">Vendedor / Cajero (Solo Ventas y Ver Stock)</option>
                    <option value="comprador">Comprador / Gestor (Solo Compras y Editar Stock)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Usuario de Acceso</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="juanp"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    disabled={isEditingUser}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {isEditingUser && (
                  <button type="button" className="btn btn-outline" onClick={handleResetUserForm}>
                    Cancelar
                  </button>
                )}
                <button type="submit" className="btn btn-primary">
                  {isEditingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>

            {/* List of active users */}
            <div className="table-responsive">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{u.name}</td>
                      <td><code>{u.username}</code></td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'secondary' : u.role === 'vendedor' ? 'success' : 'primary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {u.username !== 'admin' && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleEditUserClick(u)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUserClick(u.id)}>🗑️</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Parameter Tables Editor */}
        <div className="card-table-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="card-title">📚 Modificar Catálogo de Parámetros</h3>
            <span className="badge secondary">{(params[selectedParamType] || []).length} registros</span>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' }}>
            {/* Alertas UX */}
            {paramSuccess && (
              <div className="alert alert-success">
                <span>✅</span> <span>{paramSuccess}</span>
              </div>
            )}
            {paramError && (
              <div className="alert alert-error">
                <span>⚠️</span> <span>{paramError}</span>
              </div>
            )}

            {/* Selector de tipo de parámetro */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>Seleccionar Catálogo a Administrar</label>
              <select
                className="form-control"
                value={selectedParamType}
                onChange={(e) => {
                  setSelectedParamType(e.target.value);
                  setParamError('');
                  setParamSuccess('');
                  setEditingParam(null);
                  setParamPage(1);
                }}
              >
                <option value="categories">Categorías ({(params.categories || []).length})</option>
                <option value="lines">Líneas ({(params.lines || []).length})</option>
                <option value="styles">Estilo-Detalles ({(params.styles || []).length})</option>
                <option value="genders">Géneros ({(params.genders || []).length})</option>
                <option value="colors">Colores ({(params.colors || []).length})</option>
                <option value="sizes">Tallas ({(params.sizes || []).length})</option>
                <option value="providers">Proveedores ({(params.providers || []).length})</option>
              </select>
            </div>

            {/* Formulario de Agregar / Formulario de Edición */}
            {editingParam ? (
              <form onSubmit={handleSaveEditParam} style={{ display: 'flex', gap: '12px', background: 'var(--bg-card-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: '700', color: 'var(--primary)' }}>✏️ Editando Parámetro (ID: {editingParam.id})</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nuevo nombre del parámetro..."
                    value={editingParam.name}
                    onChange={(e) => setEditingParam({ ...editingParam, name: e.target.value.toUpperCase() })}
                    style={{ textTransform: 'uppercase' }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingParam(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    💾 Guardar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddParameter} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={`➕ Agregar nuevo registro a ${selectedParamType}...`}
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                />
                <button type="submit" className="btn btn-primary">Agregar</button>
              </form>
            )}

            {/* Controles de Búsqueda y Paginación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Buscar parámetro..."
                  value={paramSearchTerm}
                  onChange={(e) => {
                    setParamSearchTerm(e.target.value);
                    setParamPage(1);
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mostrar:</span>
                <select
                  className="form-control"
                  style={{ width: 'auto' }}
                  value={paramRowsPerPage}
                  onChange={(e) => {
                    setParamRowsPerPage(e.target.value);
                    setParamPage(1);
                  }}
                >
                  <option value="10">10 registros</option>
                  <option value="25">25 registros</option>
                  <option value="50">50 registros</option>
                  <option value="100">100 registros</option>
                  <option value="all">Ver Todos</option>
                </select>
              </div>
            </div>

            {/* Tabla de Parámetros Paginada */}
            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>ID Asignado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedParamList.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        {paramSearchTerm ? 'No se encontraron registros que coincidan con la búsqueda.' : 'No hay parámetros registrados.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedParamList.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</td>
                        <td><code>{item.id}</code></td>
                        <td style={{ textAlign: 'center' }}>
                          {item.id !== 0 && (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleStartEditParam(item)}
                                title="Editar nombre de este parámetro"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteParameter(item.id)}
                                title="Eliminar parámetro"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Paginación */}
            {filteredParamList.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Mostrando {startIndexParam + 1} a {Math.min(startIndexParam + paramLimit, filteredParamList.length)} de {filteredParamList.length} registros
                </span>

                {totalParamPages > 1 && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={validParamPage === 1}
                      onClick={() => setParamPage(prev => Math.max(1, prev - 1))}
                    >
                      ◀ Anterior
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '600', padding: '0 8px' }}>
                      Página {validParamPage} de {totalParamPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={validParamPage === totalParamPages}
                      onClick={() => setParamPage(prev => Math.min(totalParamPages, prev + 1))}
                    >
                      Siguiente ▶
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 4. Stores/Branches Management (Admin only) */}
      {user.role === 'admin' && (
        <div className="card-table-wrapper" style={{ padding: '28px' }}>
          <div className="card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="card-title">🏬 Gestión de Sucursales / Sedes</h3>
              <span className="badge secondary">{storesList.length} tiendas activas</span>
            </div>
            {!isCreatingStore && (
              <button className="btn btn-primary" onClick={() => {
                setIsCreatingStore(true);
                setEditingStore(null);
                setStoreError('');
                setStoreSuccess('');
              }}>
                ➕ Nueva Sede
              </button>
            )}
          </div>

          {storeSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <span>✅</span> <span>{storeSuccess}</span>
            </div>
          )}
          {storeError && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span> <span>{storeError}</span>
            </div>
          )}

          {isCreatingStore && (
            <div style={{
              background: 'var(--bg-body)',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              marginBottom: '20px'
            }}>
              <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  🏬 CREAR NUEVA SEDE / SUCURSAL
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Nombre de la Sede *</label>
                    <input type="text" className="form-control" placeholder="Ej. Sede Medellín" value={newStoreForm.name}
                      onChange={e => setNewStoreForm({ ...newStoreForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slogan / Descripción</label>
                    <input type="text" className="form-control" placeholder="Ej. Tu moda en el centro" value={newStoreForm.slogan}
                      onChange={e => setNewStoreForm({ ...newStoreForm, slogan: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Impuesto General (IVA %)</label>
                    <input type="number" className="form-control" value={newStoreForm.taxRate}
                      onChange={e => setNewStoreForm({ ...newStoreForm, taxRate: parseInt(e.target.value) || 0 })} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input type="text" className="form-control" placeholder="Ej. Calle 50 # 45-20" value={newStoreForm.address}
                      onChange={e => setNewStoreForm({ ...newStoreForm, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input type="text" className="form-control" placeholder="Ej. 3001234567" value={newStoreForm.phone}
                      onChange={e => setNewStoreForm({ ...newStoreForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" className="form-control" placeholder="Ej. medellin@becasual.com" value={newStoreForm.email}
                      onChange={e => setNewStoreForm({ ...newStoreForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Costo de Arriendo Mensual</label>
                    <input type="text" className="form-control" placeholder="Ej. 1.8 millones" value={newStoreForm.rent}
                      onChange={e => setNewStoreForm({ ...newStoreForm, rent: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsCreatingStore(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Guardar y Crear Sede</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {storesList.map(store => (
              <div key={store.id} style={{
                background: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px'
              }}>
                {editingStore?.id === store.id ? (
                  // Edit mode
                  <form onSubmit={handleSaveStore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      EDITANDO: {store.id === 'store_1' ? '🏬 SEDE PRINCIPAL' : `🏬 SEDE: ${store.name.toUpperCase()}`}
                    </div>
                    <div className="grid-3">
                      <div className="form-group">
                        <label className="form-label">Nombre de la Sede *</label>
                        <input type="text" className="form-control" value={storeForm.name}
                          onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Slogan / Descripción</label>
                        <input type="text" className="form-control" value={storeForm.slogan}
                          onChange={e => setStoreForm({ ...storeForm, slogan: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Impuesto General (IVA %)</label>
                        <input type="number" className="form-control" value={storeForm.taxRate}
                          onChange={e => setStoreForm({ ...storeForm, taxRate: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Dirección</label>
                        <input type="text" className="form-control" value={storeForm.address}
                          onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Teléfono</label>
                        <input type="text" className="form-control" value={storeForm.phone}
                          onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Correo Electrónico</label>
                        <input type="email" className="form-control" value={storeForm.email}
                          onChange={e => setStoreForm({ ...storeForm, email: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costo de Arriendo Mensual</label>
                        <input type="text" className="form-control" value={storeForm.rent}
                          onChange={e => setStoreForm({ ...storeForm, rent: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setEditingStore(null)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary">💾 Guardar Sede</button>
                    </div>
                  </form>
                ) : (
                  // View mode
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        🏬 {store.name}
                        {currentStoreId === store.id && (
                          <span className="badge primary" style={{ marginLeft: '10px', fontSize: '11px' }}>Sede Activa</span>
                        )}
                      </div>
                      {store.slogan && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{store.slogan}</div>}
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px' }}>
                        {store.address && <span>📍 {store.address}</span>}
                        {store.phone && <span>📞 {store.phone}</span>}
                        {store.email && <span>✉️ {store.email}</span>}
                        {store.rent && <span>🏢 Arriendo: {store.rent}</span>}
                        {store.taxRate !== undefined && <span>🏷️ IVA: {store.taxRate}%</span>}
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEditStore(store)}>
                      ✏️ Editar Sede
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Notification Settings */}
      {user.role === 'admin' && (
        <div className="card-table-wrapper" style={{ padding: '32px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <h3 className="card-title">🔔 Configuración de Notificaciones (WhatsApp / Email)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configura cómo y cuándo se envían avisos automáticos a los clientes en separaciones.</span>
            </div>
          </div>

          {notifSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <span>✅</span> <span>{notifSuccess}</span>
            </div>
          )}

          <div className="grid-2" style={{ gap: '28px', marginBottom: '28px' }}>
            {/* General Config */}
            <div style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>⚙️ Configuración General</div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.enabled}
                    onChange={e => setNotifConfig(c => ({ ...c, enabled: e.target.checked }))}
                  />
                  <span>Activar notificaciones automáticas</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">📱 Modo de WhatsApp</label>
                <select
                  className="form-control"
                  value={notifConfig.whatsappMode}
                  onChange={e => setNotifConfig(c => ({ ...c, whatsappMode: e.target.value }))}
                >
                  <option value="whatsapp_link">Enlace wa.me (abre WhatsApp automáticamente)</option>
                  <option value="log_only">Solo registrar en consola (modo prueba)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  El modo "wa.me" abre una nueva pestaña por cada notificación. El mensaje queda prellenado para confirmar el envío.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">✉️ Modo de Email</label>
                <select
                  className="form-control"
                  value={notifConfig.emailMode}
                  onChange={e => setNotifConfig(c => ({ ...c, emailMode: e.target.value }))}
                >
                  <option value="email_mailto">Cliente de correo (mailto:)</option>
                  <option value="log_only">Solo registrar en consola (modo prueba)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  El modo "mailto" abre tu cliente de correo con el mensaje prellenado para revisar y enviar.
                </span>
              </div>
            </div>

            {/* Template Editor */}
            <div style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>📝 Personalizar Mensajes</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Puedes usar las variables: <code>{`{{clientName}}`}</code>, <code>{`{{storeName}}`}</code>, <code>{`{{layawayNumber}}`}</code>, <code>{`{{total}}`}</code>, <code>{`{{paid}}`}</code>, <code>{`{{balance}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{itemNames}}`}</code>, <code>{`{{storePhone}}`}</code>.
              </p>

              <div className="form-group">
                <label className="form-label">🛍️ Mensaje: Separación Creada</label>
                <textarea
                  className="form-control"
                  rows="4"
                  style={{ fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
                  value={notifConfig.templates?.layaway_created || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, templates: { ...c.templates, layaway_created: e.target.value } }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">💵 Mensaje: Abono Registrado</label>
                <textarea
                  className="form-control"
                  rows="4"
                  style={{ fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
                  value={notifConfig.templates?.payment_registered || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, templates: { ...c.templates, payment_registered: e.target.value } }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">📦 Mensaje: Producto Listo en Tienda</label>
                <textarea
                  className="form-control"
                  rows="4"
                  style={{ fontFamily: 'monospace', fontSize: '11px', resize: 'vertical' }}
                  value={notifConfig.templates?.product_ready || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, templates: { ...c.templates, product_ready: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              notificationService.saveConfig(notifConfig);
              setNotifSuccess('¡Configuración de notificaciones guardada correctamente!');
              setTimeout(() => setNotifSuccess(''), 4000);
            }}
          >
            💾 Guardar Configuración de Notificaciones
          </button>
        </div>
      )}

      {/* 6. Database Snapshot and Backups (Admin only) */}
      {user.role === 'admin' && (
        <div className="card-table-wrapper" style={{ padding: '32px' }}>
          <div className="card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="card-title">📂 Control de Versiones y Respaldos de Datos</h3>
              <span className="badge secondary">{snapshotsList.length} versiones registradas</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📥 Importar JSON
                <input type="file" accept=".json" onChange={handleImportFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {snapshotSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <span>✅</span> <span>{snapshotSuccess}</span>
            </div>
          )}
          {snapshotError && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span> <span>{snapshotError}</span>
            </div>
          )}

          <div className="grid-2" style={{ gap: '28px', marginBottom: '28px' }}>
            {/* Create Snapshot Form */}
            <div style={{
              background: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px'
            }}>
              <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  📸 CAPTURAR NUEVO PUNTO DE RESTAURACIÓN
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de la Versión *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Antes de carga de invierno"
                    value={snapshotForm.name}
                    onChange={e => setSnapshotForm({ ...snapshotForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción / Detalles de Cambios</label>
                  <textarea
                    className="form-control"
                    placeholder="Describe los cambios o estado actual de los datos..."
                    rows="3"
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                    value={snapshotForm.description}
                    onChange={e => setSnapshotForm({ ...snapshotForm, description: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  💾 Crear Versión de Datos
                </button>
              </form>
            </div>

            {/* General Info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: 'var(--bg-body)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>💡 ¿Cómo funciona el Control de Cambios?</h4>
              <p style={{ marginBottom: '8px' }}>
                Este panel te permite guardar instantáneas completas de la base de datos de tu tienda (configuración, sucursales, usuarios, inventario, ventas y cierres).
              </p>
              <ul style={{ paddingLeft: '18px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Crear Versión:</strong> Toma una foto del estado actual de tu negocio antes de realizar grandes modificaciones.</li>
                <li><strong>Restaurar:</strong> Regresa al estado exacto guardado. <em>¡Cuidado! Se sobrescribirán los datos actuales.</em></li>
                <li><strong>Exportar/Importar:</strong> Descarga tus respaldos como archivos JSON para guardarlos fuera del navegador o moverlos a otra computadora.</li>
              </ul>
            </div>
          </div>

          {/* Snapshots Table */}
          <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Nombre de Versión</th>
                  <th>Descripción</th>
                  <th>Fecha de Creación</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {snapshotsList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      📂 No hay versiones de datos guardadas todavía. Crea una arriba.
                    </td>
                  </tr>
                ) : (
                  [...snapshotsList].reverse().map(snap => (
                    <tr key={snap.id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        📸 {snap.name}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {snap.description}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {new Date(snap.timestamp).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                            title="Restaurar este estado de datos"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            🔄 Restaurar
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleExportSnapshot(snap)}
                            title="Descargar respaldo JSON"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            📤 Exportar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                            title="Eliminar este respaldo"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
