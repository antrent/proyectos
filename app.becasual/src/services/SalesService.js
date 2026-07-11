import { storageRepository } from './StorageRepository';
import { inventoryService } from './InventoryService';

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
      const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
      
      subtotal += itemSubtotal - discountAmount;
      totalDiscount += discountAmount;
      totalCost += (item.product.costPrice || 0) * item.quantity;
    });

    const taxPercentage = taxRate / 100;
    // Subtotal already contains taxes in final consumer price (standard retail pricing in Colombia/LatinAmerica usually list sellPrice inclusive of tax)
    // Let's assume sellPrice is inclusive of tax, so we back-calculate tax and base
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

    // Restore inventory stock for each item
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
    const { items, paymentMethod, clientName, sellerId, storeId } = saleData;

    if (!items || items.length === 0) {
      throw new Error('La venta debe tener al menos un artículo.');
    }

    const config = storageRepository.getConfig();
    const taxRate = Number(config.taxRate) || 19;

    // Validate stock and verify items
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

    // Deduct inventory
    productsToUpdate.forEach(item => {
      inventoryService.update(item.id, { stock: item.newStock });
    });

    // Calculate billing
    const billing = this.billingStrategy.calculate(items, taxRate);

    // Create sale record
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
        discount: item.discount || 0
      })),
      ...billing,
      paymentMethod: (saleData.payments && saleData.payments.length > 0) 
        ? saleData.payments.map(p => p.method).join(', ') 
        : (paymentMethod || 'Efectivo'),
      payments: saleData.payments || [{ method: paymentMethod || 'Efectivo', amount: billing.total }],
      clientName: (clientName || 'Cliente Final').trim(),
      sellerId: sellerId || 'admin'
    };

    sales.unshift(newSale); // Newest first
    storageRepository.saveSales(sales);
    return newSale;
  }

  // Get aggregated financial stats for dashboard (only non-cancelled)
  getFinancialStats(storeId = 'all') {
    const sales = this.getAll(storeId).filter(s => !s.cancelled);
    const purchases = storageRepository.getPurchases().filter(p => storeId === 'all' || p.storeId === storeId || (!p.storeId && storeId === 'store_1'));
    const products = inventoryService.getAll(storeId);

    // Add layaways revenue and profit proportionately
    const layaways = storageRepository.getLayaways().filter(l => l.status !== 'cancelled' && (storeId === 'all' || l.storeId === storeId || (!l.storeId && storeId === 'store_1')));
    
    let layawayRevenue = 0;
    let layawayProfit = 0;
    layaways.forEach(l => {
      if (l.total > 0) {
        const totalCost = l.items.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
        const totalProfit = l.total - totalCost;
        const profitRatio = totalProfit / l.total;
        
        l.payments.forEach(p => {
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

    // Add layaway payments made on this date
    layaways.forEach(l => {
      if (l.total > 0) {
        const totalCost = l.items.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
        const totalProfit = l.total - totalCost;
        const profitRatio = totalProfit / l.total;
        const costRatio = totalCost / l.total;

        l.payments.forEach(pay => {
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
    return newClosing;
  }

  processReturn(saleId, returnedItems, refundPayments, reason) {
    const sales = storageRepository.getSales();
    const index = sales.findIndex(s => s.id === saleId);
    if (index === -1) throw new Error('Factura no encontrada.');
    const sale = sales[index];
    if (sale.cancelled) throw new Error('No se pueden realizar devoluciones de una factura anulada.');

    // Initialize payments if missing (for legacy or imported sales)
    if (!sale.payments) {
      sale.payments = [{ method: sale.paymentMethod || 'Efectivo', amount: sale.total }];
    }

    // Validate that the returned quantities do not exceed current item quantities
    returnedItems.forEach(ret => {
      const saleItem = sale.items.find(i => i.productId === ret.productId);
      if (!saleItem) throw new Error(`El producto no existe en esta factura.`);
      if (ret.quantity > saleItem.quantity) {
        throw new Error(`La cantidad a devolver de "${saleItem.name}" (${ret.quantity}) supera la cantidad disponible (${saleItem.quantity}).`);
      }
    });

    // Validate that the sum of refund payments equals the calculated total refund
    let totalRefund = 0;
    returnedItems.forEach(ret => {
      const saleItem = sale.items.find(i => i.productId === ret.productId);
      const itemSubtotal = saleItem.sellPrice * ret.quantity;
      const discountAmount = itemSubtotal * ((saleItem.discount || 0) / 100);
      totalRefund += (itemSubtotal - discountAmount);
    });

    // Check refund payments sum
    const totalRefundPayments = refundPayments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalRefundPayments - totalRefund) > 0.01) {
      throw new Error(`La suma de los métodos de pago de devolución (${totalRefundPayments.toFixed(2)}) debe ser igual al total a reembolsar (${totalRefund.toFixed(2)}).`);
    }

    // Now apply return changes:
    // 1. Restore product stock in inventory
    returnedItems.forEach(ret => {
      const product = inventoryService.getById(ret.productId);
      if (product) {
        inventoryService.update(product.id, { stock: product.stock + ret.quantity });
      }
    });

    // 2. Update item quantities and returnedQuantity in the sale
    returnedItems.forEach(ret => {
      const saleItem = sale.items.find(i => i.productId === ret.productId);
      saleItem.quantity -= ret.quantity;
      saleItem.returnedQuantity = (saleItem.returnedQuantity || 0) + ret.quantity;
    });

    // 3. Deduct from sale payments
    refundPayments.forEach(ref => {
      if (sale.payments && sale.payments.length > 0) {
        const payEntry = sale.payments.find(p => p.method === ref.method);
        if (payEntry) {
          payEntry.amount = Number((payEntry.amount - ref.amount).toFixed(2));
        }
      }
    });

    // Recalculate sale totals based on remaining items
    const taxRate = 19; // Default tax rate
    let newSubtotal = 0;
    let newTotalDiscount = 0;
    let newTotalCost = 0;

    sale.items.forEach(item => {
      const itemSubtotal = item.sellPrice * item.quantity;
      const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
      newSubtotal += itemSubtotal - discountAmount;
      newTotalDiscount += discountAmount;
      newTotalCost += (item.costPrice || 0) * item.quantity;
    });

    const taxPercentage = taxRate / 100;
    const baseAmount = newSubtotal / (1 + taxPercentage);
    const taxAmount = newSubtotal - baseAmount;

    sale.subtotal = Number(baseAmount.toFixed(2));
    sale.tax = Number(taxAmount.toFixed(2));
    sale.total = Number(newSubtotal.toFixed(2));
    sale.discount = Number(newTotalDiscount.toFixed(2));
    sale.cost = Number(newTotalCost.toFixed(2));
    sale.profit = Number((newSubtotal - newTotalCost).toFixed(2));

    // Update main paymentMethod text to reflect active payments
    if (sale.payments) {
      sale.payments = sale.payments.filter(p => p.amount > 0);
      sale.paymentMethod = sale.payments.map(p => p.method).join(', ') || 'Sin pago';
    }

    // 4. Log the return in sale.returns
    sale.returns = sale.returns || [];
    sale.returns.push({
      id: `ret_${Date.now()}`,
      date: new Date().toISOString(),
      reason: reason || 'Devolución de productos',
      items: returnedItems.map(ret => {
        const saleItem = sale.items.find(i => i.productId === ret.productId);
        return {
          productId: ret.productId,
          name: ret.name,
          quantity: ret.quantity,
          refundAmount: (saleItem.sellPrice * ret.quantity) * (1 - (saleItem.discount || 0) / 100)
        };
      }),
      refundPayments: refundPayments
    });

    storageRepository.saveSales(sales);
    return sale;
  }
}

export const salesService = new SalesService();
