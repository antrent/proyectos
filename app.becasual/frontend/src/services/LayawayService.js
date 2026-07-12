import { api } from './api.js';
import { salesService } from './SalesService';
import { notificationService } from './NotificationService';

class LayawayService {
  async getAll(storeId = 'all') {
    const layaways = await api.get(`/layaways?storeId=${storeId}`);
    return layaways;
  }

  async getById(id) {
    const layaway = await api.get(`/layaways/${id}`);
    return layaway;
  }

  async createLayaway(layawayData, storeId) {
    const { clientName, clientPhone, clientEmail, clientDocument, items, initialPayment, paymentMethod, sellerId } = layawayData;

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

    const payload = {
      storeId: storeId || 'store_1',
      clientName: clientName.trim(),
      clientPhone: clientPhone ? String(clientPhone).trim() : null,
      total,
      deposit: initialAmount,
      products: items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        sku: item.product.sku,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        sellPrice: item.product.sellPrice,
        discount: item.discount || 0
      }))
    };

    const newLayaway = await api.post('/layaways', payload);

    // Enviar notificación al cliente (WhatsApp + Email)
    try {
      notificationService.notifyLayawayCreated({
        ...newLayaway,
        clientEmail: clientEmail || '',
        sellerId: sellerId || 'admin'
      });
    } catch (e) {
      console.warn('Notification error:', e);
    }

    return newLayaway;
  }

  async registerPayment(layawayId, amount, paymentMethod, sellerId) {
    const amountVal = Number(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      throw new Error('El valor del abono debe ser mayor a 0.');
    }

    // El backend espera un abono incremental en la variable deposit
    const updated = await api.put(`/layaways/${layawayId}`, {
      deposit: amountVal
    });

    try {
      notificationService.notifyPaymentRegistered(updated, amountVal);
    } catch (e) {
      console.warn('Notification error:', e);
    }

    return updated;
  }

  async deliverProducts(layawayId) {
    // Cambiar estado a entregado
    const updated = await api.put(`/layaways/${layawayId}`, {
      status: 'entregado'
    });
    return updated;
  }

  async cancelLayaway(layawayId, reason) {
    // Cambiar estado a anulado
    const updated = await api.put(`/layaways/${layawayId}`, {
      status: 'anulado'
    });
    return updated;
  }
}

export const layawayService = new LayawayService();
