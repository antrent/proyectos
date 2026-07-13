import React, { useState, useEffect } from 'react';
import { layawayService } from '../services/LayawayService';
import { storageRepository } from '../services/StorageRepository';
import { notificationService } from '../services/NotificationService';
import { CsvHelper } from '../services/CsvHelper';

const STATUS_BADGES = {
  active: 'warning',
  completed: 'success',
  cancelled: 'danger'
};

const STATUS_LABELS = {
  active: 'Activo',
  completed: 'Entregado',
  cancelled: 'Anulado'
};

export default function Layaways({ user, currentStoreId, onDataChange }) {
  const [layaways, setLayaways] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'completed' | 'cancelled' | 'all'
  const [stores, setStores] = useState([]);

  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState(null);

  // Form States
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [cancelReason, setCancelReason] = useState('');
  
  const paymentMethodsList = storageRepository.getPaymentMethods();

  const getPaymentMethodEmoji = (method) => {
    const emojis = {
      Efectivo: '💵',
      Nequi: '📱',
      Daviplata: '📲',
      SisteCredito: '💳',
      Addi: '🛍️',
      Bold: '⚡'
    };
    return emojis[method] || '💰';
  };

  // UX alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifLog, setNotifLog] = useState([]);
  const [showNotifLog, setShowNotifLog] = useState(false);

  const LAYAWAY_COLUMNS = [
    { label: 'Numero Registro', key: 'layawayNumber' },
    { label: 'Documento Cliente', key: 'clientDocument' },
    { label: 'Nombre Cliente', key: 'clientName' },
    { label: 'Telefono Cliente', key: 'clientPhone' },
    { label: 'Fecha Registro', key: 'date' },
    { label: 'Valor Total', key: 'total' },
    { label: 'Valor Abonado', key: 'paid' },
    { label: 'Estado', key: 'status' }
  ];

  const handleExportCSV = () => {
    const csvContent = CsvHelper.jsonToCsv(layaways, LAYAWAY_COLUMNS);
    CsvHelper.download(csvContent, 'separaciones_becasual.csv');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        layawayNumber: 'SEP-0001', clientDocument: '1034567890', clientName: 'Maria Perez',
        clientPhone: '3151234567', date: new Date().toISOString(), total: '150000',
        paid: '50000', status: 'active'
      }
    ];
    const csvContent = CsvHelper.jsonToCsv(templateData, LAYAWAY_COLUMNS);
    CsvHelper.download(csvContent, 'plantilla_separaciones.csv');
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
        const parsed = CsvHelper.csvToJson(text, LAYAWAY_COLUMNS);
        if (parsed.length === 0) {
          setError('El archivo CSV está vacío o no tiene el formato correcto.');
          return;
        }

        const allLayaways = storageRepository.getLayaways();
        let addedCount = 0;
        let duplicateCount = 0;
        const targetStoreId = currentStoreId === 'all' ? 'store_1' : currentStoreId;

        parsed.forEach(row => {
          if (!row.clientName || !row.clientName.trim()) return;
          const layNum = (row.layawayNumber || '').trim();
          if (!layNum) return;

          const totalVal = Number(row.total) || 0;
          const paidVal = Number(row.paid) || 0;

          const exists = allLayaways.some(l => l.layawayNumber === layNum);
          if (exists) {
            duplicateCount++;
          } else {
            allLayaways.unshift({
              id: `lay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              storeId: targetStoreId,
              layawayNumber: layNum,
              clientName: row.clientName.trim(),
              clientDocument: (row.clientDocument || '').trim(),
              clientPhone: (row.clientPhone || '').trim(),
              date: row.date || new Date().toISOString(),
              total: totalVal,
              paid: paidVal,
              balance: Math.max(0, totalVal - paidVal),
              status: (row.status || 'active').toLowerCase(),
              items: [{ name: "Lote de productos separados", sku: "VAR-LOTE", quantity: 1, sellPrice: totalVal }],
              payments: paidVal > 0 ? [{ date: row.date || new Date().toISOString(), amount: paidVal, method: 'Efectivo', sellerId: 'admin' }] : []
            });
            addedCount++;
          }
        });

        if (addedCount > 0) {
          storageRepository.saveLayaways(allLayaways);
          loadLayaways();
          onDataChange();
          setSuccess(`Se importaron ${addedCount} registros de separado con éxito.${duplicateCount > 0 ? ` Se omitieron ${duplicateCount} duplicados.` : ''}`);
        } else {
          setError('No se agregaron registros nuevos (todos duplicados o vacíos).');
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  useEffect(() => {
    loadLayaways();
    setStores(storageRepository.getStores());
    setNotifLog(notificationService.getLog());
  }, [currentStoreId]);

  const loadLayaways = () => {
    const list = layawayService.getAll(currentStoreId);
    setLayaways(list);
  };

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStoreName = (storeId) => {
    const s = stores.find(store => store.id === storeId);
    return s ? s.name : 'Sede Principal';
  };

  // Filter list
  const filteredLayaways = layaways.filter(l => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      l.layawayNumber.toLowerCase().includes(query) ||
      l.clientName.toLowerCase().includes(query) ||
      (l.clientDocument || '').includes(query) ||
      (l.clientPhone || '').includes(query);

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action handlers
  const handleOpenPayment = (l) => {
    setSelectedLayaway(l);
    setPaymentAmount(l.balance);
    setPaymentMethod('Efectivo');
    setError('');
    setIsPaymentModalOpen(true);
  };

  const handleOpenCancel = (l) => {
    setSelectedLayaway(l);
    setCancelReason('');
    setError('');
    setIsCancelModalOpen(true);
  };

  const handleOpenDetail = (l) => {
    setSelectedLayaway(l);
    setIsDetailModalOpen(true);
  };

  const handleRegisterPaymentSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('El valor del abono debe ser mayor que 0.');
      return;
    }

    try {
      layawayService.registerPayment(selectedLayaway.id, amt, paymentMethod, user.username);
      setSuccess(`Abono de ${formatCOP(amt)} registrado con éxito.`);
      setIsPaymentModalOpen(false);
      loadLayaways();
      onDataChange();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Error al registrar abono.');
    }
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!cancelReason.trim()) {
      setError('Debes especificar un motivo de anulación.');
      return;
    }

    try {
      layawayService.cancelLayaway(selectedLayaway.id, cancelReason);
      setSuccess(`Separación ${selectedLayaway.layawayNumber} anulada correctamente.`);
      setIsCancelModalOpen(false);
      loadLayaways();
      onDataChange();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Error al anular la separación.');
    }
  };

  const handleDeliverProducts = (l) => {
    if (window.confirm('¿Confirmas la entrega de los productos? Esta acción cerrará la separación.')) {
      try {
        const delivered = layawayService.deliverProducts(l.id);
        // Send delivery notification
        try { notificationService.notifyProductReady(delivered || l); } catch (e) { console.warn('Notification error:', e); }
        setSuccess(`Entrega registrada con éxito. Separación finalizada. Se envió notificación al cliente.`);
        setNotifLog(notificationService.getLog());
        loadLayaways();
        onDataChange();
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleNotifyProductReady = (l) => {
    try {
      notificationService.notifyProductReady(l);
      setNotifLog(notificationService.getLog());
      setSuccess(`📣 Notificación de llegada enviada a ${l.clientName}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Error al enviar la notificación: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Filtering Actions */}
      <div className="card-table-wrapper" style={{ padding: '20px 24px' }}>
        <div className="filter-bar">
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: '260px' }}
            placeholder="🔍 Buscar por N° separación, cliente, documento o teléfono..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="active">Separados Activos</option>
            <option value="completed">Entregados</option>
            <option value="cancelled">Anulados</option>
            <option value="all">-- Todos los Estados --</option>
          </select>
        </div>
      </div>

      {/* Acciones Masivas */}
      <div className="card-table-wrapper" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-body)', border: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🛍️</span>
          <div>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>Acciones Masivas de Separados</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carga o descarga de separados y abonos en lote (Sede: {currentStoreId === 'all' ? 'Principal (Defecto)' : 'Tienda actual'})</div>
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

      {success && (
        <div className="alert alert-success">
          <span>✅</span> <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <span>⚠️</span> <span>{error}</span>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid-stats">
        <div className="card-stat">
          <div className="stat-info">
            <span className="stat-label">Separados Activos</span>
            <span className="stat-value">
              {layaways.filter(l => l.status === 'active').length}
            </span>
            <span className="stat-desc">Clientes pagando cuotas</span>
          </div>
          <div className="stat-icon">🛍️</div>
        </div>
        <div className="card-stat gold">
          <div className="stat-info">
            <span className="stat-label">Saldo Pendiente por Cobrar</span>
            <span className="stat-value">
              {formatCOP(layaways.filter(l => l.status === 'active').reduce((sum, l) => sum + l.balance, 0))}
            </span>
            <span className="stat-desc">Cuentas por cobrar activas</span>
          </div>
          <div className="stat-icon">📈</div>
        </div>
        <div className="card-stat green">
          <div className="stat-info">
            <span className="stat-label">Recaudo Total Recibido</span>
            <span className="stat-value">
              {formatCOP(layaways.filter(l => l.status !== 'cancelled').reduce((sum, l) => sum + l.paid, 0))}
            </span>
            <span className="stat-desc">Total acumulado en abonos</span>
          </div>
          <div className="stat-icon">💰</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-table-wrapper">
        <div className="card-header">
          <h3 className="card-title">📋 Registro de Separación de Productos (Abonos)</h3>
          <span className="badge primary">{filteredLayaways.length} resultados</span>
        </div>
        <div className="table-responsive">
          <table className="table-premium">
            <thead>
              <tr>
                <th>N° Registro</th>
                {currentStoreId === 'all' && <th>Tienda</th>}
                <th>Cliente</th>
                <th>Fecha Inicial</th>
                <th>Valor Total</th>
                <th>Abonado</th>
                <th>Saldo Pendiente</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLayaways.length === 0 ? (
                <tr>
                  <td colSpan={currentStoreId === 'all' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron separaciones de productos.
                  </td>
                </tr>
              ) : (
                filteredLayaways.map(l => (
                  <tr key={l.id}>
                    <td>
                      <strong><code>{l.layawayNumber}</code></strong>
                    </td>
                    {currentStoreId === 'all' && (
                      <td style={{ fontSize: '12px' }}>🏬 {getStoreName(l.storeId)}</td>
                    )}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.clientName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ID: {l.clientDocument || '—'} | Cel: {l.clientPhone || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {l.date.split('T')[0]}
                    </td>
                    <td style={{ fontWeight: '600' }}>{formatCOP(l.total)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>{formatCOP(l.paid)}</td>
                    <td style={{ color: l.balance > 0 ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: '700' }}>
                      {formatCOP(l.balance)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[l.status]}`}>
                        {STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleOpenDetail(l)}>
                          👁️ Ver Detalle
                        </button>
                        {l.status === 'active' && (
                          <>
                            {l.balance > 0 ? (
                              <button className="btn btn-primary btn-sm" onClick={() => handleOpenPayment(l)}>
                                💵 Abonar
                              </button>
                            ) : (
                              <button className="btn btn-success btn-sm" onClick={() => handleDeliverProducts(l)}>
                                📦 Entregar
                              </button>
                            )}
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleNotifyProductReady(l)}
                              title="Notificar al cliente que el producto está listo en tienda"
                              style={{ borderColor: 'var(--info, #17a2b8)', color: 'var(--info, #17a2b8)' }}
                            >
                              📣 Notificar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleOpenCancel(l)} title="Anular Separado">
                              ✕ Anular
                            </button>
                          </>
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

      {/* Notification Log Panel */}
      <div className="card-table-wrapper" style={{ padding: '16px 24px' }}>
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowNotifLog(v => !v)}>
          <h3 className="card-title">🔔 Historial de Notificaciones Enviadas</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge primary">{notifLog.length}</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); setShowNotifLog(v => !v); }}
            >
              {showNotifLog ? '▲ Ocultar' : '▼ Ver historial'}
            </button>
          </div>
        </div>
        {showNotifLog && (
          <div className="table-responsive" style={{ marginTop: '12px' }}>
            {notifLog.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No hay notificaciones enviadas aún.</p>
            ) : (
              <table className="table-premium" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Fecha/Hora</th>
                    <th>Tipo</th>
                    <th>Separación</th>
                    <th>Canales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {notifLog.slice(0, 50).map((n, idx) => {
                    const typeLabels = {
                      layaway_created: '🛍️ Separación creada',
                      payment_registered: '💵 Abono registrado',
                      product_ready: '📦 Producto listo'
                    };
                    return (
                      <tr key={n.id || idx}>
                        <td>{n.timestamp ? new Date(n.timestamp).toLocaleString('es-CO') : '—'}</td>
                        <td><span className="badge secondary">{typeLabels[n.type] || n.type}</span></td>
                        <td><code>{n.layawayId || '—'}</code></td>
                        <td>
                          {(n.channels || []).map((ch, ci) => (
                            <span key={ci} className="badge" style={{ marginRight: '4px', background: ch.channel === 'whatsapp' ? '#25D366' : '#0072c6', color: 'white' }}>
                              {ch.channel === 'whatsapp' ? '📱 WA' : '✉️ Email'}
                            </span>
                          ))}
                        </td>
                        <td>
                          {(n.channels || []).every(ch => ch.success)
                            ? <span className="badge success">✅ Enviado</span>
                            : <span className="badge warning">⚠️ Parcial</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 1. Modal: Register Payment (Abonar) */}
      {isPaymentModalOpen && selectedLayaway && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">💵 Registrar Abono de Dinero</h3>
              <button className="modal-close" onClick={() => setIsPaymentModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleRegisterPaymentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && <div className="alert alert-error"><span>⚠️</span> <span>{error}</span></div>}
                
                <div>
                  Separación: <strong>{selectedLayaway.layawayNumber}</strong><br />
                  Cliente: <strong>{selectedLayaway.clientName}</strong><br />
                  Saldo Pendiente: <strong style={{ color: 'var(--secondary)' }}>{formatCOP(selectedLayaway.balance)}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Monto del Abono (COP) *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max={selectedLayaway.balance}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    {paymentMethodsList.map(method => (
                      <option key={method} value={method}>
                        {getPaymentMethodEmoji(method)} {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Abono</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Cancel Layaway (Anular) */}
      {isCancelModalOpen && selectedLayaway && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">✕ Anular Separación</h3>
              <button className="modal-close" onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCancelSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && <div className="alert alert-error"><span>⚠️</span> <span>{error}</span></div>}
                
                <div style={{ color: 'var(--danger)' }}>
                  <strong>¡Atención!</strong> Al anular la separación:
                  <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                    <li>Se cancelará el saldo pendiente de {formatCOP(selectedLayaway.balance)}.</li>
                    <li>Los artículos reservados retornarán al stock de venta.</li>
                  </ul>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo de Anulación *</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '80px' }}
                    placeholder="Ej. El cliente ya no desea la mercancía o excedió el tiempo límite..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsCancelModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-danger">Confirmar Anulación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Detailed View (Ver Detalle) */}
      {isDetailModalOpen && selectedLayaway && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🔍 Detalle de Separación — {selectedLayaway.layawayNumber}</h3>
              <button className="modal-close" onClick={() => setIsDetailModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Client and State details */}
              <div className="grid-2" style={{ fontSize: '13px', background: 'var(--bg-body)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CLIENTE:</span><br />
                  <strong>{selectedLayaway.clientName}</strong><br />
                  Cédula: {selectedLayaway.clientDocument || '—'}<br />
                  Celular: {selectedLayaway.clientPhone || '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>ESTADO COMERCIAL:</span><br />
                  Estado: <span className={`badge ${STATUS_BADGES[selectedLayaway.status]}`}>{STATUS_LABELS[selectedLayaway.status]}</span><br />
                  Fecha Registro: {new Date(selectedLayaway.date).toLocaleString('es-CO')}<br />
                  {selectedLayaway.deliveryDate && <>Fecha Entrega: {new Date(selectedLayaway.deliveryDate).toLocaleDateString('es-CO')}<br /></>}
                  {selectedLayaway.cancelDate && <>Fecha Anulado: {new Date(selectedLayaway.cancelDate).toLocaleDateString('es-CO')}<br />Razón: {selectedLayaway.cancelReason}</>}
                </div>
              </div>

              {/* Reserved Products */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-primary)' }}>👕 Productos Reservados</h4>
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table-premium" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>Precio Unit.</th><th>% Desc</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {selectedLayaway.items.map((item, idx) => {
                        const itemSubtotal = item.sellPrice * item.quantity;
                        const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
                        const itemTotal = itemSubtotal - itemDiscount;

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{item.name}</td>
                            <td><code>{item.sku}</code></td>
                            <td>{item.quantity} uds</td>
                            <td>{formatCOP(item.sellPrice)}</td>
                            <td>{item.discount}%</td>
                            <td style={{ fontWeight: '700' }}>{formatCOP(itemTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-primary)' }}>💳 Historial de Abonos Recibidos</h4>
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table-premium" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr><th>Fecha/Hora Abono</th><th>Monto Abono</th><th>Método Pago</th><th>Registrado por</th></tr>
                    </thead>
                    <tbody>
                      {selectedLayaway.payments.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No se han registrado abonos aún.</td></tr>
                      ) : (
                        selectedLayaway.payments.map((p, idx) => (
                          <tr key={idx}>
                            <td>{new Date(p.date).toLocaleString('es-CO')}</td>
                            <td style={{ color: 'var(--success)', fontWeight: '700' }}>{formatCOP(p.amount)}</td>
                            <td><span className="badge secondary">{p.method}</span></td>
                            <td><code>{p.sellerId}</code></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Balances summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>Total: <strong>{formatCOP(selectedLayaway.total)}</strong></div>
                <div style={{ color: 'var(--success)' }}>Abonado: <strong>{formatCOP(selectedLayaway.paid)}</strong></div>
                <div style={{ color: 'var(--secondary)' }}>Saldo Pendiente: <strong>{formatCOP(selectedLayaway.balance)}</strong></div>
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
