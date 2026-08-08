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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [historySearch, setHistorySearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    name: '',
    provider: '',
    quantity: 1,
    costPrice: 0,
    sellPrice: 0
  });
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
  const [toastNotification, setToastNotification] = useState({ show: false, title: '', message: '', type: 'success' });

  const triggerToast = (title, message, type = 'success', durationMs = 4000) => {
    setToastNotification({ show: true, title, message, type });
    if (durationMs > 0) {
      setTimeout(() => {
        setToastNotification(prev => ({ ...prev, show: false }));
      }, durationMs);
    }
  };

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

  const computeProductName = (category, gender, style, size, color) => {
    const parts = [
      category || '',
      gender || '',
      style || '',
      size ? `TALLA ${size}` : '',
      color || ''
    ].map(s => String(s).trim()).filter(Boolean);

    return parts.join(' ').toUpperCase() || 'PRODUCTO NUEVO';
  };

  const computeAttributesCode = (line, category, gender, size, color, style) => {
    const idLinea = (params.lines || []).find(x => String(x.name).toUpperCase() === String(line).toUpperCase())?.id ?? '';
    const idCat = (params.categories || []).find(x => String(x.name).toUpperCase() === String(category).toUpperCase())?.id ?? '';
    const idGen = (params.genders || []).find(x => String(x.name).toUpperCase() === String(gender).toUpperCase())?.id ?? '';
    const idSize = (params.sizes || []).find(x => String(x.name).toUpperCase() === String(size).toUpperCase())?.id ?? '';
    const idCol = (params.colors || []).find(x => String(x.name).toUpperCase() === String(color).toUpperCase())?.id ?? '';
    const idStyle = (params.styles || []).find(x => String(x.name).toUpperCase() === String(style).toUpperCase())?.id ?? '';

    // Concatenar IDs como string y limpiar caracteres no numéricos
    const rawCode = `${idLinea}${idCat}${idGen}${idSize}${idCol}${idStyle}`.replace(/\D/g, '');
    
    if (!rawCode) return '';
    return rawCode.slice(0, 15);
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
      size: product.size,
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    });
    setError('');
  };

  const handleResetForm = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    const defaultLine = params.lines[0]?.name || '';
    const defaultCat = params.categories[0]?.name || '';
    const defaultGen = params.genders[0]?.name || '';
    const defaultStyle = params.styles[0]?.name || '';
    const defaultColor = params.colors[0]?.name || '';
    const defaultSize = params.sizes[0]?.name || '';
    const initialName = computeProductName(defaultCat, defaultGen, defaultStyle, defaultSize, defaultColor);
    const initialCode = computeAttributesCode(defaultLine, defaultCat, defaultGen, defaultSize, defaultColor, defaultStyle);

    setFormData({
      barcode: initialCode,
      sku: initialCode,
      name: initialName,
      provider: params.providers[0]?.name || '',
      quantity: 1,
      costPrice: 0,
      sellPrice: 0,
      line: defaultLine,
      category: defaultCat,
      gender: defaultGen,
      style: defaultStyle,
      color: defaultColor,
      size: defaultSize,
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    });
    setError('');
  };

  const updateFormAttribute = (field, rawValue) => {
    const value = String(rawValue || '').toUpperCase();
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (!selectedProduct) {
        updated.name = computeProductName(
          field === 'category' ? value : updated.category,
          field === 'gender' ? value : updated.gender,
          field === 'style' ? value : updated.style,
          field === 'size' ? value : updated.size,
          field === 'color' ? value : updated.color
        );

        const code = computeAttributesCode(
          field === 'line' ? value : updated.line,
          field === 'category' ? value : updated.category,
          field === 'gender' ? value : updated.gender,
          field === 'size' ? value : updated.size,
          field === 'color' ? value : updated.color,
          field === 'style' ? value : updated.style
        );
        updated.barcode = code;
        updated.sku = code;
      }
      return updated;
    });
  };

  const updateBatchFormAttribute = (field, rawValue) => {
    const value = String(rawValue || '').toUpperCase();
    setBatchFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (!selectedProductForBatch) {
        updated.name = computeProductName(
          field === 'category' ? value : updated.category,
          field === 'gender' ? value : updated.gender,
          field === 'style' ? value : updated.style,
          field === 'size' ? value : updated.size,
          field === 'color' ? value : updated.color
        );

        const code = computeAttributesCode(
          field === 'line' ? value : updated.line,
          field === 'category' ? value : updated.category,
          field === 'gender' ? value : updated.gender,
          field === 'size' ? value : updated.size,
          field === 'color' ? value : updated.color,
          field === 'style' ? value : updated.style
        );
        updated.barcode = code;
        updated.sku = code;
      }
      return updated;
    });
  };

  const handleCostPriceChange = (isBatch, costVal) => {
    const cost = Math.max(0, parseFloat(costVal) || 0);
    if (isBatch) {
      setBatchFormData(prev => {
        const margin = parseFloat(prev.marginPercent) || 0;
        const sell = margin > 0 ? Math.round(cost * (1 + margin / 100)) : prev.sellPrice;
        return { ...prev, costPrice: costVal, sellPrice: sell };
      });
    } else {
      setFormData(prev => {
        const margin = parseFloat(prev.marginPercent) || 0;
        const sell = margin > 0 ? Math.round(cost * (1 + margin / 100)) : prev.sellPrice;
        return { ...prev, costPrice: costVal, sellPrice: sell };
      });
    }
  };

  const handleMarginChange = (isBatch, marginVal) => {
    const margin = parseFloat(marginVal) || 0;
    if (isBatch) {
      setBatchFormData(prev => {
        const cost = parseFloat(prev.costPrice) || 0;
        const sell = cost > 0 ? Math.round(cost * (1 + margin / 100)) : prev.sellPrice;
        return { ...prev, marginPercent: marginVal, sellPrice: sell };
      });
    } else {
      setFormData(prev => {
        const cost = parseFloat(prev.costPrice) || 0;
        const sell = cost > 0 ? Math.round(cost * (1 + margin / 100)) : prev.sellPrice;
        return { ...prev, marginPercent: marginVal, sellPrice: sell };
      });
    }
  };

  const handleSellPriceChange = (isBatch, sellVal) => {
    const sell = Math.max(0, parseFloat(sellVal) || 0);
    if (isBatch) {
      setBatchFormData(prev => {
        const cost = parseFloat(prev.costPrice) || 0;
        const margin = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
        return { ...prev, sellPrice: sellVal, marginPercent: margin > 0 ? margin : '' };
      });
    } else {
      setFormData(prev => {
        const cost = parseFloat(prev.costPrice) || 0;
        const margin = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
        return { ...prev, sellPrice: sellVal, marginPercent: margin > 0 ? margin : '' };
      });
    }
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

      triggerToast('¡Compra Ingresada al Inventario!', `La compra de "${formData.name}" por ${formData.quantity} unidad(es) ha sido registrada exitosamente.`, 'success', 4000);
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
    const defaultLine = params.lines[0]?.name || '';
    const defaultCat = params.categories[0]?.name || '';
    const defaultGen = params.genders[0]?.name || '';
    const defaultStyle = params.styles[0]?.name || '';
    const defaultColor = params.colors[0]?.name || '';
    const defaultSize = params.sizes[0]?.name || '';
    const initialName = computeProductName(defaultCat, defaultGen, defaultStyle, defaultSize, defaultColor);
    const initialCode = computeAttributesCode(defaultLine, defaultCat, defaultGen, defaultSize, defaultColor, defaultStyle);

    setBatchFormData({
      barcode: initialCode,
      sku: initialCode,
      name: initialName,
      provider: batchProvider || params.providers[0]?.name || '',
      quantity: 1,
      costPrice: 0,
      sellPrice: 0,
      line: defaultLine,
      category: defaultCat,
      gender: defaultGen,
      style: defaultStyle,
      color: defaultColor,
      size: defaultSize
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

      triggerToast('¡Lote de Compras Ingresado!', `Se han ingresado ${purchaseBatch.length} artículos al inventario con éxito.`, 'success', 4000);
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

  const handleDeletePurchase = (purchase) => {
    if (!window.confirm(`¿Estás seguro de eliminar la compra de "${purchase.name}"? Se descontarán ${purchase.quantity} unidades del inventario.`)) {
      return;
    }
    try {
      purchaseService.deletePurchase(purchase.id);
      setSuccess(`Compra de "${purchase.name}" eliminada y stock revertido con éxito.`);
      loadData();
      if (onPurchaseSuccess) onPurchaseSuccess();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Error al eliminar la compra.');
    }
  };

  const handleOpenEditModal = (purchase) => {
    setPurchaseToEdit(purchase);
    setEditFormData({
      date: (purchase.date || '').split('T')[0],
      name: purchase.name || '',
      provider: purchase.provider || '',
      quantity: purchase.quantity || 1,
      costPrice: purchase.costPrice || 0,
      sellPrice: purchase.sellPrice || 0
    });
    setEditModalOpen(true);
  };

  const handleSaveEditPurchase = (e) => {
    e.preventDefault();
    setError('');
    if (!purchaseToEdit) return;

    try {
      purchaseService.updatePurchase(purchaseToEdit.id, editFormData);
      setSuccess(`Compra de "${editFormData.name}" actualizada con éxito.`);
      setEditModalOpen(false);
      setPurchaseToEdit(null);
      loadData();
      if (onPurchaseSuccess) onPurchaseSuccess();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Error al actualizar la compra.');
    }
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

  const getFilteredPurchases = () => {
    const q = historySearch.toLowerCase().trim();
    return purchaseHistory.filter(p => {
      const matchSearch = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.provider || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);

      const matchProvider = providerFilter === 'all' || p.provider === providerFilter;
      const pDate = (p.date || '').split('T')[0];
      const matchFrom = !dateFrom || pDate >= dateFrom;
      const matchTo = !dateTo || pDate <= dateTo;

      return matchSearch && matchProvider && matchFrom && matchTo;
    });
  };

  const filteredHistory = getFilteredPurchases();

  const getSortedPurchases = () => {
    return [...filteredHistory].sort((a, b) => {
      let valA, valB;
      if (sortField === 'date') {
        valA = new Date(a.date || 0).getTime();
        valB = new Date(b.date || 0).getTime();
      } else if (sortField === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortField === 'provider') {
        valA = (a.provider || '').toLowerCase();
        valB = (b.provider || '').toLowerCase();
      } else if (sortField === 'quantity') {
        valA = Number(a.quantity) || 0;
        valB = Number(b.quantity) || 0;
      } else if (sortField === 'costPrice') {
        valA = Number(a.costPrice) || 0;
        valB = Number(b.costPrice) || 0;
      } else if (sortField === 'sellPrice') {
        valA = Number(a.sellPrice) || 0;
        valB = Number(b.sellPrice) || 0;
      } else if (sortField === 'totalPrice') {
        valA = Number(a.totalPrice) || 0;
        valB = Number(b.totalPrice) || 0;
      } else {
        return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedHistory = getSortedPurchases();
  const effectiveItemsPerPage = itemsPerPage === 'all' ? sortedHistory.length : Number(itemsPerPage);
  const totalPages = Math.ceil(sortedHistory.length / (effectiveItemsPerPage || 1)) || 1;
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * effectiveItemsPerPage, currentPage * effectiveItemsPerPage);

  const uniqueProviders = Array.from(new Set(purchaseHistory.map(p => p.provider).filter(Boolean)));

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
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Código de Barras</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Autocalculado</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Se autocalcula por atributos"
                  value={formData.barcode}
                  disabled={true}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>SKU</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Autocalculado</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Se autocalcula por atributos"
                  value={formData.sku}
                  disabled={true}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Nombre del Producto</span>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Calculado automáticamente</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  disabled={true}
                  readOnly={true}
                  style={{ background: 'var(--bg-body)', cursor: 'not-allowed', fontWeight: '700', color: 'var(--text-primary)' }}
                  required
                />
              </div>
            </div>

            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}>
                💵 Cantidad, Costos y Precio Sugerido de Venta
              </span>
              <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Cantidad Comprada *</label>
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
                  <label className="form-label">Costo Unidad (Compra) *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    placeholder="Ej. 45000"
                    value={formData.costPrice || ''}
                    onChange={(e) => handleCostPriceChange(false, e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>% Margen Ganancia</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cálculo rápido</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Ej. 50"
                    value={formData.marginPercent ?? ''}
                    onChange={(e) => handleMarginChange(false, e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {[30, 50, 80, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => handleMarginChange(false, pct)}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Precio Sugerido Venta *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    placeholder="Ej. 67500"
                    value={formData.sellPrice || ''}
                    onChange={(e) => handleSellPriceChange(false, e.target.value)}
                    required
                    style={{ fontWeight: '700', color: 'var(--primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Atributos del Producto que forman el Nombre (Siempre visibles en pantalla) */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🏷️ Atributos del Producto (Concatenación Automática de Nombre)
              </span>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Línea *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="linesList"
                    value={formData.line}
                    onChange={(e) => updateFormAttribute('line', e.target.value)}
                  />
                  <datalist id="linesList">
                    {params.lines.map(l => <option key={l.id} value={l.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="categoriesList"
                    value={formData.category}
                    onChange={(e) => updateFormAttribute('category', e.target.value)}
                  />
                  <datalist id="categoriesList">
                    {params.categories.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Género *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="gendersList"
                    value={formData.gender}
                    onChange={(e) => updateFormAttribute('gender', e.target.value)}
                  />
                  <datalist id="gendersList">
                    {params.genders.map(g => <option key={g.id} value={g.name} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid-3" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Talla *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="sizesList"
                    value={formData.size}
                    onChange={(e) => updateFormAttribute('size', e.target.value)}
                  />
                  <datalist id="sizesList">
                    {params.sizes.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Color *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="colorsList"
                    value={formData.color}
                    onChange={(e) => updateFormAttribute('color', e.target.value)}
                  />
                  <datalist id="colorsList">
                    {params.colors.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Estilo / Detalle *</label>
                  <input
                    type="text"
                    className="form-control"
                    list="stylesList"
                    value={formData.style}
                    onChange={(e) => updateFormAttribute('style', e.target.value)}
                  />
                  <datalist id="stylesList">
                    {params.styles.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
              </div>
            </div>

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
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Código de Barras</span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Autocalculado</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Se autocalcula por atributos"
                    value={batchFormData.barcode}
                    disabled={true}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>SKU</span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Autocalculado</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Se autocalcula por atributos"
                    value={batchFormData.sku}
                    disabled={true}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Nombre del Producto</span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>🔒 Calculado automáticamente</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={batchFormData.name}
                    disabled={true}
                    readOnly={true}
                    style={{ background: 'var(--bg-body)', cursor: 'not-allowed', fontWeight: '700', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}>
                  💵 Cantidad, Costos y Precio Sugerido de Venta
                </span>
                <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Cantidad Comprada *</label>
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
                    <label className="form-label">Costo Unidad (Compra) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      placeholder="Ej. 45000"
                      value={batchFormData.costPrice || ''}
                      onChange={(e) => handleCostPriceChange(true, e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>% Margen Ganancia</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cálculo rápido</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ej. 50"
                      value={batchFormData.marginPercent ?? ''}
                      onChange={(e) => handleMarginChange(true, e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {[30, 50, 80, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => handleMarginChange(true, pct)}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio Sugerido Venta *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      placeholder="Ej. 67500"
                      value={batchFormData.sellPrice || ''}
                      onChange={(e) => handleSellPriceChange(true, e.target.value)}
                      required
                      style={{ fontWeight: '700', color: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Atributos del Producto en Lote (Siempre visibles en pantalla) */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'block', marginBottom: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏷️ Atributos del Producto (Concatenación Automática de Nombre)
                </span>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Línea *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchLinesList"
                      value={batchFormData.line}
                      onChange={(e) => updateBatchFormAttribute('line', e.target.value)}
                    />
                    <datalist id="batchLinesList">
                      {params.lines.map(l => <option key={l.id} value={l.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchCategoriesList"
                      value={batchFormData.category}
                      onChange={(e) => updateBatchFormAttribute('category', e.target.value)}
                    />
                    <datalist id="batchCategoriesList">
                      {params.categories.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Género *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchGendersList"
                      value={batchFormData.gender}
                      onChange={(e) => updateBatchFormAttribute('gender', e.target.value)}
                    />
                    <datalist id="batchGendersList">
                      {params.genders.map(g => <option key={g.id} value={g.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid-3" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Talla *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchSizesList"
                      value={batchFormData.size}
                      onChange={(e) => updateBatchFormAttribute('size', e.target.value)}
                    />
                    <datalist id="batchSizesList">
                      {params.sizes.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchColorsList"
                      value={batchFormData.color}
                      onChange={(e) => updateBatchFormAttribute('color', e.target.value)}
                    />
                    <datalist id="batchColorsList">
                      {params.colors.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estilo / Detalle *</label>
                    <input
                      type="text"
                      className="form-control"
                      list="batchStylesList"
                      value={batchFormData.style}
                      onChange={(e) => updateBatchFormAttribute('style', e.target.value)}
                    />
                    <datalist id="batchStylesList">
                      {params.styles.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                </div>
              </div>

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
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="card-title font-sans">Historial de Compras (Entradas)</h3>
              <span className="card-subtitle">Registro cronológico y gestión de entradas de mercancía</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mostrar:</span>
              <select
                className="input-field"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ width: 'auto', padding: '4px 10px', fontSize: '13px' }}
              >
                <option value={10}>10 registros</option>
                <option value={25}>25 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>

          {/* Advanced Filter Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--bg-body)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="🔍 Buscar por producto, proveedor, SKU..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '13px', padding: '6px 12px' }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <select
                className="input-field"
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '13px', padding: '6px 12px' }}
              >
                <option value="all">Todos los Proveedores</option>
                {uniqueProviders.map((prov, i) => (
                  <option key={i} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <span>Desde:</span>
              <input
                type="date"
                className="input-field"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '12.5px', padding: '4px 8px', width: 'auto' }}
              />
              <span>Hasta:</span>
              <input
                type="date"
                className="input-field"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '12.5px', padding: '4px 8px', width: 'auto' }}
              />
            </div>
            {(historySearch || providerFilter !== 'all' || dateFrom || dateTo) && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setHistorySearch('');
                  setProviderFilter('all');
                  setDateFrom('');
                  setDateTo('');
                  setCurrentPage(1);
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                ✖ Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto' }}>
          <table className="table-premium">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none', background: 'var(--bg-card)' }} onClick={() => handleSort('date')}>
                  Fecha{getSortIndicator('date')}
                </th>
                {currentStoreId === 'all' && <th style={{ background: 'var(--bg-card)' }}>Tienda</th>}
                <th style={{ background: 'var(--bg-card)' }}>Código / SKU</th>
                <th style={{ cursor: 'pointer', userSelect: 'none', background: 'var(--bg-card)' }} onClick={() => handleSort('name')}>
                  Producto{getSortIndicator('name')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', background: 'var(--bg-card)' }} onClick={() => handleSort('provider')}>
                  Proveedor{getSortIndicator('provider')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', background: 'var(--bg-card)' }} onClick={() => handleSort('quantity')}>
                  Cant.{getSortIndicator('quantity')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', background: 'var(--bg-card)' }} onClick={() => handleSort('costPrice')}>
                  Costo Unit.{getSortIndicator('costPrice')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', background: 'var(--bg-card)' }} onClick={() => handleSort('sellPrice')}>
                  P. Venta Sugerido{getSortIndicator('sellPrice')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', background: 'var(--bg-card)' }} onClick={() => handleSort('totalPrice')}>
                  Total Compra{getSortIndicator('totalPrice')}
                </th>
                <th style={{ textAlign: 'center', background: 'var(--bg-card)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={currentStoreId === 'all' ? 10 : 9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No hay registros de compras que coincidan con los filtros.
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
                    <td>
                      <code style={{ fontSize: '11px', display: 'block' }}>Bar: {p.barcode || '-'}</code>
                      <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.sku || '-'}</code>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>{p.provider || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge primary">{p.quantity} uds</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCOP(p.costPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                      {formatCOP(p.sellPrice || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>
                      {formatCOP(p.totalPrice)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Modificar Compra"
                          onClick={() => handleOpenEditModal(p)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          title="Eliminar Compra (Descuenta stock)"
                          onClick={() => handleDeletePurchase(p)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ❌
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-body)', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredHistory.length} registros filtrados de {purchaseHistory.length} totales)
          </span>
          {totalPages > 1 && (
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
          )}
        </div>
      </div>

      {/* Modal para Editar Compra */}
      {editModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-body)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                ✏️ Modificar Registro de Compra
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveEditPurchase} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Producto</label>
                <input
                  type="text"
                  className="input-field"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Proveedor</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.provider}
                    onChange={(e) => setEditFormData({ ...editFormData, provider: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Fecha</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Costo Unit.</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editFormData.costPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Precio Venta Sugerido</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editFormData.sellPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, sellPrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={{
                background: 'var(--bg-body)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)'
              }}>
                <span>Total Recompra:</span>
                <strong style={{ color: 'var(--danger)', fontSize: '15px' }}>
                  {formatCOP(editFormData.quantity * editFormData.costPrice)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flotante Emergente */}
      {toastNotification.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          minWidth: '320px',
          maxWidth: '420px',
          background: toastNotification.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease-in-out'
        }}>
          <div style={{ fontSize: '24px', lineHeight: 1 }}>
            {toastNotification.type === 'success' ? '✅' : '⚠️'}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
              {toastNotification.title}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.92)', lineHeight: '1.4' }}>
              {toastNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(prev => ({ ...prev, show: false }))}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              opacity: 0.85,
              fontWeight: '700'
            }}
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
