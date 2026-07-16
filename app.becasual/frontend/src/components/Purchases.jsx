import React, { useState, useEffect } from 'react';
import { purchaseService } from '../services/PurchaseService';
import { inventoryService } from '../services/InventoryService';
import { storageRepository } from '../services/StorageRepository';
import { CsvHelper } from '../services/CsvHelper';

export default function Purchases({ user, onPurchaseSuccess, currentStoreId }) {
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [params, setParams] = useState({ lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] });
  
  // Navigation tab
  const [activeSubTab, setActiveSubTab] = useState('individual'); // 'individual' | 'batch'

  // Search state to bind to existing product (Single entry)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form input fields (Single entry)
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
    size: '',
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  });

  const [purchaseBatch, setPurchaseBatch] = useState([]);
  const [batchProvider, setBatchProvider] = useState('');
  const [batchDate, setBatchDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const ITEMS_PER_PAGE = 10;
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchFormData, setBatchFormData] = useState({
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

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const PURCHASE_COLUMNS = [
    { label: 'Fecha', key: 'date' },
    { label: 'Codigo de Barras', key: 'barcode' },
    { label: 'SKU', key: 'sku' },
    { label: 'Nombre Producto', key: 'name' },
    { label: 'Proveedor', key: 'provider' },
    { label: 'Cantidad', key: 'quantity' },
    { label: 'Precio Costo', key: 'costPrice' },
    { label: 'Precio Venta', key: 'sellPrice' },
    { label: 'Linea', key: 'line' },
    { label: 'Categoria', key: 'category' },
    { label: 'Genero', key: 'gender' },
    { label: 'Estilo', key: 'style' },
    { label: 'Color', key: 'color' },
    { label: 'Talla', key: 'size' }
  ];

  const handleExportCSV = () => {
    const csvContent = CsvHelper.jsonToCsv(purchaseHistory, PURCHASE_COLUMNS);
    CsvHelper.download(csvContent, 'compras_becasual.csv');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        date: new Date().toISOString().split('T')[0], barcode: '7701234567890', sku: 'JEAN-SLIM-01',
        name: 'Jeans Slim Fit Azul', provider: 'Nacional S.A.', quantity: '10',
        costPrice: '45000', sellPrice: '89000', line: 'Casual', category: 'Jeans',
        gender: 'Masculino', style: 'Slim', color: 'Azul Claro', size: '32'
      }
    ];
    const csvContent = CsvHelper.jsonToCsv(templateData, PURCHASE_COLUMNS);
    CsvHelper.download(csvContent, 'plantilla_compras.csv');
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
        const parsed = CsvHelper.csvToJson(text, PURCHASE_COLUMNS);
        if (parsed.length === 0) {
          setError('El archivo CSV está vacío o no tiene el formato correcto.');
          return;
        }

        const targetStoreId = currentStoreId === 'all' ? 'store_1' : currentStoreId;
        const itemsToRegister = [];

        parsed.forEach(row => {
          if (!row.name || !row.name.trim()) return;
          const qty = Number(row.quantity);
          const cost = Number(row.costPrice);
          if (isNaN(qty) || qty <= 0) return;
          if (isNaN(cost) || cost <= 0) return;

          itemsToRegister.push({
            barcode: (row.barcode || '').trim(),
            sku: (row.sku || '').trim(),
            name: row.name.trim(),
            provider: (row.provider || '').trim() || '-',
            quantity: qty,
            costPrice: cost,
            sellPrice: Number(row.sellPrice) || 0,
            line: (row.line || '').trim() || '-',
            category: (row.category || '').trim() || '-',
            gender: (row.gender || '').trim() || '-',
            style: (row.style || '').trim() || '-',
            color: (row.color || '').trim() || '-',
            size: (row.size || '').trim() || '-'
          });
        });

        if (itemsToRegister.length > 0) {
          const batchProv = itemsToRegister[0].provider || 'Cargue Masivo CSV';
          purchaseService.registerPurchase({
            items: itemsToRegister,
            provider: batchProv
          }, targetStoreId);

          loadData();
          onPurchaseSuccess();
          setSuccess(`Se importaron ${itemsToRegister.length} registros de compra de forma masiva e ingresaron al inventario.`);
        } else {
          setError('No se agregaron registros de compra válidos.');
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  useEffect(() => {
    loadData();
  }, [currentStoreId]);

  const loadData = () => {
    setPurchaseHistory(purchaseService.getAll(currentStoreId));
    setProductsList(inventoryService.getAll(currentStoreId));
    setParams(storageRepository.getParams());
    setCurrentPage(1);
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
      size: params.sizes[0]?.name || '',
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
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
      }, currentStoreId);

      setSuccess(`Compra registrada con éxito para "${formData.name}".`);
      handleResetForm();
      loadData();
      onPurchaseSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar la compra.');
    }
  };

  const handleResetBatchForm = () => {
    setSelectedProductForBatch(null);
    setBatchSearchQuery('');
    setBatchFormData({
      barcode: '',
      sku: '',
      name: '',
      provider: batchProvider || params.providers[0]?.name || '',
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
  };

  const handleBatchProductSearchSelect = (product) => {
    setSelectedProductForBatch(product);
    setBatchSearchQuery(product.name);
    setBatchFormData({
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
  };

  const handleBatchAutocompleteChange = (val) => {
    setBatchSearchQuery(val);
    const matched = productsList.find(p => p.name.toLowerCase() === val.toLowerCase().trim() || p.barcode === val.trim() || p.sku === val.trim());
    if (matched) {
      handleBatchProductSearchSelect(matched);
    } else {
      setSelectedProductForBatch(null);
      setBatchFormData(prev => ({
        ...prev,
        barcode: val.startsWith('BE-') || /^\d+$/.test(val) ? val : prev.barcode,
        name: !val.startsWith('BE-') && !/^\d+$/.test(val) ? val : prev.name
      }));
    }
  };

  const handleAddProductToBatch = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!batchFormData.name.trim()) {
      setError('El nombre del producto es obligatorio para agregarlo al lote.');
      return;
    }
    if (batchFormData.quantity <= 0) {
      setError('La cantidad debe ser mayor que 0.');
      return;
    }
    if (batchFormData.costPrice <= 0) {
      setError('El costo de compra debe ser mayor que 0.');
      return;
    }

    const itemToAdd = {
      ...batchFormData,
      provider: batchFormData.provider || batchProvider || '-'
    };

    setPurchaseBatch([...purchaseBatch, itemToAdd]);
    
    if (!batchProvider && itemToAdd.provider && itemToAdd.provider !== '-') {
      setBatchProvider(itemToAdd.provider);
    }

    setSelectedProductForBatch(null);
    setBatchSearchQuery('');
    setBatchFormData({
      barcode: '',
      sku: '',
      name: '',
      provider: batchProvider || itemToAdd.provider || params.providers[0]?.name || '',
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

    setSuccess('Producto agregado al lote temporal.');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleRemoveProductFromBatch = (index) => {
    setPurchaseBatch(purchaseBatch.filter((_, idx) => idx !== index));
  };

  const handleSubmitBatch = () => {
    setError('');
    setSuccess('');

    if (purchaseBatch.length === 0) {
      setError('El lote de compras está vacío.');
      return;
    }

    try {
      const targetStoreId = currentStoreId === 'all' ? 'store_1' : currentStoreId;
      
      // Asignar la fecha seleccionada del lote a cada item antes de registrar
      const batchItemsWithDate = purchaseBatch.map(item => ({
        ...item,
        date: batchDate
      }));

      purchaseService.registerPurchase({
        items: batchItemsWithDate,
        provider: batchProvider || 'Ingreso Masivo Manual'
      }, targetStoreId);

      setSuccess(`Lote de compra con ${purchaseBatch.length} artículos registrado con éxito.`);
      setPurchaseBatch([]);
      setBatchProvider('');
      loadData();
      onPurchaseSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar el lote de compra.');
    }
  };

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPurchaseDate = (dateStr) => {
    if (!dateStr) return '—';
    if (dateStr.length === 10) return dateStr;
    if (dateStr.includes('T')) {
      const [datePart, timePart] = dateStr.split('T');
      if (timePart.startsWith('00:00:00')) {
        return datePart;
      }
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return datePart;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return datePart;
      }
    }
    return dateStr;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' 🔼' : ' 🔽';
  };

  const getSortedPurchases = () => {
    return [...purchaseHistory].sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = a.date || '';
        valB = b.date || '';
      } else if (sortField === 'name') {
        valA = a.name ? a.name.toLowerCase() : '';
        valB = b.name ? b.name.toLowerCase() : '';
      } else if (sortField === 'quantity') {
        valA = Number(a.quantity) || 0;
        valB = Number(b.quantity) || 0;
      } else {
        return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedHistory = getSortedPurchases();
  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Acciones Masivas */}
      <div className="card-table-wrapper" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-body)', border: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📦</span>
          <div>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Acciones Masivas de Compras</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carga o descarga de registros de compra en lote (Sede: {currentStoreId === 'all' ? 'Principal (Defecto)' : 'Tienda actual'})</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>📥 Exportar CSV</button>
          <button className="btn btn-outline btn-sm" onClick={() => document.getElementById('csv-file-input-purchases').click()}>📤 Importar CSV</button>
          <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} style={{ borderStyle: 'dotted' }}>📄 Plantilla</button>
          <input 
            type="file" 
            id="csv-file-input-purchases" 
            accept=".csv" 
            style={{ display: 'none' }} 
            onChange={handleImportCSV} 
          />
        </div>
      </div>

      {/* Registration Form Card */}
      <div className="card-table-wrapper" style={{ padding: '32px' }}>
        <h3 className="card-title" style={{ marginBottom: '12px' }}>📦 Registrar Entrada de Mercancía</h3>
        
        {/* Selector de Pestañas de Registro */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'individual' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveSubTab('individual'); setError(''); setSuccess(''); }}
          >
            📥 Ingreso Individual
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'batch' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveSubTab('batch'); setError(''); setSuccess(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📦 Ingreso Masivo (Lote)
            {purchaseBatch.length > 0 && (
              <span style={{ background: 'var(--danger)', color: 'white', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                {purchaseBatch.length}
              </span>
            )}
          </button>
        </div>
        
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

        {activeSubTab === 'individual' ? (
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

            <div className="grid-2" style={{ marginTop: '10px' }}>
              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label">Fecha de Compra</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '12px 24px' }}>
              📥 Ingresar Compra al Inventario
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Proveedor General del Lote */}
            <div className="form-group" style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div className="grid-2">
                <div>
                  <label className="form-label" style={{ fontWeight: '700' }}>Proveedor de este Lote / Factura</label>
                  <input
                    type="text"
                    className="form-control"
                    list="batchProvidersList"
                    placeholder="Escribe el proveedor (ej. R TREIK) que se aplicará al lote"
                    value={batchProvider}
                    onChange={(e) => setBatchProvider(e.target.value)}
                  />
                  <datalist id="batchProvidersList">
                    {params.providers.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: '700' }}>Fecha de este Lote / Factura</label>
                  <input
                    type="date"
                    className="form-control"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Formulario para agregar producto al lote */}
            <form onSubmit={handleAddProductToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '8px', background: 'var(--bg-card-hover)' }}>
              <span style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                ➕ Agregar Artículo al Lote Temporal
              </span>
              
              <div className="form-group">
                <label className="form-label">Buscar Producto Existente (por Nombre, Código Barras o SKU)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe para buscar..."
                    list="batchProductsSearchList"
                    value={batchSearchQuery}
                    onChange={(e) => handleBatchAutocompleteChange(e.target.value)}
                  />
                  <datalist id="batchProductsSearchList">
                    {productsList.map(p => (
                      <option key={p.id} value={p.name}>{p.sku} | Barcode: {p.barcode}</option>
                    ))}
                  </datalist>
                  {(selectedProductForBatch || batchSearchQuery) && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleResetBatchForm}>
                      Limpiar / Nuevo
                    </button>
                  )}
                </div>
                {selectedProductForBatch ? (
                  <span className="badge success" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                    ✓ Producto Encontrado en Inventario (Stock actual: {selectedProductForBatch.stock} uds)
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
                    value={batchFormData.barcode}
                    onChange={(e) => setBatchFormData({ ...batchFormData, barcode: e.target.value })}
                    disabled={!!selectedProductForBatch}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. SKU-1004"
                    value={batchFormData.sku}
                    onChange={(e) => setBatchFormData({ ...batchFormData, sku: e.target.value })}
                    disabled={!!selectedProductForBatch}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. JEANS DAMA 4 BOTONES TALLA 10"
                    value={batchFormData.name}
                    onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
                    disabled={!!selectedProductForBatch}
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
                    value={batchFormData.quantity}
                    onChange={(e) => setBatchFormData({ ...batchFormData, quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo Unidad (Compra)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={batchFormData.costPrice}
                    onChange={(e) => setBatchFormData({ ...batchFormData, costPrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Sugerido Venta</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={batchFormData.sellPrice}
                    onChange={(e) => setBatchFormData({ ...batchFormData, sellPrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {!selectedProductForBatch && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '16px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Atributos Adicionales del Producto Nuevo
                  </span>
                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">Línea</label>
                      <input
                        type="text"
                        className="form-control"
                        list="batchLinesList"
                        value={batchFormData.line}
                        onChange={(e) => setBatchFormData({ ...batchFormData, line: e.target.value })}
                      />
                      <datalist id="batchLinesList">
                        {params.lines.map(l => <option key={l.id} value={l.name} />)}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <input
                        type="text"
                        className="form-control"
                        list="batchCategoriesList"
                        value={batchFormData.category}
                        onChange={(e) => setBatchFormData({ ...batchFormData, category: e.target.value })}
                      />
                      <datalist id="batchCategoriesList">
                        {params.categories.map(c => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Género</label>
                      <input
                        type="text"
                        className="form-control"
                        list="batchGendersList"
                        value={batchFormData.gender}
                        onChange={(e) => setBatchFormData({ ...batchFormData, gender: e.target.value })}
                      />
                      <datalist id="batchGendersList">
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
                        list="batchSizesList"
                        value={batchFormData.size}
                        onChange={(e) => setBatchFormData({ ...batchFormData, size: e.target.value })}
                      />
                      <datalist id="batchSizesList">
                        {params.sizes.map(s => <option key={s.id} value={s.name} />)}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Color</label>
                      <input
                        type="text"
                        className="form-control"
                        list="batchColorsList"
                        value={batchFormData.color}
                        onChange={(e) => setBatchFormData({ ...batchFormData, color: e.target.value })}
                      />
                      <datalist id="batchColorsList">
                        {params.colors.map(c => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estilo / Detalle</label>
                      <input
                        type="text"
                        className="form-control"
                        list="batchStylesList"
                        value={batchFormData.style}
                        onChange={(e) => setBatchFormData({ ...batchFormData, style: e.target.value })}
                      />
                      <datalist id="batchStylesList">
                        {params.styles.map(s => <option key={s.id} value={s.name} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label">Proveedor del Artículo (si difiere del proveedor general)</label>
                <input
                  type="text"
                  className="form-control"
                  list="batchItemProvidersList"
                  placeholder="Ej. R TREIK"
                  value={batchFormData.provider}
                  onChange={(e) => setBatchFormData({ ...batchFormData, provider: e.target.value })}
                />
                <datalist id="batchItemProvidersList">
                  {params.providers.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>

              <button type="submit" className="btn btn-outline" style={{ alignSelf: 'flex-end', padding: '10px 20px' }}>
                ➕ Agregar al Lote Temporal
              </button>
            </form>

            {/* Listado temporal del lote */}
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', display: 'block', marginBottom: '12px', color: 'var(--text-primary)' }}>
                🛒 Artículos en Lote Temporal ({purchaseBatch.length})
              </span>

              {purchaseBatch.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                  📦 No hay productos en el lote temporal. Usa el formulario de arriba para agregar artículos.
                </div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="table-premium" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>SKU / Código</th>
                        <th>Producto</th>
                        <th>Proveedor</th>
                        <th>Cantidad</th>
                        <th>Costo Unit.</th>
                        <th>Total Costo</th>
                        <th>P. Sugerido</th>
                        <th style={{ textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseBatch.map((item, idx) => (
                        <tr key={idx}>
                          <td><code>{item.sku || item.barcode || '-'}</code></td>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</td>
                          <td>{item.provider}</td>
                          <td><span className="badge primary">{item.quantity} uds</span></td>
                          <td>{formatCOP(item.costPrice)}</td>
                          <td style={{ fontWeight: '700', color: 'var(--danger)' }}>{formatCOP(item.costPrice * item.quantity)}</td>
                          <td>{formatCOP(item.sellPrice)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveProductFromBatch(idx)}
                              style={{ padding: '4px 8px' }}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {purchaseBatch.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  background: 'var(--bg-body)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-color)',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div>Artículos Diferentes: <strong>{purchaseBatch.length}</strong></div>
                    <div>Unidades Totales: <strong>{purchaseBatch.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
                    <div style={{ fontSize: '16px', marginTop: '6px', color: 'var(--text-primary)' }}>
                      Inversión Estimada: <strong style={{ color: 'var(--danger)', fontSize: '18px' }}>
                        {formatCOP(purchaseBatch.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0))}
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => { if(window.confirm('¿Deseas vaciar todos los artículos de este lote?')) setPurchaseBatch([]); }}>
                      🗑️ Vaciar Lote
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmitBatch} style={{ padding: '10px 20px' }}>
                      📥 Confirmar y Guardar Lote
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
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
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                  Fecha{getSortIndicator('date')}
                </th>
                {currentStoreId === 'all' && <th>Tienda</th>}
                <th>Código/SKU</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                  Producto{getSortIndicator('name')}
                </th>
                <th>Proveedor</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('quantity')}>
                  Cantidad{getSortIndicator('quantity')}
                </th>
                <th>Costo Unit.</th>
                <th>Total Compra</th>
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.length === 0 ? (
                <tr>
                  <td colSpan={currentStoreId === 'all' ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de compras.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map(p => (
                  <tr key={p.id}>
                    <td><code>{formatPurchaseDate(p.date)}</code></td>
                    {currentStoreId === 'all' && (
                      <td style={{ fontSize: '12px', fontWeight: '600' }}>
                        🏬 {p.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                      </td>
                    )}
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
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-body)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({purchaseHistory.length} registros en total)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                ◀ Anterior
              </button>
              <button 
                type="button"
                className="btn btn-outline btn-sm" 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
