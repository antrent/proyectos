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

  updatePurchase(id, updatedData) {
    const purchases = storageRepository.getPurchases();
    const index = purchases.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Registro de compra no encontrado.');

    const oldPurchase = purchases[index];
    const newQty = updatedData.quantity !== undefined ? Number(updatedData.quantity) : oldPurchase.quantity;
    const newCost = updatedData.costPrice !== undefined ? Number(updatedData.costPrice) : oldPurchase.costPrice;
    const newSell = updatedData.sellPrice !== undefined ? Number(updatedData.sellPrice) : oldPurchase.sellPrice;
    const qtyDiff = newQty - oldPurchase.quantity;

    // Ajustar stock en inventario
    let product = inventoryService.getByBarcode(oldPurchase.barcode, oldPurchase.storeId);
    if (!product && oldPurchase.sku) {
      const allProds = inventoryService.getAll(oldPurchase.storeId);
      product = allProds.find(p => p.sku === oldPurchase.sku);
    }

    if (product && qtyDiff !== 0) {
      inventoryService.update(product.id, {
        stock: Math.max(0, product.stock + qtyDiff),
        costPrice: newCost,
        sellPrice: newSell
      });
    }

    purchases[index] = {
      ...oldPurchase,
      ...updatedData,
      quantity: newQty,
      costPrice: newCost,
      sellPrice: newSell,
      totalPrice: newQty * newCost
    };

    storageRepository.savePurchases(purchases);

    // Sync con API background
    api.put(`/purchases/${id}`, updatedData).catch(err => {
      console.warn('Sync update purchase background:', err);
    });

    return purchases[index];
  }

  deletePurchase(id) {
    const purchases = storageRepository.getPurchases();
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) throw new Error('Registro de compra no encontrado.');

    // Revertir el stock adicionado
    let product = inventoryService.getByBarcode(purchase.barcode, purchase.storeId);
    if (!product && purchase.sku) {
      const allProds = inventoryService.getAll(purchase.storeId);
      product = allProds.find(p => p.sku === purchase.sku);
    }

    if (product) {
      inventoryService.update(product.id, {
        stock: Math.max(0, product.stock - purchase.quantity)
      });
    }

    const updatedList = purchases.filter(p => p.id !== id);
    storageRepository.savePurchases(updatedList);

    // Sync con API background
    api.delete(`/purchases/${id}`).catch(err => {
      console.warn('Sync delete purchase background:', err);
    });

    return true;
  }
}

export const purchaseService = new PurchaseService();
