import { storageRepository } from './StorageRepository';
import { inventoryService } from './InventoryService';
import { salesService } from './SalesService';

class LayawayService {
  getAll(storeId = 'all') {
    const layaways = storageRepository.getLayaways();
    if (storeId === 'all') {
      return layaways;
    }
    return layaways.filter(l => l.storeId === storeId || (!l.storeId && storeId === 'store_1'));
  }

  getById(id) {
    const layaways = storageRepository.getLayaways();
    return layaways.find(l => l.id === id) || null;
  }

  createLayaway(layawayData, storeId) {
    const { clientName, clientPhone, clientDocument, items, initialPayment, paymentMethod, sellerId } = layawayData;

    if (!items || items.length === 0) {
      throw new Error('La separación debe contener al menos un artículo.');
    }

    const initialAmount = Number(initialPayment) || 0;
    if (initialAmount < 0) {
      throw new Error('El abono inicial no puede ser negativo.');
    }

    // Calculate total price with discounts using standard billing strategy
    const billing = salesService.billingStrategy.calculate(items);
    const total = billing.total;

    if (initialAmount > total) {
      throw new Error('El abono inicial no puede ser mayor que el total a pagar.');
    }

    // Validate stock and reserve items
    const productsToUpdate = [];
    items.forEach(item => {
      const product = inventoryService.getById(item.product.id);
      if (!product) {
        throw new Error(`El producto "${item.product.name}" ya no existe en el inventario.`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para reservar "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
      }
      productsToUpdate.push({
        id: product.id,
        newStock: product.stock - item.quantity
      });
    });

    // Deduct stock immediately (reserve)
    productsToUpdate.forEach(item => {
      inventoryService.update(item.id, { stock: item.newStock });
    });

    const layaways = storageRepository.getLayaways();

    const newLayaway = {
      id: `lay_${Date.now()}`,
      layawayNumber: `SEP-${1000 + layaways.length + 1}`,
      storeId,
      clientName: clientName.trim(),
      clientPhone: (clientPhone || '').trim(),
      clientDocument: (clientDocument || '').trim(),
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
      total,
      paid: initialAmount,
      balance: Number((total - initialAmount).toFixed(2)),
      payments: initialAmount > 0 ? [{
        id: `pay_${Date.now()}_init`,
        date: new Date().toISOString(),
        amount: initialAmount,
        method: paymentMethod || 'Efectivo',
        sellerId: sellerId || 'admin'
      }] : [],
      status: 'active', // 'active', 'completed', 'cancelled'
      deliveryDate: null,
      sellerId: sellerId || 'admin'
    };

    layaways.unshift(newLayaway);
    storageRepository.saveLayaways(layaways);
    return newLayaway;
  }

  registerPayment(layawayId, amount, paymentMethod, sellerId) {
    const amountVal = Number(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      throw new Error('El valor del abono debe ser mayor a 0.');
    }

    const layaways = storageRepository.getLayaways();
    const index = layaways.findIndex(l => l.id === layawayId);
    
    if (index === -1) throw new Error('Separación no encontrada.');
    const layaway = layaways[index];
    
    if (layaway.status !== 'active') {
      throw new Error(`Esta separación no está activa. Estado actual: ${layaway.status}`);
    }

    if (amountVal > layaway.balance) {
      throw new Error(`El abono supera el saldo pendiente de ${layaway.balance} COP.`);
    }

    // Register payment
    const newPayment = {
      id: `pay_${Date.now()}_${Math.random().toString().slice(-4)}`,
      date: new Date().toISOString(),
      amount: amountVal,
      method: paymentMethod || 'Efectivo',
      sellerId: sellerId || 'admin'
    };

    layaway.payments.push(newPayment);
    layaway.paid = Number((layaway.paid + amountVal).toFixed(2));
    layaway.balance = Number((layaway.total - layaway.paid).toFixed(2));

    layaways[index] = layaway;
    storageRepository.saveLayaways(layaways);
    return layaway;
  }

  deliverProducts(layawayId) {
    const layaways = storageRepository.getLayaways();
    const index = layaways.findIndex(l => l.id === layawayId);
    
    if (index === -1) throw new Error('Separación no encontrada.');
    const layaway = layaways[index];

    if (layaway.balance > 0) {
      throw new Error('No se pueden entregar los productos si hay un saldo pendiente.');
    }

    if (layaway.status !== 'active') {
      throw new Error('Esta separación ya no está activa.');
    }

    layaway.status = 'completed';
    layaway.deliveryDate = new Date().toISOString();

    layaways[index] = layaway;
    storageRepository.saveLayaways(layaways);
    return layaway;
  }

  cancelLayaway(layawayId, reason) {
    const layaways = storageRepository.getLayaways();
    const index = layaways.findIndex(l => l.id === layawayId);
    
    if (index === -1) throw new Error('Separación no encontrada.');
    const layaway = layaways[index];

    if (layaway.status !== 'active') {
      throw new Error('Solo se pueden anular separaciones activas.');
    }

    // Restore stock to inventory
    layaway.items.forEach(item => {
      const product = inventoryService.getById(item.productId);
      if (product) {
        inventoryService.update(product.id, { stock: product.stock + item.quantity });
      }
    });

    layaway.status = 'cancelled';
    layaway.cancelReason = reason || 'Anulado por cliente';
    layaway.cancelDate = new Date().toISOString();

    layaways[index] = layaway;
    storageRepository.saveLayaways(layaways);
    return layaway;
  }
}

export const layawayService = new LayawayService();
