import { storageRepository } from './StorageRepository';

class InventoryService {
  getAll() {
    return storageRepository.getProducts();
  }

  getById(id) {
    const products = storageRepository.getProducts();
    return products.find(p => p.id === id) || null;
  }

  getByBarcode(barcode) {
    const products = storageRepository.getProducts();
    return products.find(p => p.barcode === barcode.trim() || p.sku === barcode.trim()) || null;
  }

  search(filters = {}) {
    const products = storageRepository.getProducts();
    const query = (filters.query || '').toLowerCase().trim();
    const line = filters.line || '';
    const category = filters.category || '';
    const provider = filters.provider || '';
    const stockStatus = filters.stockStatus || 'all'; // 'all', 'low', 'out', 'in'

    return products.filter(p => {
      // General text query search
      const matchesQuery = !query || 
        p.name.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query);

      const matchesLine = !line || p.line === line;
      const matchesCategory = !category || p.category === category;
      const matchesProvider = !provider || p.provider === provider;

      let matchesStock = true;
      if (stockStatus === 'low') {
        matchesStock = p.stock > 0 && p.stock <= p.minStock;
      } else if (stockStatus === 'out') {
        matchesStock = p.stock === 0;
      } else if (stockStatus === 'in') {
        matchesStock = p.stock > p.minStock;
      }

      return matchesQuery && matchesLine && matchesCategory && matchesProvider && matchesStock;
    });
  }

  create(productData) {
    const products = storageRepository.getProducts();

    // Check barcode duplication
    if (productData.barcode && products.some(p => p.barcode === productData.barcode.trim())) {
      throw new Error('El código de barras ya existe en el inventario.');
    }

    // Auto-generate barcode if empty
    const barcode = productData.barcode ? productData.barcode.trim() : `BE-${Math.floor(100000 + Math.random() * 900000)}`;
    const sku = productData.sku ? productData.sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

    const newProduct = {
      id: `prod_${Date.now()}`,
      barcode,
      sku,
      name: productData.name.trim(),
      stock: Number(productData.stock) || 0,
      costPrice: Number(productData.costPrice) || 0,
      sellPrice: Number(productData.sellPrice) || 0,
      line: productData.line || '-',
      category: productData.category || '-',
      gender: productData.gender || '-',
      style: productData.style || '-',
      color: productData.color || '-',
      size: productData.size || '-',
      provider: productData.provider || '-',
      minStock: Number(productData.minStock) || 5
    };

    products.unshift(newProduct); // Add to beginning
    storageRepository.saveProducts(products);
    
    // Add parameters if new
    this.checkAndAddParams(newProduct);

    return newProduct;
  }

  update(id, updatedFields) {
    const products = storageRepository.getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Producto no encontrado.');
    }

    // Check barcode duplication
    if (updatedFields.barcode && products.some(p => p.id !== id && p.barcode === updatedFields.barcode.trim())) {
      throw new Error('El código de barras ya está asignado a otro producto.');
    }

    const updatedProduct = {
      ...products[index],
      ...updatedFields,
      // Keep immutable ID
      id: products[index].id,
      stock: Number(updatedFields.stock !== undefined ? updatedFields.stock : products[index].stock),
      costPrice: Number(updatedFields.costPrice !== undefined ? updatedFields.costPrice : products[index].costPrice),
      sellPrice: Number(updatedFields.sellPrice !== undefined ? updatedFields.sellPrice : products[index].sellPrice),
      minStock: Number(updatedFields.minStock !== undefined ? updatedFields.minStock : products[index].minStock)
    };

    products[index] = updatedProduct;
    storageRepository.saveProducts(products);
    
    // Add parameters if new
    this.checkAndAddParams(updatedProduct);

    return updatedProduct;
  }

  delete(id) {
    const products = storageRepository.getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    // Check if the product is locked or has transactions (optional, here we just filter it out)
    const updatedProducts = products.filter(p => p.id !== id);
    storageRepository.saveProducts(updatedProducts);
    return true;
  }

  getLowStockAlerts() {
    const products = storageRepository.getProducts();
    return products.filter(p => p.stock <= p.minStock);
  }

  // Helper to dynamically add new configuration values into parameters if they are typed in
  checkAndAddParams(product) {
    const params = storageRepository.getParams();
    let updated = false;

    const addParamIfNew = (list, name, idField) => {
      if (name && name !== '-' && !list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        const nextId = list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
        list.push({ name, id: nextId });
        updated = true;
      }
    };

    addParamIfNew(params.lines, product.line);
    addParamIfNew(params.categories, product.category);
    addParamIfNew(params.styles, product.style);
    addParamIfNew(params.genders, product.gender);
    addParamIfNew(params.colors, product.color);
    addParamIfNew(params.sizes, product.size);
    addParamIfNew(params.providers, product.provider);

    if (updated) {
      storageRepository.saveParams(params);
    }
  }
  getStockBreakAnalysis() {
    const products = this.getAll();
    const broken = [];
    const critical = [];
    const projections = [];
    const providerMap = {};

    products.forEach(p => {
      const isBroken = p.stock === 0;
      const isCritical = p.stock > 0 && p.stock <= p.minStock;

      if (isBroken) {
        broken.push(p);
      } else if (isCritical) {
        critical.push(p);
      }

      if (isBroken || isCritical) {
        const baseTarget = p.minStock * 3;
        const suggestedQuantity = Math.max(10, baseTarget - p.stock);
        const estimatedCost = suggestedQuantity * (p.costPrice || 0);

        const proj = {
          product: p,
          stock: p.stock,
          minStock: p.minStock,
          suggestedQuantity,
          estimatedCost,
          provider: p.provider || 'Sin Proveedor'
        };

        projections.push(proj);

        const prov = p.provider || 'Sin Proveedor';
        if (!providerMap[prov]) {
          providerMap[prov] = {
            providerName: prov,
            itemCount: 0,
            totalQuantity: 0,
            totalInvestment: 0,
            items: []
          };
        }
        providerMap[prov].itemCount += 1;
        providerMap[prov].totalQuantity += suggestedQuantity;
        providerMap[prov].totalInvestment += estimatedCost;
        providerMap[prov].items.push(proj);
      }
    });

    const providerProjections = Object.values(providerMap).sort((a, b) => b.totalInvestment - a.totalInvestment);

    return {
      brokenCount: broken.length,
      criticalCount: critical.length,
      brokenProducts: broken,
      criticalProducts: critical,
      projections: projections.sort((a, b) => b.estimatedCost - a.estimatedCost),
      providerProjections
    };
  }
}

export const inventoryService = new InventoryService();
