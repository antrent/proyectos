import { api } from './api.js';

class PurchaseService {
  async getAll(storeId = 'all') {
    const purchases = await api.get(`/purchases?storeId=${storeId}`);
    return purchases;
  }

  async registerPurchase(purchaseData, storeId = 'store_1') {
    const { items, provider } = purchaseData;

    if (!items || items.length === 0) {
      throw new Error('La compra debe contener al menos un artículo.');
    }

    const registeredItems = [];

    // Enviamos cada ítem al API POST /api/purchases
    for (const item of items) {
      const payload = {
        storeId,
        barcode: item.barcode,
        sku: item.sku,
        name: item.name,
        provider: item.provider || provider || '-',
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.costPrice) || 0,
        sellPrice: Number(item.sellPrice) || 0,
        date: new Date().toISOString()
      };

      const response = await api.post('/purchases', payload);
      // El backend retorna { purchase, product }
      registeredItems.push(response.purchase);
    }

    return registeredItems;
  }
}

export const purchaseService = new PurchaseService();
