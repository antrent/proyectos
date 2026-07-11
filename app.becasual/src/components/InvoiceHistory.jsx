import React, { useState, useEffect } from 'react';
import { salesService } from '../services/SalesService';
import { CsvHelper } from '../services/CsvHelper';
import { storageRepository } from '../services/StorageRepository';

const parseDateString = (dateStr) => {
  if (!dateStr) return new Date().toISOString();
  dateStr = dateStr.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  
  // Try Spanish/Colombian format (DD/MM/YYYY or DD-MM-YYYY)
  const spRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
  const match = dateStr.match(spRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 12;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Fallback to standard Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  return new Date().toISOString();
};

const parseCSVNumber = (val) => {
  if (val === undefined || val === null) return 0;
  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency sign, spaces
  str = str.replace(/[\$\s]/g, '');

  // Check for thousands separator
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts[1] && parts[1].length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts[1] && parts[1].length === 3) {
      str = str.replace(/\./g, '');
    }
  }

  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

export default function InvoiceHistory({ user, currentStoreId }) {
  const [sales, setSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'cancelled'
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [expandedSale, setExpandedSale] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // States for product returns
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [saleToReturn, setSaleToReturn] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({}); // productId -> quantity to return
  const [refundDeductions, setRefundDeductions] = useState({}); // method -> deduction amount
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState('');

  const INVOICE_COLUMNS = [
    { label: 'Numero Factura', key: 'invoiceNumber' },
    { label: 'Fecha y Hora', key: 'date' },
    { label: 'Nombre Cliente', key: 'clientName' },
    { label: 'Documento Cliente', key: 'clientDocument' },
    { label: 'Nombre Producto', key: 'name' },
    { label: 'Codigo de Barras', key: 'barcode' },
    { label: 'Cantidad', key: 'quantity' },
    { label: 'Precio', key: 'sellPrice' },
    { label: 'Descuento Porcentaje', key: 'discount' },
    { label: 'Metodo Pago', key: 'paymentMethod' },
    { label: 'Subtotal Factura', key: 'subtotal' },
    { label: 'IVA Factura', key: 'tax' },
    { label: 'Total Factura', key: 'total' },
    { label: 'Usuario Vendedor', key: 'sellerId' },
    { label: 'Anulada', key: 'cancelled' }
  ];

  const handleExportCSV = () => {
    const flatSales = [];
    filtered.forEach(sale => {
      (sale.items || []).forEach(item => {
        flatSales.push({
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          clientName: sale.clientName,
          clientDocument: sale.clientDocument || '',
          name: item.name,
          barcode: item.barcode,
          quantity: item.quantity,
          sellPrice: item.sellPrice,
          discount: item.discount || 0,
          paymentMethod: sale.paymentMethod,
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          sellerId: sale.sellerId || '',
          cancelled: sale.cancelled ? 'SÍ' : 'NO'
        });
      });
    });

    const csvContent = CsvHelper.jsonToCsv(flatSales, INVOICE_COLUMNS);
    CsvHelper.download(csvContent, 'ventas_becasual.csv');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        invoiceNumber: 'FAC-0001', date: new Date().toISOString(),
        clientName: 'Juan Perez', clientDocument: '1012345678',
        name: 'Jeans Slim Fit Azul', barcode: '7701234567890',
        quantity: '2', sellPrice: '89000', discount: '10',
        paymentMethod: 'Efectivo', subtotal: '178000', tax: '33820',
        total: '160200', sellerId: 'admin', cancelled: 'NO'
      }
    ];
    const csvContent = CsvHelper.jsonToCsv(templateData, INVOICE_COLUMNS);
    CsvHelper.download(csvContent, 'plantilla_ventas.csv');
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
        const parsed = CsvHelper.csvToJson(text, INVOICE_COLUMNS);
        if (parsed.length === 0) {
          setError('El archivo CSV está vacío o no tiene el formato correcto.');
          return;
        }

        const inventoryProducts = storageRepository.getProducts();
        const getProductCostPrice = (barcode, name) => {
          let prod = null;
          if (barcode) {
            prod = inventoryProducts.find(p => p.barcode === barcode);
          }
          if (!prod && name) {
            const normalizedSearch = name.toLowerCase().trim();
            prod = inventoryProducts.find(p => p.name.toLowerCase().trim() === normalizedSearch);
          }
          return prod ? (prod.costPrice || 0) : 0;
        };

        let emptyInvoiceNumCount = 0;
        const grouped = {};
        parsed.forEach(row => {
          const invNum = (row.invoiceNumber || '').trim();
          if (!invNum) {
            emptyInvoiceNumCount++;
            return;
          }

          if (!grouped[invNum]) {
            grouped[invNum] = {
              invoiceNumber: invNum,
              date: parseDateString(row.date),
              clientName: row.clientName || 'Cliente Genérico',
              clientDocument: row.clientDocument || '',
              paymentMethod: row.paymentMethod || 'Efectivo',
              subtotal: 0,
              tax: 0,
              total: 0,
              discount: 0,
              cost: 0,
              profit: 0,
              sellerId: row.sellerId || 'admin',
              cancelled: String(row.cancelled).toUpperCase() === 'SÍ',
              items: [],
              // Temporary fields for checking row-level vs invoice-level totals
              firstRowSubtotal: parseCSVNumber(row.subtotal),
              firstRowTax: parseCSVNumber(row.tax),
              firstRowTotal: parseCSVNumber(row.total),
              firstRowDiscount: parseCSVNumber(row.discount),
              accumulatedSubtotal: 0,
              accumulatedTax: 0,
              accumulatedTotal: 0,
              accumulatedDiscount: 0
            };
          }

          const currentItemSubtotal = parseCSVNumber(row.subtotal);
          const currentItemTax = parseCSVNumber(row.tax);
          const currentItemTotal = parseCSVNumber(row.total);
          const currentItemDiscount = parseCSVNumber(row.discount);

          grouped[invNum].accumulatedSubtotal += currentItemSubtotal;
          grouped[invNum].accumulatedTax += currentItemTax;
          grouped[invNum].accumulatedTotal += currentItemTotal;
          grouped[invNum].accumulatedDiscount += currentItemDiscount;

          const itemCostPrice = getProductCostPrice(row.barcode, row.name);
          grouped[invNum].items.push({
            name: row.name || 'Producto Desconocido',
            barcode: row.barcode || '',
            quantity: parseCSVNumber(row.quantity) || 1,
            sellPrice: parseCSVNumber(row.sellPrice) || 0,
            discount: parseCSVNumber(row.discount) || 0,
            costPrice: itemCostPrice
          });
        });

        // Finalize totals for each grouped invoice
        Object.values(grouped).forEach(sale => {
          let calculatedTotal = 0;
          let calculatedDiscount = 0;
          let calculatedCost = 0;
          sale.items.forEach(item => {
            const itemSubtotal = item.sellPrice * item.quantity;
            const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
            calculatedTotal += (itemSubtotal - discountAmount);
            calculatedDiscount += discountAmount;
            calculatedCost += (item.costPrice || 0) * item.quantity;
          });

          // Check if CSV columns are row-level or invoice-level.
          // If accumulatedTotal is close to calculatedTotal and firstRowTotal is smaller (and close to the first item's total),
          // it is row-level (item-level).
          const isRowLevel = sale.firstRowTotal < sale.accumulatedTotal && 
            Math.abs(sale.accumulatedTotal - calculatedTotal) < Math.abs(sale.firstRowTotal - calculatedTotal);

          if (isRowLevel) {
            sale.subtotal = sale.accumulatedSubtotal;
            sale.tax = sale.accumulatedTax;
            sale.total = sale.accumulatedTotal;
            sale.discount = sale.accumulatedDiscount;
          } else {
            sale.subtotal = sale.firstRowSubtotal;
            sale.tax = sale.firstRowTax;
            sale.total = sale.firstRowTotal;
            sale.discount = sale.firstRowDiscount;
          }

          // If the CSV total is 0 or empty, calculate it dynamically from the items
          if (sale.total === 0 && calculatedTotal > 0) {
            const taxPercentage = 0.19; // Default 19%
            sale.total = calculatedTotal;
            sale.subtotal = Number((calculatedTotal / (1 + taxPercentage)).toFixed(2));
            sale.tax = Number((calculatedTotal - sale.subtotal).toFixed(2));
            sale.discount = calculatedDiscount;
          }

          sale.cost = calculatedCost;
          sale.profit = Number((sale.total - sale.cost).toFixed(2));

          // Clean up temporary properties
          delete sale.firstRowSubtotal;
          delete sale.firstRowTax;
          delete sale.firstRowTotal;
          delete sale.firstRowDiscount;
          delete sale.accumulatedSubtotal;
          delete sale.accumulatedTax;
          delete sale.accumulatedTotal;
          delete sale.accumulatedDiscount;
        });

        const allSales = storageRepository.getSales();
        let addedCount = 0;
        let duplicateCount = 0;
        const targetStoreId = currentStoreId === 'all' ? 'store_1' : currentStoreId;

        Object.values(grouped).forEach(newSale => {
          const exists = allSales.some(s => s.invoiceNumber === newSale.invoiceNumber);
          if (exists) {
            duplicateCount++;
          } else {
            allSales.unshift({
              id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              storeId: targetStoreId,
              ...newSale
            });
            addedCount++;
          }
        });

        if (addedCount > 0) {
          storageRepository.saveSales(allSales);
          load();
          setSuccess(`Se importaron ${addedCount} facturas con éxito.${duplicateCount > 0 ? ` Se omitieron ${duplicateCount} duplicadas.` : ''}`);
        } else {
          if (duplicateCount > 0 && emptyInvoiceNumCount > 0) {
            setError(`No se agregaron facturas nuevas: ${duplicateCount} facturas ya existen en el sistema (duplicadas) y ${emptyInvoiceNumCount} filas se omitieron por no tener número de factura.`);
          } else if (duplicateCount > 0) {
            setError(`No se agregaron facturas: todas las ${duplicateCount} facturas del archivo ya existen en el sistema (duplicadas).`);
          } else if (emptyInvoiceNumCount > 0) {
            setError(`No se encontraron facturas válidas: se leyeron ${emptyInvoiceNumCount} filas pero ninguna tenía número de factura. Revisa que el archivo tenga la columna "Numero Factura" (o equivalente).`);
          } else {
            setError('No se agregaron facturas nuevas (todas estaban duplicadas o vacías).');
          }
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  useEffect(() => { load(); }, [currentStoreId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo, statusFilter, currentStoreId]);

  const load = () => setSales(salesService.getAll(currentStoreId));

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchQuery = !q || s.invoiceNumber.toLowerCase().includes(q) || (s.clientName || '').toLowerCase().includes(q);
    const saleDate = (s.date || '').split('T')[0];
    const matchFrom = !dateFrom || saleDate >= dateFrom;
    const matchTo = !dateTo || saleDate <= dateTo;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && !s.cancelled) || (statusFilter === 'cancelled' && s.cancelled);
    return matchQuery && matchFrom && matchTo && matchStatus;
  });

  const openCancelModal = (sale) => {
    setSaleToCancel(sale);
    setCancelReason('');
    setError('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = () => {
    setError('');
    if (!cancelReason.trim()) { setError('Debes ingresar el motivo de la anulación.'); return; }
    try {
      salesService.cancelSale(saleToCancel.id, cancelReason.trim());
      setSuccess(`Factura ${saleToCancel.invoiceNumber} anulada. El inventario fue restaurado.`);
      setCancelModalOpen(false);
      load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Error al anular la factura.');
    }
  };

  const openReturnModal = (sale) => {
    setSaleToReturn(sale);
    // Initialize quantities to return as 0 for all items in the sale
    const initialQty = {};
    (sale.items || []).forEach(item => {
      initialQty[item.productId] = 0;
    });
    setReturnQuantities(initialQty);

    // Initialize refund deductions as 0 for all payments in the sale
    const initialDeductions = {};
    const payments = sale.payments || [{ method: sale.paymentMethod || 'Efectivo', amount: sale.total }];
    payments.forEach(p => {
      initialDeductions[p.method] = 0;
    });
    setRefundDeductions(initialDeductions);

    setReturnReason('');
    setReturnError('');
    setReturnModalOpen(true);
  };

  const calculateTotalRefund = () => {
    if (!saleToReturn) return 0;
    let total = 0;
    (saleToReturn.items || []).forEach(item => {
      const qty = returnQuantities[item.productId] || 0;
      const itemSubtotal = item.sellPrice * qty;
      const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
      total += (itemSubtotal - discountAmount);
    });
    return Number(total.toFixed(2));
  };

  const handleConfirmReturn = () => {
    setReturnError('');
    try {
      const totalRefund = calculateTotalRefund();
      if (totalRefund <= 0) {
        setReturnError('Debes seleccionar al menos un producto con cantidad mayor a 0 para devolver.');
        return;
      }

      // Convert returnQuantities object to array of { productId, name, quantity }
      const itemsToReturn = [];
      (saleToReturn.items || []).forEach(item => {
        const qty = returnQuantities[item.productId] || 0;
        if (qty > 0) {
          itemsToReturn.push({
            productId: item.productId,
            name: item.name,
            quantity: qty
          });
        }
      });

      // Convert refundDeductions object to array of { method, amount }
      const refundPayments = [];
      Object.entries(refundDeductions).forEach(([method, amt]) => {
        const amount = Number(parseFloat(amt) || 0);
        if (amount > 0) {
          refundPayments.push({ method, amount });
        }
      });

      // Validate deductions sum
      const totalDeducted = refundPayments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalDeducted - totalRefund) > 0.01) {
        setReturnError(`La suma de las devoluciones de pago (${formatCOP(totalDeducted)}) debe ser igual al valor total a reembolsar (${formatCOP(totalRefund)}).`);
        return;
      }

      // Execute return
      salesService.processReturn(saleToReturn.id, itemsToReturn, refundPayments, returnReason.trim());
      setReturnModalOpen(false);
      load();
      setSuccess(`Devolución procesada con éxito para la factura ${saleToReturn.invoiceNumber}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setReturnError(err.message || 'Error al procesar la devolución.');
    }
  };

  const formatCOP = (amount) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  };

  const totalRevenue = filtered.filter(s => !s.cancelled).reduce((s, sale) => s + sale.total, 0);
  const totalCancelled = filtered.filter(s => s.cancelled).length;
  const paginatedInvoices = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Filters */}
      <div className="card-table-wrapper" style={{ padding: '20px 24px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="🔍 # Factura o nombre del cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="form-control" style={{ width: '160px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input type="date" className="form-control" style={{ width: '160px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: '180px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todas las facturas</option>
            <option value="active">✅ Solo activas</option>
            <option value="cancelled">❌ Sólo anuladas</option>
          </select>
        </div>
      </div>

      {/* Acciones Masivas */}
      <div className="card-table-wrapper" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-body)', border: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🧾</span>
          <div>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Acciones Masivas de Facturación</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carga o descarga de historial de ventas en lote (Sede: {currentStoreId === 'all' ? 'Principal (Defecto)' : 'Tienda actual'})</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn btn-sm ${showHelpGuide ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            style={{ fontWeight: 600 }}
          >
            ❓ Guía de Carga
          </button>
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

      {showHelpGuide && (
        <div className="card-table-wrapper" style={{ padding: '24px', background: 'var(--bg-card)', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📖 Guía Interactiva para Carga Masiva de Ventas
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Sigue estos pasos para estructurar tu archivo de historial de ventas en formato CSV e importarlo sin errores:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '4px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>1. ESTRUCTURA MULTI-ITEM</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, display: 'block' }}>
                Si una factura tiene múltiples artículos vendidos, debes escribir <strong>el mismo número de factura</strong> en varias filas. El sistema las agrupará automáticamente en una sola factura con varios ítems.
              </span>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>2. FORMATO DE FECHAS</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, display: 'block' }}>
                Admite formatos de Excel en español, como <code>DD/MM/AAAA HH:MM:SS</code> o <code>DD/MM/AAAA</code> (ej: <code>15/06/2026 18:30:00</code>), y también formato ISO estándar <code>AAAA-MM-DD</code>.
              </span>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>3. CAMPOS REQUERIDOS</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, display: 'block' }}>
                Asegúrate de llenar las columnas: <code>Numero Factura</code>, <code>Codigo de Barras</code>, <code>Cantidad</code> y <code>Precio</code>. Si el cliente es genérico, puedes dejar el nombre en blanco y se le asignará "Cliente Genérico".
              </span>
            </div>
          </div>
          <div style={{ fontSize: '12px', background: 'hsla(190, 70%, 40%, 0.08)', border: '1px solid hsla(190, 70%, 40%, 0.15)', padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>
            💡 <strong>Consejo rápido:</strong> Primero haz clic en el botón <strong>📄 Plantilla</strong> para descargar el archivo de ejemplo, edítalo con tu información histórica de ventas en Excel, guárdalo como <strong>CSV delimitado por comas</strong> y finalmente súbelo.
          </div>
        </div>
      )}

      {success && <div className="alert alert-success"><span>✅</span><span>{success}</span></div>}
      {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

      {/* Stats */}
      <div className="grid-stats">
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Ingresos Filtrados</span>
            <span className="stat-value" style={{ fontSize: '18px' }}>{formatCOP(totalRevenue)}</span>
          </div>
          <div className="stat-icon">💰</div>
        </div>
        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Facturas Mostradas</span>
            <span className="stat-value">{filtered.length}</span>
          </div>
          <div className="stat-icon">🧾</div>
        </div>
        <div className="card-stat red">
          <div className="stat-info">
            <span className="stat-label">Facturas Anuladas</span>
            <span className="stat-value">{totalCancelled}</span>
          </div>
          <div className="stat-icon">❌</div>
        </div>
      </div>

      {/* Table */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <h3 className="card-title">📄 Historial de Facturas / Ventas</h3>
          <span className="badge primary">{filtered.length} registros</span>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha y Hora</th>
                {currentStoreId === 'all' && <th>Sede</th>}
                <th>Cliente</th>
                <th>Método Pago</th>
                <th>Items</th>
                <th>Total</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.length === 0 ? (
                <tr><td colSpan={currentStoreId === 'all' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron facturas con los filtros seleccionados.
                </td></tr>
              ) : (
                paginatedInvoices.map(s => (
                  <React.Fragment key={s.id}>
                    <tr style={{ opacity: s.cancelled ? 0.55 : 1 }}>
                      <td>
                        <strong style={{ color: s.cancelled ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {s.invoiceNumber}
                        </strong>
                      </td>
                      <td style={{ fontSize: '12px' }}>{formatDateTime(s.date)}</td>
                      {currentStoreId === 'all' && (
                        <td style={{ fontSize: '12px', fontWeight: '600' }}>
                          🏬 {s.storeId === 'store_2' ? 'Sede Centro' : 'Sede Principal'}
                        </td>
                      )}
                      <td>{s.clientName}</td>
                      <td><span className="badge secondary">{s.paymentMethod}</span></td>
                      <td>{(s.items || []).length} artículos</td>
                      <td style={{ fontWeight: 700, color: s.cancelled ? 'var(--text-muted)' : 'var(--success)' }}>
                        {s.cancelled ? <del>{formatCOP(s.total)}</del> : formatCOP(s.total)}
                      </td>
                      <td>
                        {s.cancelled ? (
                          <span className="badge danger">❌ Anulada</span>
                        ) : s.returns && s.returns.length > 0 ? (
                          s.total === 0 ? (
                            <span className="badge danger" style={{ background: '#f5222d', color: '#fff' }}>🔄 Dev. Total</span>
                          ) : (
                            <span className="badge warning" style={{ background: '#faad14', color: '#000' }}>🔄 Dev. Parcial</span>
                          )
                        ) : (
                          <span className="badge success">✅ Activa</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setExpandedSale(expandedSale === s.id ? null : s.id)}
                          >
                            {expandedSale === s.id ? '▲' : '▼'} Detalle
                          </button>
                          {!s.cancelled && (user.role === 'admin' || user.role === 'vendedor') && (
                            <>
                              {s.total > 0 && (
                                <button className="btn btn-warning btn-sm" onClick={() => openReturnModal(s)} style={{ background: 'var(--warning)', color: 'black' }}>
                                  🔄 Devolver
                                </button>
                              )}
                              <button className="btn btn-danger btn-sm" onClick={() => openCancelModal(s)}>
                                ❌ Anular
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedSale === s.id && (
                      <tr>
                        <td colSpan={currentStoreId === 'all' ? 9 : 8} style={{ background: 'var(--bg-app)', padding: '0' }}>
                          <div style={{ padding: '16px 24px' }}>
                            {s.cancelled && (
                              <div className="alert alert-error" style={{ marginBottom: '12px', fontSize: '13px' }}>
                                <span>❌</span>
                                <span><strong>Motivo anulación:</strong> {s.cancelReason} — {formatDateTime(s.cancelDate)}</span>
                              </div>
                            )}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ background: 'var(--border-color)' }}>
                                  <th style={{ padding: '8px 16px', textAlign: 'left' }}>Producto</th>
                                  <th style={{ padding: '8px 16px', textAlign: 'left' }}>Código</th>
                                  <th style={{ padding: '8px 16px' }}>Cant.</th>
                                  <th style={{ padding: '8px 16px' }}>Precio</th>
                                  <th style={{ padding: '8px 16px' }}>Desc.</th>
                                  <th style={{ padding: '8px 16px' }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(s.items || []).map((item, i) => {
                                  const lineTotal = item.sellPrice * item.quantity * (1 - (item.discount || 0) / 100);
                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                                      <td style={{ padding: '10px 16px' }}><code>{item.barcode}</code></td>
                                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                        {item.quantity}
                                        {item.returnedQuantity > 0 && (
                                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--danger)', fontWeight: 'bold' }}>
                                            ({item.returnedQuantity} dev.)
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '10px 16px' }}>{formatCOP(item.sellPrice)}</td>
                                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>{item.discount || 0}%</td>
                                      <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--success)' }}>{formatCOP(lineTotal)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', gap: '24px', fontSize: '13px' }}>
                              <span>IVA: <strong>{formatCOP(s.tax)}</strong></span>
                              <span>Descuento: <strong style={{ color: 'var(--danger)' }}>-{formatCOP(s.discount)}</strong></span>
                              <span style={{ fontSize: '16px' }}>Total: <strong style={{ color: 'var(--success)' }}>{formatCOP(s.total)}</strong></span>
                            </div>

                            {s.returns && s.returns.length > 0 && (
                              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(250, 173, 20, 0.05)', border: '1px solid rgba(250, 173, 20, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#d46b08', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  🔄 Historial de Devoluciones
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {s.returns.map((ret, rIdx) => (
                                    <div key={ret.id || rIdx} style={{ fontSize: '12px', borderBottom: rIdx < s.returns.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        <span>Fecha: {formatDateTime(ret.date)}</span>
                                        <span style={{ color: 'var(--danger)' }}>Reembolsado: {formatCOP(ret.items.reduce((sum, item) => sum + item.refundAmount, 0))}</span>
                                      </div>
                                      <div style={{ margin: '6px 0', color: 'var(--text-secondary)' }}>
                                        <strong>Motivo:</strong> {ret.reason}
                                      </div>
                                      <div style={{ paddingLeft: '12px', color: 'var(--text-muted)' }}>
                                        <div><strong>Productos Reintegrados:</strong></div>
                                        {ret.items.map((it, itIdx) => (
                                          <div key={itIdx}>• {it.name} x {it.quantity} (Reembolso: {formatCOP(it.refundAmount)})</div>
                                        ))}
                                        {ret.refundPayments && ret.refundPayments.length > 0 && (
                                          <div style={{ marginTop: '4px' }}>
                                            <strong>Deducido de Pagos:</strong>{' '}
                                            {ret.refundPayments.map(p => `${p.method}: -${formatCOP(p.amount)}`).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {Math.ceil(filtered.length / ITEMS_PER_PAGE) > 1 && (
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
              Mostrando <strong>{Math.min(filtered.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</strong> a{' '}
              <strong>{Math.min(filtered.length, currentPage * ITEMS_PER_PAGE)}</strong> de <strong>{filtered.length}</strong> facturas
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
                Página {currentPage} de {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                style={{ padding: '4px 10px' }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {cancelModalOpen && saleToCancel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">❌ Anular Factura {saleToCancel.invoiceNumber}</h3>
              <button className="modal-close" onClick={() => setCancelModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-error" style={{ fontSize: '13px' }}>
                <span>⚠️</span>
                <div>
                  <strong>Esta acción revertirá el inventario.</strong><br/>
                  Se restaurarán {(saleToCancel.items || []).length} productos al stock. Esta operación no puede deshacerse.
                </div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div><strong>Factura:</strong> {saleToCancel.invoiceNumber}</div>
                  <div><strong>Cliente:</strong> {saleToCancel.clientName}</div>
                  <div><strong>Total:</strong> {formatCOP(saleToCancel.total)}</div>
                  <div><strong>Fecha:</strong> {formatDateTime(saleToCancel.date)}</div>
                </div>
              </div>
              {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}
              <div className="form-group">
                <label className="form-label">Motivo de la Anulación *</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '80px' }}
                  placeholder="Ej: Error en precio, devolución de producto, cliente desistió..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCancelModalOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleConfirmCancel} style={{ background: 'var(--danger)', color: 'white' }}>
                ❌ Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return products modal */}
      {returnModalOpen && saleToReturn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">🔄 Devolución de Productos - Factura {saleToReturn.invoiceNumber}</h3>
              <button className="modal-close" onClick={() => setReturnModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Meta info */}
                <div style={{ padding: '12px 16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div><strong>Cliente:</strong> {saleToReturn.clientName}</div>
                    <div><strong>Fecha Factura:</strong> {formatDateTime(saleToReturn.date)}</div>
                    <div><strong>Total Original:</strong> {formatCOP(saleToReturn.total)}</div>
                    <div><strong>Medios Pago Originales:</strong> {saleToReturn.paymentMethod}</div>
                  </div>
                </div>

                {/* Items selection */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700' }}>Selecciona los productos y cantidades a devolver:</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right' }}>Precio Neto</th>
                        <th style={{ padding: '6px 12px', textAlign: 'center' }}>Disp.</th>
                        <th style={{ padding: '6px 12px', textAlign: 'center', width: '90px' }}>Devolver</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right' }}>Reembolso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleToReturn.items || []).map(item => {
                        const netPrice = item.sellPrice * (1 - (item.discount || 0) / 100);
                        const qtyToReturn = returnQuantities[item.productId] || 0;
                        const lineRefund = netPrice * qtyToReturn;
                        return (
                          <tr key={item.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ fontWeight: '600' }}>{item.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.barcode}</div>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCOP(netPrice)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: '60px', padding: '4px', textAlign: 'center', margin: '0 auto' }}
                                min="0"
                                max={item.quantity}
                                value={qtyToReturn}
                                onChange={e => {
                                  const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                                  setReturnQuantities(prev => ({
                                    ...prev,
                                    [item.productId]: val
                                  }));
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: lineRefund > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {formatCOP(lineRefund)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Refund Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '12px 16px', background: 'rgba(245, 34, 45, 0.05)', border: '1px solid rgba(245, 34, 45, 0.1)', borderRadius: 'var(--radius-md)', fontWeight: '700' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Total a Reembolsar:</span>
                  <span style={{ fontSize: '16px', color: 'var(--danger)' }}>{formatCOP(calculateTotalRefund())}</span>
                </div>

                {/* Payment deductions */}
                {calculateTotalRefund() > 0 && (
                  <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700' }}>Distribución del reembolso en medios de pago:</h4>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Especifica cuánto dinero deducir de cada método de pago de la factura original. La suma de las deducciones debe ser exactamente {formatCOP(calculateTotalRefund())}.
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(saleToReturn.payments || [{ method: saleToReturn.paymentMethod || 'Efectivo', amount: saleToReturn.total }]).map(p => {
                        const currentDeduction = refundDeductions[p.method] || 0;
                        return (
                          <div key={p.method} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                            <div><strong>{p.method}</strong> (Pagado: {formatCOP(p.amount)})</div>
                            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Max ded.: -{formatCOP(p.amount)}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>$</span>
                              <input
                                type="number"
                                className="form-control"
                                style={{ padding: '4px 8px' }}
                                min="0"
                                max={p.amount}
                                value={currentDeduction || ''}
                                placeholder="0"
                                onChange={e => {
                                  const val = Math.min(p.amount, Math.max(0, parseFloat(e.target.value) || 0));
                                  setRefundDeductions(prev => ({
                                    ...prev,
                                    [p.method]: val
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Remaining deduction validation helper */}
                    <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                      {(() => {
                        const totalDeducted = Object.values(refundDeductions).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                        const diff = calculateTotalRefund() - totalDeducted;
                        if (Math.abs(diff) < 0.01) {
                          return <span style={{ color: 'var(--success)' }}>✅ Distribución correcta</span>;
                        } else if (diff > 0) {
                          return <span style={{ color: 'var(--warning)' }}>Falta distribuir: {formatCOP(diff)}</span>;
                        } else {
                          return <span style={{ color: 'var(--danger)' }}>Exceso distribuido: {formatCOP(Math.abs(diff))}</span>;
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Reason and Errors */}
                {returnError && (
                  <div className="alert alert-error" style={{ fontSize: '12px' }}>
                    <span>⚠️</span>
                    <span>{returnError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Motivo de la Devolución *</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '60px' }}
                    placeholder="Ej: Cambio de talla, producto defectuoso, insatisfacción del cliente..."
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                  />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReturnModalOpen(false)}>Cancelar</button>
              <button
                className="btn btn-warning"
                onClick={handleConfirmReturn}
                style={{ background: 'var(--warning)', color: 'black', fontWeight: 'bold' }}
              >
                🔄 Procesar Devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
