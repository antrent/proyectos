import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/InventoryService';
import { storageRepository } from '../services/StorageRepository';
import { authService } from '../services/AuthService';

export default function Inventory({ user, onDataChange }) {
  const [products, setProducts] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  
  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    barcode: '',
    sku: '',
    name: '',
    stock: 0,
    costPrice: 0,
    sellPrice: 0,
    line: '',
    category: '',
    gender: '',
    style: '',
    color: '',
    size: '',
    provider: '',
    minStock: 5
  });
  const [error, setError] = useState('');

  // Check editing privileges
  const canEdit = authService.hasPermission(user.role, 'inventory_edit');

  useEffect(() => {
    loadProducts();
    setParams(storageRepository.getParams());
  }, []);

  const loadProducts = () => {
    const filters = {
      query: searchQuery,
      line: selectedLine,
      category: selectedCategory,
      provider: selectedProvider,
      stockStatus: selectedStockStatus
    };
    const list = inventoryService.search(filters);
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedLine, selectedCategory, selectedProvider, selectedStockStatus]);

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      barcode: '',
      sku: '',
      name: '',
      stock: 0,
      costPrice: 0,
      sellPrice: 0,
      line: params.lines[0]?.name || '',
      category: params.categories[0]?.name || '',
      gender: params.genders[0]?.name || '',
      style: params.styles[0]?.name || '',
      color: params.colors[0]?.name || '',
      size: params.sizes[0]?.name || '',
      provider: params.providers[0]?.name || '',
      minStock: 5
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setFormData({ ...p });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto del inventario?')) {
      try {
        inventoryService.delete(id);
        loadProducts();
        onDataChange();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }

    try {
      if (editingProduct) {
        inventoryService.update(editingProduct.id, formData);
      } else {
        inventoryService.create(formData);
      }
      setIsModalOpen(false);
      loadProducts();
      onDataChange();
      // Reload params just in case custom values were added dynamically
      setParams(storageRepository.getParams());
    } catch (err) {
      setError(err.message || 'Error al guardar el producto.');
    }
  };

  // Export full backup of current state
  const handleExportDB = () => {
    const fullDB = {
      config: storageRepository.getConfig(),
      params: storageRepository.getParams(),
      products: storageRepository.getProducts(),
      purchases: storageRepository.getPurchases(),
      sales: storageRepository.getSales(),
      users: storageRepository.getUsers()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDB, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `becasual_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Search and Filters Bar */}
      <div className="card-table-wrapper" style={{ padding: '24px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Buscar por nombre, SKU o código de barras..."
            style={{ flex: '1', minWidth: '280px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
          >
            <option value="">-- Línea --</option>
            {params.lines.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>

          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">-- Categoría --</option>
            {params.categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="">-- Proveedor --</option>
            {params.providers.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select 
            className="form-control" 
            style={{ width: '160px' }}
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
          >
            <option value="all">Stock: Todos</option>
            <option value="in">En Stock</option>
            <option value="low">Stock Crítico</option>
            <option value="out">Sin Stock</option>
          </select>

          {canEdit && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              ➕ Nuevo Producto
            </button>
          )}

          <button className="btn btn-outline" onClick={handleExportDB} title="Exportar Base de Datos">
            💾 Copia Seguridad
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <div>
            <h3 className="card-title">Listado de Inventario</h3>
            <span className="card-subtitle">Mostrando {products.length} productos coincidentes</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Código de Barras</th>
                <th>Nombre Producto</th>
                <th>Línea / Cat.</th>
                <th>Talla / Color</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio Venta</th>
                {canEdit && <th style={{ textAlign: 'center' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  let stockBadgeClass = 'success';
                  if (p.stock === 0) stockBadgeClass = 'danger';
                  else if (p.stock <= p.minStock) stockBadgeClass = 'warning';

                  return (
                    <tr key={p.id}>
                      <td><code>{p.barcode}</code></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.sku} | Prov: {p.provider}</span>
                        </div>
                      </td>
                      <td>{p.line} / {p.category}</td>
                      <td>Talla {p.size} | {p.color}</td>
                      <td>
                        <span className={`badge ${stockBadgeClass}`}>
                          {p.stock} uds
                        </span>
                      </td>
                      <td>{formatCOP(p.costPrice)}</td>
                      <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {formatCOP(p.sellPrice)}
                      </td>
                      {canEdit && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditModal(p)}>
                              ✏️ Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                              🗑️ Borrar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Window */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Código de Barras (Opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Autogenerar si queda vacío"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU (Opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Autogenerar si queda vacío"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Jeans Slim Fit Celeste"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Stock Inicial</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Costo Unidad</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Venta</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Línea</label>
                    <input
                      type="text"
                      className="form-control"
                      list="linesList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.line}
                      onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    />
                    <datalist id="linesList">
                      {params.lines.map(l => <option key={l.id} value={l.name} />)}
                    </datalist>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <input
                      type="text"
                      className="form-control"
                      list="categoriesList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="categoriesList">
                      {params.categories.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Género</label>
                    <input
                      type="text"
                      className="form-control"
                      list="gendersList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    />
                    <datalist id="gendersList">
                      {params.genders.map(g => <option key={g.id} value={g.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Talla</label>
                    <input
                      type="text"
                      className="form-control"
                      list="sizesList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                    <datalist id="sizesList">
                      {params.sizes.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      className="form-control"
                      list="colorsList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                    <datalist id="colorsList">
                      {params.colors.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Proveedor</label>
                    <input
                      type="text"
                      className="form-control"
                      list="providersList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    />
                    <datalist id="providersList">
                      {params.providers.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Estilo / Detalle</label>
                    <input
                      type="text"
                      className="form-control"
                      list="stylesList"
                      placeholder="Seleccionar o escribir..."
                      value={formData.style}
                      onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    />
                    <datalist id="stylesList">
                      {params.styles.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Mínimo de Alerta</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
