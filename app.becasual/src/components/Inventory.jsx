import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/InventoryService';
import { storageRepository } from '../services/StorageRepository';
import { authService } from '../services/AuthService';
import { CsvHelper } from '../services/CsvHelper';
import { printProductLabels, Barcode128Svg } from '../services/BarcodeService';

export default function Inventory({ user, onDataChange, currentStoreId }) {
  const [products, setProducts] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  
  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGlobalMinStockModalOpen, setIsGlobalMinStockModalOpen] = useState(false);
  const [globalMinStockValue, setGlobalMinStockValue] = useState(5);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalStoreId, setModalStoreId] = useState('store_1');

  // Printing State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState(null);
  const [printCopies, setPrintCopies] = useState(1);
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
  const [success, setSuccess] = useState('');

  const PRODUCT_COLUMNS = [
    { label: 'Codigo de Barras', key: 'barcode' },
    { label: 'SKU', key: 'sku' },
    { label: 'Nombre Producto', key: 'name' },
    { label: 'Stock', key: 'stock' },
    { label: 'Precio Costo', key: 'costPrice' },
    { label: 'Precio Venta', key: 'sellPrice' },
    { label: 'Linea', key: 'line' },
    { label: 'Categoria', key: 'category' },
    { label: 'Genero', key: 'gender' },
    { label: 'Estilo', key: 'style' },
    { label: 'Color', key: 'color' },
    { label: 'Talla', key: 'size' },
    { label: 'Proveedor', key: 'provider' },
    { label: 'Stock Minimo', key: 'minStock' }
  ];

  const handleExportCSV = () => {
    const csvContent = CsvHelper.jsonToCsv(products, PRODUCT_COLUMNS);
    CsvHelper.download(csvContent, 'inventario_becasual.csv');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        barcode: '7701234567890', sku: 'JEAN-SLIM-01', name: 'Jeans Slim Fit Azul', stock: '10',
        costPrice: '45000', sellPrice: '89000', line: 'Casual', category: 'Jeans',
        gender: 'Masculino', style: 'Slim', color: 'Azul Claro', size: '32',
        provider: 'Nacional S.A.', minStock: '5'
      }
    ];
    const csvContent = CsvHelper.jsonToCsv(templateData, PRODUCT_COLUMNS);
    CsvHelper.download(csvContent, 'plantilla_inventario.csv');
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
        const parsed = CsvHelper.csvToJson(text, PRODUCT_COLUMNS);
        if (parsed.length === 0) {
          setError('El archivo CSV está vacío o no tiene el formato correcto.');
          return;
        }

        const allProducts = storageRepository.getProducts();
        let addedCount = 0;
        let updatedCount = 0;
        const targetStoreId = currentStoreId === 'all' ? 'store_1' : currentStoreId;

        parsed.forEach(row => {
          if (!row.name || !row.name.trim()) return;

          const barcodeTrimmed = (row.barcode || '').trim();
          const skuTrimmed = (row.sku || '').trim();

          const existingIdx = allProducts.findIndex(p => 
            (barcodeTrimmed && p.barcode === barcodeTrimmed && (p.storeId === targetStoreId || (!p.storeId && targetStoreId === 'store_1'))) ||
            (skuTrimmed && p.sku === skuTrimmed && (p.storeId === targetStoreId || (!p.storeId && targetStoreId === 'store_1')))
          );

          if (existingIdx !== -1) {
            allProducts[existingIdx].stock += Number(row.stock) || 0;
            if (row.costPrice) allProducts[existingIdx].costPrice = Number(row.costPrice) || allProducts[existingIdx].costPrice;
            if (row.sellPrice) allProducts[existingIdx].sellPrice = Number(row.sellPrice) || allProducts[existingIdx].sellPrice;
            updatedCount++;
          } else {
            const finalBarcode = barcodeTrimmed ? barcodeTrimmed : `BE-${Math.floor(100000 + Math.random() * 900000)}`;
            const finalSku = skuTrimmed ? skuTrimmed : `SKU-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

            allProducts.unshift({
              id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              storeId: targetStoreId,
              barcode: finalBarcode,
              sku: finalSku,
              name: row.name.trim(),
              stock: Number(row.stock) || 0,
              costPrice: Number(row.costPrice) || 0,
              sellPrice: Number(row.sellPrice) || 0,
              line: row.line?.trim() || '-',
              category: row.category?.trim() || '-',
              gender: row.gender?.trim() || '-',
              style: row.style?.trim() || '-',
              color: row.color?.trim() || '-',
              size: row.size?.trim() || '-',
              provider: row.provider?.trim() || '-',
              minStock: Number(row.minStock) || 5
            });
            addedCount++;
          }
        });

        if (addedCount > 0 || updatedCount > 0) {
          storageRepository.saveProducts(allProducts);
          // Sync params
          allProducts.forEach(p => inventoryService.checkAndAddParams(p));
          
          loadProducts();
          onDataChange();
          setSuccess(`Importación completada: ${addedCount} productos nuevos creados y ${updatedCount} actualizados.`);
          // Reload params in screen state
          setParams(storageRepository.getParams());
        } else {
          setError('No se importaron productos (filas vacías o incorrectas).');
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Check editing privileges
  const canEdit = authService.hasPermission(user.role, 'inventory_edit');

  useEffect(() => {
    loadProducts();
    setParams(storageRepository.getParams());
  }, [currentStoreId]);

  const loadProducts = () => {
    const filters = {
      query: searchQuery,
      line: selectedLine,
      category: selectedCategory,
      provider: selectedProvider,
      stockStatus: selectedStockStatus
    };
    const list = inventoryService.search(filters, currentStoreId);
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
    setCurrentPage(1);
  }, [searchQuery, selectedLine, selectedCategory, selectedProvider, selectedStockStatus, currentStoreId]);

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleApplyGlobalMinStock = (e) => {
    e.preventDefault();
    try {
      inventoryService.updateGlobalMinStock(globalMinStockValue);
      loadProducts();
      setIsGlobalMinStockModalOpen(false);
      setSuccess(`Se configuró el stock mínimo a ${globalMinStockValue} para todos los productos con éxito.`);
      if (onDataChange) onDataChange();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Error al actualizar el stock mínimo global.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setModalStoreId(currentStoreId === 'all' ? 'store_1' : currentStoreId);
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

  const handleOpenPrintModal = (product) => {
    setSelectedProductForPrint(product);
    setPrintCopies(product.stock > 0 ? product.stock : 1);
    setIsPrintModalOpen(true);
  };

  const handleTriggerPrint = () => {
    if (!selectedProductForPrint) return;
    printProductLabels(selectedProductForPrint, printCopies);
    setIsPrintModalOpen(false);
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
        inventoryService.create(formData, modalStoreId);
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
  const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

      {/* Acciones Masivas */}
      {canEdit && (
        <div className="card-table-wrapper" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-body)', border: '1px dashed var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <div>
              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Acciones Masivas de Inventario</span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carga o descarga de inventario en lote por archivos CSV (Sede: {currentStoreId === 'all' ? 'Principal (Defecto)' : 'Tienda actual'})</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setIsGlobalMinStockModalOpen(true)}>⚙️ Mínimo Global</button>
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
      )}

      {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}
      {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

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
                {currentStoreId === 'all' && <th>Tienda</th>}
                <th>Código de Barras</th>
                <th>Nombre Producto</th>
                <th>Línea / Cat.</th>
                <th>Talla / Color</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio Venta</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? (currentStoreId === 'all' ? 9 : 8) : (currentStoreId === 'all' ? 8 : 7)} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  let stockBadgeClass = 'success';
                  if (p.stock === 0) stockBadgeClass = 'danger';
                  else if (p.stock <= p.minStock) stockBadgeClass = 'warning';

                  return (
                    <tr key={p.id}>
                      {currentStoreId === 'all' && (
                        <td style={{ fontSize: '12px', fontWeight: '600' }}>
                          🏬 {p.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                        </td>
                      )}
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
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenPrintModal(p)}>
                            🖨️ Etiqueta
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenEditModal(p)}>
                                ✏️ Editar
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                                🗑️ Borrar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {Math.ceil(products.length / ITEMS_PER_PAGE) > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '13px',
            color: 'var(--text-muted)'
          }}>
            <span>
              Mostrando <strong>{Math.min(products.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</strong> a{' '}
              <strong>{Math.min(products.length, currentPage * ITEMS_PER_PAGE)}</strong> de <strong>{products.length}</strong> productos
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 10px' }}
              >
                ◀ Anterior
              </button>
              <span style={{ display: 'flex', alignItems: 'center', px: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Página {currentPage} de {Math.ceil(products.length / ITEMS_PER_PAGE)}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(products.length / ITEMS_PER_PAGE)}
                style={{ padding: '4px 10px' }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
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

                {currentStoreId === 'all' && !editingProduct && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Asignar a Tienda/Sede *</label>
                    <select
                      className="form-control"
                      value={modalStoreId}
                      onChange={(e) => setModalStoreId(e.target.value)}
                      required
                    >
                      <option value="store_1">🏬 Sede Principal</option>
                      <option value="store_2">🏬 Sede Centro</option>
                    </select>
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

      {/* Modal de Impresión de Etiquetas */}
      {isPrintModalOpen && selectedProductForPrint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🖨️ Imprimir Etiqueta de Producto</h3>
              <button className="modal-close" onClick={() => setIsPrintModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Vista previa a escala de la etiqueta (32x25mm) */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Vista Previa de la Etiqueta (32mm x 25mm)
                </span>
                
                {/* Contenedor simulador de etiqueta física */}
                <div style={{
                  width: '224px',
                  height: '175px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  boxSizing: 'border-box',
                  background: 'white',
                  color: 'black',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '0 auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontFamily: 'sans-serif'
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                    {selectedProductForPrint.name.toUpperCase()}
                  </div>
                  
                  <div style={{ width: '100%', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} dangerouslySetInnerHTML={{
                    __html: new Barcode128Svg(selectedProductForPrint.sku || selectedProductForPrint.barcode || '', 1.0, 35).toString()
                  }} />
                  
                  <div style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '-4px' }}>
                    {selectedProductForPrint.sku || selectedProductForPrint.barcode}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '0.5px dashed black', paddingTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    <span>{formatCOP(selectedProductForPrint.sellPrice)}</span>
                    <span style={{ background: 'black', color: 'white', padding: '1px 4px', borderRadius: '2px', fontSize: '8px' }}>
                      TALLA: {selectedProductForPrint.size || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de copias */}
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>Cantidad de etiquetas a imprimir:</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={printCopies}
                  onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Sugerido basado en stock: {selectedProductForPrint.stock} unidades. Cada copia se imprimirá en una página separada para impresoras térmicas de rollo.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setIsPrintModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleTriggerPrint}>
                🖨️ Generar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuración Mínimo Global */}
      {isGlobalMinStockModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">⚙️ Stock Mínimo Global</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configurar para todos los productos</span>
              </div>
              <button className="modal-close" onClick={() => setIsGlobalMinStockModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleApplyGlobalMinStock}>
              <div className="modal-body" style={{ padding: '24px 0' }}>
                <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Esta acción actualizará el <strong>Stock Mínimo de Alerta</strong> de todos los productos en el inventario al valor especificado.
                  </p>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '600' }}>Nuevo Stock Mínimo:</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={globalMinStockValue}
                      onChange={(e) => setGlobalMinStockValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsGlobalMinStockModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Aplicar a Todo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
