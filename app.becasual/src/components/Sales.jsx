import React, { useState, useEffect, useRef } from 'react';
import { inventoryService } from '../services/InventoryService';
import { salesService } from '../services/SalesService';

export default function Sales({ user, onSaleSuccess }) {
  const [catalog, setCatalog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // Checkout details
  const [clientName, setClientName] = useState('Cliente Final');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // UX Alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const barcodeRef = useRef(null);

  useEffect(() => {
    loadCatalog();
  }, [searchQuery]);

  const loadCatalog = () => {
    // Only search products that actually have stock
    const products = inventoryService.search({ query: searchQuery, stockStatus: 'in' });
    setCatalog(products.slice(0, 10)); // limit visible items for responsiveness
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!barcodeInput.trim()) return;

    const product = inventoryService.getByBarcode(barcodeInput.trim());
    if (product) {
      if (product.stock <= 0) {
        setError(`El producto "${product.name}" está agotado.`);
      } else {
        addToCart(product);
        setSuccessMsg(`Añadido: ${product.name}`);
      }
    } else {
      setError(`Código de barras "${barcodeInput}" no encontrado.`);
    }
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const addToCart = (product) => {
    setError('');
    setSuccessMsg('');

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + 1;
      if (newQty > product.stock) {
        setError(`No hay suficiente stock para "${product.name}". Disp: ${product.stock}`);
        return;
      }
      
      const newCart = [...cart];
      newCart[existingIndex].quantity = newQty;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setError('');
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;

    const newQty = cart[itemIndex].quantity + delta;
    const product = cart[itemIndex].product;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      if (newQty > product.stock) {
        setError(`Stock insuficiente. Stock disponible: ${product.stock}`);
        return;
      }
      const newCart = [...cart];
      newCart[itemIndex].quantity = newQty;
      setCart(newCart);
    }
  };

  const updateDiscount = (productId, discountVal) => {
    const discount = Math.max(0, Math.min(100, Number(discountVal) || 0));
    setCart(cart.map(item => 
      item.product.id === productId ? { ...item, discount } : item
    ));
  };

  const calculateCartSummary = () => {
    // Rely on Strategy calculation inside salesService
    const billing = salesService.billingStrategy.calculate(cart);
    return billing;
  };

  const handleCheckout = () => {
    setError('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setError('El carrito está vacío.');
      return;
    }

    try {
      const sale = salesService.registerSale({
        items: cart,
        paymentMethod,
        clientName,
        sellerId: user.username
      });

      setSuccessMsg(`¡Venta realizada con éxito! Factura: ${sale.invoiceNumber}`);
      setCart([]);
      setClientName('Cliente Final');
      setPaymentMethod('Efectivo');
      onSaleSuccess(); // Notify layout/app
    } catch (err) {
      setError(err.message || 'Error al completar la venta.');
    }
  };

  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const summary = calculateCartSummary();

  return (
    <div className="pos-container">
      {/* Catalog / Product List */}
      <div className="pos-catalog">
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Simulated Scanner Form */}
          <form onSubmit={handleBarcodeSubmit} style={{ flex: '1', display: 'flex', gap: '8px' }}>
            <input
              ref={barcodeRef}
              type="text"
              className="form-control"
              placeholder="📟 Escanear código barras (Simulador)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
            <button type="submit" className="btn btn-outline" style={{ padding: '0 16px' }}>Buscar</button>
          </form>
          
          <input
            type="text"
            className="form-control"
            placeholder="🔎 Escribir nombre producto..."
            style={{ flex: '1' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: '4px 0' }}>
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ margin: '4px 0' }}>
            <span>✅</span> <span>{successMsg}</span>
          </div>
        )}

        <h4 style={{ margin: '12px 0 4px 0', color: 'var(--text-primary)' }}>Catálogo Disponible</h4>
        <div className="table-responsive" style={{ flex: '1', overflowY: 'auto' }}>
          <table className="table-premium" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Cód / SKU</th>
                <th>Nombre</th>
                <th>Talla</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {catalog.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay productos disponibles.
                  </td>
                </tr>
              ) : (
                catalog.map(p => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.barcode}</code>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>{p.size}</td>
                    <td style={{ color: 'var(--secondary)', fontWeight: '600' }}>{formatCOP(p.sellPrice)}</td>
                    <td><span className="badge success">{p.stock} uds</span></td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => addToCart(p)}>
                        ➕ Añadir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="pos-cart">
        <h3 className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>🛒 Carrito de Compras</span>
          <span className="badge primary">{cart.reduce((sum, i) => sum + i.quantity, 0)} uds</span>
        </h3>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
              El carrito está vacío
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item.product.id}>
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.product.name}</span>
                  <span className="cart-item-price">
                    {formatCOP(item.product.sellPrice)} c/u
                  </span>
                  
                  {/* Discount input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>% Desc:</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '50px', padding: '2px 4px', fontSize: '11px', height: '22px' }}
                      value={item.discount || ''}
                      placeholder="0"
                      onChange={(e) => updateDiscount(item.product.id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => updateQuantity(item.product.id, -1)}>−</button>
                  <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button className="qty-btn" onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-summary">
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Nombre del Cliente</label>
            <input
              type="text"
              className="form-control"
              style={{ padding: '8px 12px' }}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Método de Pago</label>
            <select
              className="form-control"
              style={{ padding: '8px 12px' }}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Efectivo">💵 Efectivo</option>
              <option value="Tarjeta">💳 Tarjeta Débito/Crédito</option>
              <option value="Transferencia">📱 Transferencia Nequi/Daviplata</option>
            </select>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="summary-row">
              <span>Base Imponible:</span>
              <span>{formatCOP(summary.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Descuento Aplicado:</span>
              <span style={{ color: 'var(--danger)' }}>-{formatCOP(summary.discount)}</span>
            </div>
            <div className="summary-row">
              <span>IVA (19%):</span>
              <span>{formatCOP(summary.tax)}</span>
            </div>
            <div className="summary-row total">
              <span>Total a Pagar:</span>
              <span>{formatCOP(summary.total)}</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '8px' }}
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            🏁 Registrar y Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}
