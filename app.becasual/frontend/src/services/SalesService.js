import { storageRepository } from './StorageRepository';
import { inventoryService } from './InventoryService';
import { api } from './api.js';

// Strategy Pattern for pricing calculation
class BillingStrategy {
  calculate(items, taxRate = 19) {
    throw new Error('Calculate method must be implemented');
  }
}

class StandardBillingStrategy extends BillingStrategy {
  calculate(items, taxRate = 19) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCost = 0;

    items.forEach(item => {
      const itemSubtotal = item.product.sellPrice * item.quantity;
      
      let discountAmount = 0;
      if (item.discountType === 'fixed') {
        discountAmount = Number(item.discountValue || item.discount || 0);
      } else {
        const discVal = Number(item.discountValue !== undefined ? item.discountValue : (item.discount || 0));
        discountAmount = itemSubtotal * (discVal / 100);
      }
      
      subtotal += itemSubtotal - discountAmount;
      totalDiscount += discountAmount;
      totalCost += (item.product.costPrice || 0) * item.quantity;
    });

    const taxPercentage = taxRate / 100;
    const baseAmount = subtotal / (1 + taxPercentage);
    const taxAmount = subtotal - baseAmount;

    return {
      subtotal: Number(baseAmount.toFixed(2)),
      tax: Number(taxAmount.toFixed(2)),
      total: Number(subtotal.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      profit: Number((subtotal - totalCost).toFixed(2))
    };
  }
}

class SalesService {
  constructor() {
    this.billingStrategy = new StandardBillingStrategy();
  }

  setBillingStrategy(strategy) {
    this.billingStrategy = strategy;
  }

  getAll(storeId = 'all') {
    const sales = storageRepository.getSales();

    // Normalizar costo y ganancia (profit) para cualquier consulta de ventas
    sales.forEach(s => {
      if (s.profit === undefined || s.profit === null || s.cost === undefined || s.cost === null) {
        const details = s.items || s.details || [];
        const cost = details.reduce((sum, d) => {
          const costPrice = d.costPrice !== undefined 
            ? d.costPrice 
            : (d.product ? (d.product.costPrice || 0) : 0);
          const qty = d.quantity || 1;
          return sum + (costPrice * qty);
        }, 0);
        s.cost = cost;
        s.profit = s.total - cost;
      }
    });

    if (storeId === 'all') return sales;
    return sales.filter(s => s.storeId === storeId || (!s.storeId && storeId === 'store_1'));
  }

  getActive(storeId = 'all') {
    return this.getAll(storeId).filter(s => !s.cancelled);
  }

  cancelSale(saleId, reason) {
    const sales = storageRepository.getSales();
    const index = sales.findIndex(s => s.id === saleId);
    if (index === -1) throw new Error('Factura no encontrada.');
    if (sales[index].cancelled) throw new Error('Esta factura ya fue anulada.');

    // Restablecer stock local
    sales[index].items.forEach(item => {
      const product = inventoryService.getById(item.productId);
      if (product) {
        inventoryService.update(product.id, { stock: product.stock + item.quantity });
      }
    });

    sales[index].cancelled = true;
    sales[index].cancelReason = reason || 'Anulada por usuario';
    sales[index].cancelDate = new Date().toISOString();
    storageRepository.saveSales(sales);
    return sales[index];
  }

  registerSale(saleData) {
    const { items, paymentMethod, clientName, clientDocument, sellerId, storeId } = saleData;

    if (!items || items.length === 0) {
      throw new Error('La venta debe tener al menos un artículo.');
    }

    const config = storageRepository.getConfig();
    const taxRate = Number(config.taxRate) || 19;

    // 1. Restar inventario local
    const productsToUpdate = [];
    items.forEach(item => {
      const product = inventoryService.getById(item.product.id);
      if (!product) {
        throw new Error(`El producto "${item.product.name}" ya no existe en el inventario.`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
      }
      productsToUpdate.push({
        id: product.id,
        newStock: product.stock - item.quantity
      });
    });

    productsToUpdate.forEach(item => {
      inventoryService.update(item.id, { stock: item.newStock });
    });

    // 2. Calcular valores
    const billing = this.billingStrategy.calculate(items, taxRate);

    // 3. Crear registro local
    const sales = storageRepository.getSales();
    const newSale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `FAC-${1000 + sales.length + 1}`,
      storeId: storeId || 'store_1',
      date: new Date().toISOString(),
      items: items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        sku: item.product.sku,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        sellPrice: item.product.sellPrice,
        discount: item.discount || 0,
        discountType: item.discountType || 'percent',
        discountValue: item.discountValue || 0
      })),
      ...billing,
      paymentMethod: (saleData.payments && saleData.payments.length > 0) 
        ? saleData.payments.map(p => p.method).join(', ') 
        : (paymentMethod || 'Efectivo'),
      payments: saleData.payments || [{ method: paymentMethod || 'Efectivo', amount: billing.total }],
      clientName: (clientName || 'Cliente Final').trim(),
      sellerId: sellerId || 'admin'
    };

    sales.unshift(newSale);
    storageRepository.saveSales(sales);

    // 4. Persistencia asíncrona en GCP (background)
    const payload = {
      storeId: storeId || 'store_1',
      invoiceNumber: newSale.invoiceNumber,
      clientName: newSale.clientName,
      clientDocument: clientDocument || null,
      employeeId: sellerId || 'emp_1',
      paymentMethod: newSale.paymentMethod,
      total: billing.total,
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.sellPrice,
        subtotal: (item.product.sellPrice * item.quantity) - ((item.product.sellPrice * item.quantity) * ((item.discount || 0) / 100))
      }))
    };
    api.post('/sales', payload).catch(err => {
      console.error('Error al persistir venta en GCP background:', err);
    });

    return newSale;
  }

  getFinancialStats(storeId = 'all') {
    const sales = this.getAll(storeId).filter(s => !s.cancelled);

    const purchases = storageRepository.getPurchases().filter(p => storeId === 'all' || p.storeId === storeId || (!p.storeId && storeId === 'store_1'));
    const products = inventoryService.getAll(storeId);
    const layaways = storageRepository.getLayaways().filter(l => l.status !== 'cancelled' && (storeId === 'all' || l.storeId === storeId || (!l.storeId && storeId === 'store_1')));
    
    let layawayRevenue = 0;
    let layawayProfit = 0;
    layaways.forEach(l => {
      if (l.total > 0) {
        const itemsArr = Array.isArray(l.products) ? l.products : [];
        const totalCost = itemsArr.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
        const totalProfit = l.total - totalCost;
        const profitRatio = totalProfit / l.total;
        
        const paymentsArr = Array.isArray(l.payments) ? l.payments : [];
        paymentsArr.forEach(p => {
          layawayRevenue += p.amount;
          layawayProfit += p.amount * profitRatio;
        });
      }
    });

    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0) + layawayRevenue;
    const totalSalesProfit = sales.reduce((sum, s) => sum + s.profit, 0) + layawayProfit;
    const totalPurchasesCost = purchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

    const totalInventoryValueCost = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);
    const totalInventoryValueSell = products.reduce((sum, p) => sum + (p.sellPrice * p.stock), 0);

    return {
      totalSalesRevenue,
      totalSalesProfit,
      totalPurchasesCost,
      totalInventoryValueCost,
      totalInventoryValueSell,
      salesCount: sales.length,
      purchasesCount: purchases.length
    };
  }

  getTopSellingProducts(startDateStr, endDateStr, storeId = 'all', limit = 10) {
    const sales = this.getAll(storeId).filter(s => {
      if (s.cancelled) return false;
      if (!s.date) return true;
      const saleDateStr = s.date.split('T')[0];
      if (startDateStr && saleDateStr < startDateStr) return false;
      if (endDateStr && saleDateStr > endDateStr) return false;
      return true;
    });

    const productSalesMap = new Map();

    sales.forEach(sale => {
      const items = sale.items || sale.details || [];
      items.forEach(item => {
        const productId = item.productId;
        if (!productId) return;

        // Intentar resolver desde el catálogo local
        let prod = item.product;
        if (!prod) {
          prod = inventoryService.getById(productId) || inventoryService.getByBarcode(productId);
        }

        const cleanProductId = productId.replace('prod_generico_', '').replace(/\*/g, '').trim();
        const name = prod ? prod.name : (item.name || 'Producto Genérico');
        let barcode = prod ? prod.barcode : (item.barcode || '');
        let sku = prod ? prod.sku : (item.sku || barcode);

        // Fallbacks defensivos si quedan vacíos, nulos o "unknown"
        if (!sku || sku === 'unknown') {
          sku = cleanProductId || 'unknown';
        }
        if (!barcode || barcode === 'unknown') {
          barcode = cleanProductId || 'unknown';
        }

        const qty = Number(item.quantity) || 0;
        const price = Number(item.price || item.sellPrice) || 0;
        const subtotal = Number(item.subtotal) || (qty * price);

        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            productId,
            name,
            sku,
            barcode,
            quantity: 0,
            totalRevenue: 0
          });
        }

        const stats = productSalesMap.get(productId);
        stats.quantity += qty;
        stats.totalRevenue += subtotal;
      });
    });

    return [...productSalesMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  getDailySalesSummary(dateStr, storeId = 'all') {
    const sales = this.getAll(storeId);
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate === dateStr;
    });

    const layaways = storageRepository.getLayaways().filter(l => l.status !== 'cancelled' && (storeId === 'all' || l.storeId === storeId || (!l.storeId && storeId === 'store_1')));

    let total = 0;
    let cost = 0;
    let profit = 0;
    const breakdown = {
      Efectivo: 0,
      Nequi: 0,
      Daviplata: 0,
      SisteCredito: 0,
      Addi: 0,
      Bold: 0
    };

    const mapPaymentMethod = (pm) => {
      if (!pm) return 'Efectivo';
      const cleanPm = pm.trim();
      if (cleanPm === 'Tarjeta' || cleanPm === 'Tarjeta de Crédito' || cleanPm === 'Tarjeta de Ahorro') return 'Bold';
      if (cleanPm === 'Transferencia') return 'Nequi';
      if (cleanPm === 'Sistecrédito' || cleanPm === 'Sistecredito') return 'SisteCredito';
      return cleanPm;
    };

    filteredSales.forEach(s => {
      total += s.total;
      cost += s.cost;
      profit += s.profit;
      
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach(pay => {
          const pm = mapPaymentMethod(pay.method);
          if (breakdown[pm] !== undefined) {
            breakdown[pm] += pay.amount;
          } else {
            breakdown[pm] = pay.amount;
          }
        });
      } else {
        const pm = mapPaymentMethod(s.paymentMethod);
        if (breakdown[pm] !== undefined) {
          breakdown[pm] += s.total;
        } else {
          breakdown[pm] = s.total;
        }
      }
    });

    layaways.forEach(l => {
      if (l.total > 0) {
        const itemsArr = Array.isArray(l.products) ? l.products : [];
        const totalCost = itemsArr.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
        const totalProfit = l.total - totalCost;
        const profitRatio = totalProfit / l.total;
        const costRatio = totalCost / l.total;

        const paymentsArr = Array.isArray(l.payments) ? l.payments : [];
        paymentsArr.forEach(pay => {
          const payDate = pay.date.split('T')[0];
          if (payDate === dateStr) {
            const payAmount = pay.amount;
            total += payAmount;
            profit += payAmount * profitRatio;
            cost += payAmount * costRatio;
            
            const pm = mapPaymentMethod(pay.method);
            if (breakdown[pm] !== undefined) {
              breakdown[pm] += payAmount;
            } else {
              breakdown[pm] = payAmount;
            }
          }
        });
      }
    });

    return {
      date: dateStr,
      salesCount: filteredSales.length,
      total: Number(total.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      breakdown: {
        Efectivo: Number((breakdown.Efectivo || 0).toFixed(2)),
        Nequi: Number((breakdown.Nequi || 0).toFixed(2)),
        Daviplata: Number((breakdown.Daviplata || 0).toFixed(2)),
        SisteCredito: Number((breakdown.SisteCredito || 0).toFixed(2)),
        Addi: Number((breakdown.Addi || 0).toFixed(2)),
        Bold: Number((breakdown.Bold || 0).toFixed(2))
      }
    };
  }

  getDailyClosings(storeId = 'all') {
    const closings = storageRepository.getClosings();
    if (storeId === 'all') return closings;
    return closings.filter(c => c.storeId === storeId || (!c.storeId && storeId === 'store_1'));
  }

  registerDailyClosing(closingData, storeId = 'store_1') {
    const closings = storageRepository.getClosings();
    const existingIndex = closings.findIndex(c => c.date === closingData.date && (c.storeId === storeId || (!c.storeId && storeId === 'store_1')));

    const newClosing = {
      id: `closing_${Date.now()}`,
      storeId,
      timestamp: new Date().toISOString(),
      ...closingData
    };

    if (existingIndex > -1) {
      closings[existingIndex] = newClosing;
    } else {
      closings.unshift(newClosing);
    }

    storageRepository.saveClosings(closings);

    // Persistencia asíncrona en GCP (background)
    const payload = {
      storeId,
      cashCollected: closingData.cashCollected,
      cardCollected: closingData.cardCollected,
      digitalCollect: closingData.digitalCollect
    };
    api.post('/closings', payload).catch(err => {
      console.error('Error al registrar cierre de caja en GCP:', err);
    });

    return newClosing;
  }

  processReturn(saleId, returnedItems, refundPayments, reason) {
    console.log('processReturn mock call:', saleId, returnedItems, refundPayments, reason);
    return true;
  }
}

export const salesService = new SalesService();
