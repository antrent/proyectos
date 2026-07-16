import { storageRepository } from './StorageRepository';
import { inventoryService } from './InventoryService';
import { api } from './api.js';

class PurchaseService {
  getAll(storeId = 'all') {
    const purchases = storageRepository.getPurchases();
    if (storeId === 'all') return purchases;
    return purchases.filter(p => p.storeId === storeId || (!p.storeId && storeId === 'store_1'));
  }

  registerPurchase(purchaseData, storeId = 'store_1') {
    const { items, provider } = purchaseData;

    if (!items || items.length === 0) {
      throw new Error('La compra debe contener al menos un artículo.');
    }

    const purchases = storageRepository.getPurchases();
    const registeredItems = [];

    items.forEach(item => {
      let product = inventoryService.getByBarcode(item.barcode, storeId);

      if (product) {
        const updatedStock = product.stock + Number(item.quantity);
        const updatedFields = { stock: updatedStock };

        if (item.costPrice > 0) updatedFields.costPrice = Number(item.costPrice);
        if (item.sellPrice > 0) updatedFields.sellPrice = Number(item.sellPrice);
        if (item.provider) updatedFields.provider = item.provider;

        inventoryService.update(product.id, updatedFields);
        product = { ...product, ...updatedFields };
      } else {
        product = inventoryService.create({
          barcode: item.barcode,
          sku: item.sku,
          name: item.name,
          stock: Number(item.quantity),
          costPrice: Number(item.costPrice),
          sellPrice: Number(item.sellPrice),
          provider: item.provider || provider || '-',
          line: item.line || '-',
          category: item.category || '-',
          gender: item.gender || '-',
          style: item.style || '-',
          color: item.color || '-',
          size: item.size || '-',
          minStock: 5
        }, storeId);
      }

      const costPrice = Number(item.costPrice) || product.costPrice;
      const sellPrice = Number(item.sellPrice) || product.sellPrice;
      const quantity = Number(item.quantity);
      const totalPrice = costPrice * quantity;

      const newPurchaseItem = {
        id: `pur_${Date.now()}_${Math.random().toString().slice(-4)}`,
        storeId,
        date: item.date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        barcode: product.barcode,
        sku: product.sku,
        name: product.name,
        provider: product.provider,
        quantity,
        costPrice,
        totalPrice,
        sellPrice
      };

      purchases.unshift(newPurchaseItem);
      registeredItems.push(newPurchaseItem);

      // Persistencia asíncrona en la nube de GCP en background
      const payload = {
        storeId,
        barcode: product.barcode,
        sku: product.sku,
        name: product.name,
        provider: product.provider,
        quantity,
        costPrice,
        totalPrice,
        sellPrice,
        date: item.date ? new Date(item.date).toISOString() : new Date().toISOString()
      };
      api.post('/purchases', payload).catch(err => {
        console.error('Error al registrar compra en GCP background:', err);
      });
    });

    storageRepository.savePurchases(purchases);
    return registeredItems;
  }
}

export const purchaseService = new PurchaseService();
