import { storageRepository } from './StorageRepository';
import { api } from './api.js';

class InventoryService {
  getAll(storeId = 'all') {
    const products = storageRepository.getProducts();
    if (storeId === 'all') return products;
    return products.filter(p => p.storeId === storeId || (!p.storeId && storeId === 'store_1'));
  }

  getById(id) {
    const products = storageRepository.getProducts();
    return products.find(p => p.id === id) || null;
  }

  getByBarcode(barcode, storeId = 'all') {
    const products = this.getAll(storeId);
    return products.find(p => p.barcode === barcode.trim() || p.sku === barcode.trim()) || null;
  }

  search(filters = {}, storeId = 'all') {
    const products = this.getAll(storeId);
    const query = (filters.query || '').toLowerCase().trim();
    const line = filters.line || '';
    const category = filters.category || '';
    const provider = filters.provider || '';
    const stockStatus = filters.stockStatus || 'all';

    return products.filter(p => {
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

  generateNumericBarcode() {
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
    return `770${randomSuffix}`;
  }

  generateNumericSku() {
    const timestamp = Date.now().toString().slice(-6);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `${timestamp}${randomDigits}`;
  }

  create(productData, storeId = 'store_1') {
    const products = storageRepository.getProducts();

    // Limpiar caracteres no numéricos o autogenerar si está vacío
    let barcode = (productData.barcode || '').toString().replace(/\D/g, '').trim();
    if (!barcode) {
      barcode = this.generateNumericBarcode();
      // Garantizar unicidad
      while (products.some(p => p.barcode === barcode)) {
        barcode = this.generateNumericBarcode();
      }
    } else {
      if (products.some(p => p.barcode === barcode)) {
        throw new Error(`El código de barras numérico ${barcode} ya existe en el inventario.`);
      }
    }

    let sku = (productData.sku || '').toString().replace(/\D/g, '').trim();
    if (!sku) {
      sku = this.generateNumericSku();
      while (products.some(p => p.sku === sku)) {
        sku = this.generateNumericSku();
      }
    } else {
      if (products.some(p => p.sku === sku)) {
        throw new Error(`El SKU numérico ${sku} ya existe en el inventario.`);
      }
    }

    const newProduct = {
      id: `prod_${Date.now()}`,
      storeId,
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

    products.unshift(newProduct);
    storageRepository.saveProducts(products);
    this.checkAndAddParams(newProduct);

    // Persistencia asíncrona en la nube de GCP (en segundo plano)
    api.post('/products', newProduct).catch(err => {
      console.error('Error al persistir producto en GCP:', err);
    });

    return newProduct;
  }

  update(id, updatedFields) {
    const products = storageRepository.getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Producto no encontrado.');
    }

    const storeId = products[index].storeId || 'store_1';

    let barcode = updatedFields.barcode !== undefined
      ? updatedFields.barcode.toString().replace(/\D/g, '').trim()
      : products[index].barcode;

    if (!barcode) {
      barcode = this.generateNumericBarcode();
      while (products.some(p => p.id !== id && p.barcode === barcode)) {
        barcode = this.generateNumericBarcode();
      }
    } else if (products.some(p => p.id !== id && p.barcode === barcode)) {
      throw new Error(`El código de barras numérico ${barcode} ya está asignado a otro producto.`);
    }

    let sku = updatedFields.sku !== undefined
      ? updatedFields.sku.toString().replace(/\D/g, '').trim()
      : products[index].sku;

    if (!sku) {
      sku = this.generateNumericSku();
      while (products.some(p => p.id !== id && p.sku === sku)) {
        sku = this.generateNumericSku();
      }
    } else if (products.some(p => p.id !== id && p.sku === sku)) {
      throw new Error(`El SKU numérico ${sku} ya está asignado a otro producto.`);
    }

    const updatedProduct = {
      ...products[index],
      ...updatedFields,
      id: products[index].id,
      barcode,
      sku,
      stock: Number(updatedFields.stock !== undefined ? updatedFields.stock : products[index].stock),
      costPrice: Number(updatedFields.costPrice !== undefined ? updatedFields.costPrice : products[index].costPrice),
      sellPrice: Number(updatedFields.sellPrice !== undefined ? updatedFields.sellPrice : products[index].sellPrice),
      minStock: Number(updatedFields.minStock !== undefined ? updatedFields.minStock : products[index].minStock)
    };

    products[index] = updatedProduct;
    storageRepository.saveProducts(products);
    this.checkAndAddParams(updatedProduct);

    // Persistencia asíncrona en la nube de GCP (en segundo plano)
    api.put(`/products/${id}`, updatedProduct).catch(err => {
      console.error('Error al actualizar producto en GCP:', err);
    });

    return updatedProduct;
  }

  delete(id) {
    const products = storageRepository.getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    // Comprobar si tiene alguna venta asociada en el histórico
    const sales = storageRepository.getSales() || [];
    const hasSales = sales.some(sale => 
      (sale.items || []).some(item => 
        item.productId === id || 
        (product.barcode && item.barcode === product.barcode) || 
        (product.sku && item.sku === product.sku)
      )
    );

    if (hasSales) {
      throw new Error(`No es posible el borrado del producto "${product.name}" porque tiene ventas asociadas.`);
    }

    const updatedProducts = products.filter(p => p.id !== id);
    storageRepository.saveProducts(updatedProducts);

    // Persistencia asíncrona en la nube de GCP (en segundo plano)
    api.delete(`/products/${id}`).catch(err => {
      console.error('Error al eliminar producto en GCP:', err);
    });

    return true;
  }

  updateGlobalMinStock(minStock) {
    const products = storageRepository.getProducts();
    const updated = products.map(p => ({
      ...p,
      minStock: Number(minStock) || 0
    }));
    storageRepository.saveProducts(updated);

    // Sincronización asíncrona masiva en la nube de GCP (en segundo plano)
    api.put('/products/global-min-stock', { minStock: Number(minStock) }).catch(err => {
      console.error('Error al actualizar stock mínimo global en GCP:', err);
    });

    return true;
  }

  getLowStockAlerts(storeId = 'all') {
    const products = this.getAll(storeId);
    return products.filter(p => p.stock <= p.minStock);
  }

  checkAndAddParams(product) {
    const params = storageRepository.getParams();
    let updated = false;

    const addParamIfNew = (list, name) => {
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

  getStockBreakAnalysis(storeId = 'all') {
    const products = this.getAll(storeId);
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

  getAdvancedProjections(storeId = 'all', daysPeriod = 30) {
    const products = this.getAll(storeId);
    const sales = storageRepository.getSales().filter(s => !s.cancelled && (storeId === 'all' || s.storeId === storeId || (!s.storeId && storeId === 'store_1')));
    
    const salesVelocityMap = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= thirtyDaysAgo) {
        const items = Array.isArray(sale.items) ? sale.items : [];
        items.forEach(item => {
          const key = item.productId;
          salesVelocityMap[key] = (salesVelocityMap[key] || 0) + item.quantity;
        });
      }
    });

    return products.map(p => {
      const unitsSold30d = salesVelocityMap[p.id] || 0;
      const dailyVelocity = unitsSold30d / 30;
      const weeklyVelocity = dailyVelocity * 7;
      
      let daysLeft = Infinity;
      if (dailyVelocity > 0) {
        daysLeft = p.stock / dailyVelocity;
      }
      
      const projectedDemand = dailyVelocity * daysPeriod;
      const stockShortage = (projectedDemand + p.minStock) - p.stock;
      const suggestedToBuy = Math.ceil(Math.max(0, stockShortage));
      const estimatedCost = suggestedToBuy * p.costPrice;

      let status = 'healthy';
      if (p.stock === 0) {
        status = 'out_of_stock';
      } else if (p.stock <= p.minStock) {
        status = 'critical';
      } else if (daysLeft < daysPeriod) {
        status = 'reorder_soon';
      }

      return {
        product: p,
        unitsSold30d,
        dailyVelocity,
        weeklyVelocity,
        daysLeft,
        suggestedToBuy,
        estimatedCost,
        status
      };
    }).sort((a, b) => b.estimatedCost - a.estimatedCost);
  }

  getWeeklyProjections(storeId = 'all', weeksPeriod = 4) {
    const products = this.getAll(storeId);
    const sales = storageRepository.getSales().filter(s => 
      !s.cancelled && (storeId === 'all' || s.storeId === storeId || (!s.storeId && storeId === 'store_1'))
    );
    
    const now = new Date();
    const periodDays = 60;
    const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    const salesVelocityMap = {};
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= startDate) {
        const items = Array.isArray(sale.items) ? sale.items : [];
        items.forEach(item => {
          const key = item.productId;
          salesVelocityMap[key] = (salesVelocityMap[key] || 0) + item.quantity;
        });
      }
    });

    const weeksInPeriod = periodDays / 7;

    return products.map(p => {
      const totalSoldInPeriod = salesVelocityMap[p.id] || 0;
      const weeklyVelocity = totalSoldInPeriod / weeksInPeriod;
      
      const projectedDemand = weeklyVelocity * weeksPeriod;
      
      let suggestedToBuy = 0;
      if (p.stock < projectedDemand) {
        suggestedToBuy = Math.ceil(projectedDemand - p.stock);
      }
      
      if (p.stock < p.minStock) {
        suggestedToBuy = Math.max(suggestedToBuy, p.minStock - p.stock);
      }

      const estimatedCost = suggestedToBuy * p.costPrice;
      const estimatedRevenue = suggestedToBuy * p.sellPrice;
      const estimatedProfit = estimatedRevenue - estimatedCost;

      let status = 'healthy';
      if (p.stock === 0) {
        status = 'out_of_stock';
      } else if (p.stock <= p.minStock) {
        status = 'critical';
      } else if (p.stock < projectedDemand) {
        status = 'reorder_soon';
      }

      return {
        product: p,
        weeklyVelocity,
        totalSoldInPeriod,
        projectedDemand,
        suggestedToBuy,
        estimatedCost,
        estimatedRevenue,
        estimatedProfit,
        stock: p.stock,
        minStock: p.minStock,
        status
      };
    }).sort((a, b) => b.suggestedToBuy - a.suggestedToBuy);
  }
}

export const inventoryService = new InventoryService();
