import React, { useState, useEffect } from 'react';
import { purchaseService } from '../services/PurchaseService';
import { inventoryService } from '../services/InventoryService';
import { storageRepository } from '../services/StorageRepository';

export default function Purchases({ user, onPurchaseSuccess }) {
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  
  // Search state to bind to existing product
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form input fields
  const [formData, setFormData] = useState({
    barcode: '',
    sku: '',
    name: '',
    provider: '',
    quantity: 1,
    costPrice: 0,
    sellPrice: 0,
    line: '',
    category: '',
    gender: '',
    style: '',
    color: '',
    size: ''
  });

  // UX states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPurchaseHistory(purchaseService.getAll());
    setProductsList(inventoryService.getAll());
    setParams(storageRepository.getParams());
  };

  const handleProductSearchSelect = (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setFormData({
      barcode: product.barcode,
      sku: product.sku,
      name: product.name,
      provider: product.provider,
      quantity: 1,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      line: product.line,
      category: product.category,
      gender: product.gender,
      style: product.style,
      color: product.color,
      size: product.size
    });
    setError('');
  };

  const handleResetForm = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setFormData({
      barcode: '',
      sku: '',
      name: '',
      provider: params.providers[0]?.name || '',
      quantity: 1,
      costPrice: 0,
      sellPrice: 0,
      line: params.lines[0]?.name || '',
      category: params.categories[0]?.name || '',
      gender: params.genders[0]?.name || '',
      style: params.styles[0]?.name || '',
      color: params.colors[0]?.name || '',
      size: params.sizes[0]?.name || ''
    });
    setError('');
  };

  const handleAutocompleteChange = (val) => {
    setSearchQuery(val);
    const matched = productsList.find(p => p.name.toLowerCase() === val.toLowerCase().trim() || p.barcode === val.trim() || p.sku === val.trim());
    if (matched) {
      handleProductSearchSelect(matched);
    } else {
      setSelectedProduct(null);
      setFormData(prev => ({
        ...prev,
        barcode: val.startsWith('BE-') || /^\d+$/.test(val) ? val : prev.barcode,
        name: !val.startsWith('BE-') && !/^\d+$/.test(val) ? val : prev.name
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (formData.quantity <= 0) {
      setError('La cantidad debe ser mayor que 0.');
      return;
    }
    if (formData.costPrice <= 0) {
      setError('El costo de compra debe ser mayor que 0.');
      return;
    }

    try {
      purchaseService.registerPurchase({
        items: [formData],
        provider: formData.provider
      });

      setSuccess(`Compra registrada con éxito para "${formData.name}".`);
      handleResetForm();
      loadData();
      onPurchaseSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar la compra.');
    }
  };

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Registration Form Card */}
      <div className="card-table-wrapper" style={{ padding: '32px' }}>
        <h3 className="card-title" style={{ marginBottom: '20px' }}>📦 Registrar Entrada de Mercancía</h3>
        
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <span>✅</span> <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Autocomplete Input */}
          <div className="form-group">
            <label className="form-label">Buscar Producto Existente (por Nombre, Código Barras o SKU)</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Escribe para buscar..."
                list="productsSearchList"
                value={searchQuery}
                onChange={(e) => handleAutocompleteChange(e.target.value)}
              />
              <datalist id="productsSearchList">
                {productsList.map(p => (
                  <option key={p.id} value={p.name}>{p.sku} | Barcode: {p.barcode}</option>
                ))}
              </datalist>
              {(selectedProduct || searchQuery) && (
                <button type="button" className="btn btn-outline" onClick={handleResetForm}>
                  Limpiar / Nuevo
                </button>
              )}
            </div>
            {selectedProduct ? (
              <span className="badge success" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                ✓ Producto Encontrado en Inventario (Stock actual: {selectedProduct.stock} uds)
              </span>
            ) : (
              <span className="badge warning" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                ⚡ Registrando Producto Nuevo (No existe en base de datos)
              </span>
            )}
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Código de Barras</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. 1143"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                disabled={!!selectedProduct}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. SKU-1004"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={!!selectedProduct}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. JEANS DAMA 4 BOTONES TALLA 10"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!!selectedProduct}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Cantidad Comprada</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Costo Unidad (Compra)</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Precio Sugerido Venta</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          {/* New product attributes (only visible when registering a new product) */}
          {!selectedProduct && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '16px', fontWeight: '700', textTransform: 'uppercase' }}>
                Atributos Adicionales del Producto Nuevo
              </span>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Línea</label>
                  <input
                    type="text"
                    className="form-control"
                    list="linesList"
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
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  />
                  <datalist id="gendersList">
                    {params.genders.map(g => <option key={g.id} value={g.name} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid-3" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Talla</label>
                  <input
                    type="text"
                    className="form-control"
                    list="sizesList"
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
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <datalist id="colorsList">
                    {params.colors.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Estilo / Detalle</label>
                  <input
                    type="text"
                    className="form-control"
                    list="stylesList"
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  />
                  <datalist id="stylesList">
                    {params.styles.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label">Proveedor / Marca</label>
            <input
              type="text"
              className="form-control"
              list="providersList"
              placeholder="Ej. R TREIK"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            />
            <datalist id="providersList">
              {params.providers.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '12px 24px' }}>
            📥 Ingresar Compra al Inventario
          </button>
        </form>
      </div>

      {/* History Log Card */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <div>
            <h3 className="card-title font-sans">Historial de Compras (Entradas)</h3>
            <span className="card-subtitle">Registro cronológico de importación</span>
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: '380px' }}>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código/SKU</th>
                <th>Producto</th>
                <th>Proveedor</th>
                <th>Cantidad</th>
                <th>Costo Unit.</th>
                <th>Total Compra</th>
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de compras.
                  </td>
                </tr>
              ) : (
                purchaseHistory.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.date}</code></td>
                    <td><code>{p.barcode}</code></td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>{p.provider}</td>
                    <td>
                      <span className="badge primary">{p.quantity} uds</span>
                    </td>
                    <td>{formatCOP(p.costPrice)}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: '700' }}>
                      {formatCOP(p.totalPrice)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
