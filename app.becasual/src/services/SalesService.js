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

  getAll() {
    return storageRepository.getSales();
  }

  getActive() {
    return this.getAll().filter(s => !s.cancelled);
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
    const { items, paymentMethod, clientName, sellerId } = saleData;

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
      paymentMethod: paymentMethod || 'Efectivo',
      clientName: (clientName || 'Cliente Final').trim(),
      sellerId: sellerId || 'admin'
    };

    sales.unshift(newSale); // Newest first
    storageRepository.saveSales(sales);
    return newSale;
  }

  // Get aggregated financial stats for dashboard (only non-cancelled)
  getFinancialStats() {
    const sales = this.getAll().filter(s => !s.cancelled);
    const purchases = storageRepository.getPurchases();
    const products = inventoryService.getAll();

    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalSalesProfit = sales.reduce((sum, s) => sum + s.profit, 0);
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
  getDailySalesSummary(dateStr) {
    const sales = this.getAll();
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate === dateStr;
    });

    let total = 0;
    let cost = 0;
    let profit = 0;
    const breakdown = {
      Efectivo: 0,
      Tarjeta: 0,
      Transferencia: 0
    };

    filteredSales.forEach(s => {
      total += s.total;
      cost += s.cost;
      profit += s.profit;
      const pm = s.paymentMethod || 'Efectivo';
      if (breakdown[pm] !== undefined) {
        breakdown[pm] += s.total;
      } else {
        breakdown[pm] = s.total;
      }
    });

    return {
      date: dateStr,
      salesCount: filteredSales.length,
      total,
      cost,
      profit,
      breakdown
    };
  }

  getDailyClosings() {
    return storageRepository.getClosings();
  }

  registerDailyClosing(closingData) {
    const closings = this.getDailyClosings();
    const existingIndex = closings.findIndex(c => c.date === closingData.date);

    const newClosing = {
      id: `closing_${Date.now()}`,
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
}

export const salesService = new SalesService();
