import React, { useState, useEffect } from 'react';
import { storageRepository } from '../services/StorageRepository';
import { authService } from '../services/AuthService';

export default function Configuration({ user, onConfigChange }) {
  const [config, setConfig] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  
  // User Form State
  const [userForm, setUserForm] = useState({ id: '', username: '', password: '', name: '', role: 'vendedor' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userError, setUserError] = useState('');
  
  // Parameters Editor State
  const [selectedParamType, setSelectedParamType] = useState('categories');
  const [newParamName, setNewParamName] = useState('');
  const [paramError, setParamError] = useState('');

  // UX alerts
  const [configSuccess, setConfigSuccess] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setConfig(storageRepository.getConfig());
    setUsersList(storageRepository.getUsers());
    setParams(storageRepository.getParams());
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setConfigSuccess('');
    storageRepository.saveConfig(config);
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

    if (!newParamName.trim()) {
      setParamError('El valor del parámetro no puede estar vacío.');
      return;
    }

    const updatedParams = { ...params };
    const currentList = updatedParams[selectedParamType] || [];
    
    // Check duplication
    if (currentList.some(item => item.name.toLowerCase() === newParamName.toLowerCase().trim())) {
      setParamError('Este parámetro ya existe.');
      return;
    }

    const nextId = currentList.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    currentList.push({
      name: newParamName.trim(),
      id: nextId
    });

    updatedParams[selectedParamType] = currentList;
    storageRepository.saveParams(updatedParams);
    setNewParamName('');
    loadData();
  };

  const handleDeleteParameter = (paramId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este parámetro?')) {
      const updatedParams = { ...params };
      updatedParams[selectedParamType] = updatedParams[selectedParamType].filter(item => item.id !== paramId);
      storageRepository.saveParams(updatedParams);
      loadData();
    }
  };

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
              <label className="form-label">Circuito Cerrado de TV (CCTV)</label>
              <span className="badge primary" style={{ padding: '12px', textAlign: 'center' }}>Activo / Monitoreado</span>
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
          <div className="card-header">
            <h3 className="card-title">📚 Modificar Catálogo de Parámetros</h3>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: '1' }}>
            <div className="form-group">
              <label className="form-label">Seleccionar Parámetro a Editar</label>
              <select
                className="form-control"
                value={selectedParamType}
                onChange={(e) => {
                  setSelectedParamType(e.target.value);
                  setParamError('');
                }}
              >
                <option value="categories">Categorías ({params.categories.length})</option>
                <option value="lines">Líneas ({params.lines.length})</option>
                <option value="styles">Estilo-Detalles ({params.styles.length})</option>
                <option value="genders">Géneros ({params.genders.length})</option>
                <option value="colors">Colores ({params.colors.length})</option>
                <option value="sizes">Tallas ({params.sizes.length})</option>
                <option value="providers">Proveedores ({params.providers.length})</option>
              </select>
            </div>

            {paramError && (
              <div className="alert alert-error">
                <span>⚠️</span> <span>{paramError}</span>
              </div>
            )}

            <form onSubmit={handleAddParameter} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="form-control"
                placeholder={`Añadir nuevo valor a ${selectedParamType}...`}
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Agregar</button>
            </form>

            <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>ID Asignado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(params[selectedParamType] || []).length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos.</td>
                    </tr>
                  ) : (
                    (params[selectedParamType] || []).map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</td>
                        <td><code>{item.id}</code></td>
                        <td style={{ textAlign: 'center' }}>
                          {item.id !== 0 && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteParameter(item.id)}>
                              🗑️ Eliminar
                            </button>
                          )}
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
    </div>
  );
}
