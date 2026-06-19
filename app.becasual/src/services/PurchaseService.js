import { storageRepository } from './StorageRepository';
import { inventoryService } from './InventoryService';

class PurchaseService {
  getAll() {
    return storageRepository.getPurchases();
  }

  registerPurchase(purchaseData) {
    const { items, provider } = purchaseData;

    if (!items || items.length === 0) {
      throw new Error('La compra debe contener al menos un artículo.');
    }

    const purchases = storageRepository.getPurchases();
    const registeredItems = [];

    items.forEach(item => {
      let product = null;

      // Try finding product by barcode/SKU
      if (item.barcode) {
        product = inventoryService.getByBarcode(item.barcode);
      }

      if (product) {
        // Product exists: update stock and optionally prices
        const updatedStock = product.stock + Number(item.quantity);
        const updatedFields = {
          stock: updatedStock
        };

        if (item.costPrice > 0) updatedFields.costPrice = Number(item.costPrice);
        if (item.sellPrice > 0) updatedFields.sellPrice = Number(item.sellPrice);
        if (item.provider) updatedFields.provider = item.provider;

        inventoryService.update(product.id, updatedFields);
        product = { ...product, ...updatedFields };
      } else {
        // Product does not exist: create it
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
        });
      }

      const costPrice = Number(item.costPrice) || product.costPrice;
      const sellPrice = Number(item.sellPrice) || product.sellPrice;
      const quantity = Number(item.quantity);
      const totalPrice = costPrice * quantity;

      // Add to purchase log
      const newPurchaseItem = {
        id: `pur_${Date.now()}_${Math.random().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
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
    });

    storageRepository.savePurchases(purchases);
    return registeredItems;
  }
}

export const purchaseService = new PurchaseService();
