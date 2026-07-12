import { api } from './api.js';
import { inventoryService } from './InventoryService';
import { purchaseService } from './PurchaseService';
import { layawayService } from './LayawayService';
import { storageRepository } from './StorageRepository'; // Se mantiene para config e IVA

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

  async getAll(storeId = 'all') {
    const sales = await api.get(`/sales?storeId=${storeId}`);
    return sales;
  }

  async getActive(storeId = 'all') {
    const sales = await this.getAll(storeId);
    return sales.filter(s => !s.cancelled);
  }

  async cancelSale(saleId, reason) {
    // En una iteración posterior se puede implementar DELETE /api/sales/:id
    // Por ahora simulamos la anulación informando en consola
    console.log('cancelSale mock backend call:', saleId, reason);
    return { id: saleId, cancelled: true };
  }

  async registerSale(saleData) {
    const { items, paymentMethod, clientName, clientDocument, sellerId, storeId } = saleData;

    if (!items || items.length === 0) {
      throw new Error('La venta debe tener al menos un artículo.');
    }

    const config = storageRepository.getConfig();
    const taxRate = Number(config.taxRate) || 19;
    const billing = this.billingStrategy.calculate(items, taxRate);

    // Mapear el payload esperado por el endpoint POST /api/sales
    const payload = {
      storeId: storeId || 'store_1',
      invoiceNumber: `FAC-${Date.now().toString().slice(-6)}`,
      clientName: clientName || 'Cliente Final',
      clientDocument: clientDocument || null,
      employeeId: sellerId || 'emp_1',
      paymentMethod: (saleData.payments && saleData.payments.length > 0)
        ? saleData.payments.map(p => p.method).join(', ')
        : (paymentMethod || 'Efectivo'),
      total: billing.total,
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.sellPrice,
        subtotal: (item.product.sellPrice * item.quantity) - ((item.product.sellPrice * item.quantity) * ((item.discount || 0) / 100))
      }))
    };

    const response = await api.post('/sales', payload);
    return response;
  }

  async getFinancialStats(storeId = 'all') {
    const sales = await this.getActive(storeId);
    const purchases = await purchaseService.getAll(storeId);
    const products = await inventoryService.getAll(storeId);
    const layaways = await layawayService.getAll(storeId);

    let layawayRevenue = 0;
    let layawayProfit = 0;
    layaways.forEach(l => {
      if (l.total > 0 && l.status !== 'cancelled') {
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
    // En las ventas de la API, podemos calcular la ganancia sumando la diferencia de precio y costo de los detalles
    let salesProfit = 0;
    sales.forEach(s => {
      const details = s.details || [];
      const cost = details.reduce((sum, d) => sum + ((d.product?.costPrice || 0) * d.quantity), 0);
      salesProfit += s.total - cost;
    });
    const totalSalesProfit = salesProfit + layawayProfit;
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

  async getDailySalesSummary(dateStr, storeId = 'all') {
    const sales = await this.getAll(storeId);
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate === dateStr;
    });

    const layaways = await layawayService.getAll(storeId);

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
      const details = s.details || [];
      const sCost = details.reduce((sum, d) => sum + ((d.product?.costPrice || 0) * d.quantity), 0);
      cost += sCost;
      profit += s.total - sCost;
      
      const pm = mapPaymentMethod(s.paymentMethod);
      if (breakdown[pm] !== undefined) {
        breakdown[pm] += s.total;
      } else {
        breakdown[pm] = s.total;
      }
    });

    // Add layaway payments made on this date
    layaways.forEach(l => {
      if (l.total > 0 && l.status !== 'cancelled') {
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

  async getDailyClosings(storeId = 'all') {
    const closings = await api.get(`/closings?storeId=${storeId}`);
    return closings;
  }

  async registerDailyClosing(closingData, storeId = 'store_1') {
    const payload = {
      storeId,
      cashCollected: closingData.cashCollected,
      cardCollected: closingData.cardCollected,
      digitalCollect: closingData.digitalCollect
    };
    const newClosing = await api.post('/closings', payload);
    return newClosing;
  }

  async processReturn(saleId, returnedItems, refundPayments, reason) {
    console.log('processReturn mock call:', saleId, returnedItems, refundPayments, reason);
    return true;
  }
}

export const salesService = new SalesService();
