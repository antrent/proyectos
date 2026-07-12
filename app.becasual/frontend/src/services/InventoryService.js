import { api } from './api.js';
import { storageRepository } from './StorageRepository'; // Se mantiene para compatibilidad con parámetros locales

class InventoryService {
  async getAll(storeId = 'all') {
    const products = await api.get(`/products?storeId=${storeId}`);
    return products;
  }

  async getById(id) {
    const product = await api.get(`/products/${id}`);
    return product;
  }

  async getByBarcode(barcode, storeId = 'all') {
    const product = await api.get(`/products/barcode/${barcode.trim()}?storeId=${storeId}`);
    return product;
  }

  async search(filters = {}, storeId = 'all') {
    const query = filters.query ? encodeURIComponent(filters.query) : '';
    const line = filters.line || '';
    const category = filters.category || '';
    const provider = filters.provider || '';
    const stockStatus = filters.stockStatus || 'all';

    const products = await api.get(
      `/products?storeId=${storeId}&query=${query}&line=${line}&category=${category}&provider=${provider}&stockStatus=${stockStatus}`
    );
    return products;
  }

  async create(productData, storeId = 'store_1') {
    const payload = {
      ...productData,
      storeId,
    };
    const newProduct = await api.post('/products', payload);

    // Guardar parámetros nuevos si se ingresaron
    this.checkAndAddParams(newProduct);

    return newProduct;
  }

  async update(id, updatedFields) {
    const updatedProduct = await api.put(`/products/${id}`, updatedFields);
    
    // Guardar parámetros nuevos si se ingresaron
    this.checkAndAddParams(updatedProduct);

    return updatedProduct;
  }

  async delete(id) {
    await api.delete(`/products/${id}`);
    return true;
  }

  async updateGlobalMinStock(minStock) {
    // En una iteración posterior, esto se puede resolver con un endpoint en el backend
    // Por ahora actualizamos uno por uno o lo simulamos
    console.log('updateGlobalMinStock mock:', minStock);
    return true;
  }

  async getLowStockAlerts(storeId = 'all') {
    const products = await this.getAll(storeId);
    return products.filter(p => p.stock <= p.minStock);
  }

  // Helper local para actualizar listas desplegables en localStorage
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

  async getStockBreakAnalysis(storeId = 'all') {
    const products = await this.getAll(storeId);
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

  async getAdvancedProjections(storeId = 'all', daysPeriod = 30) {
    const products = await this.getAll(storeId);
    // En una iteración posterior, las ventas se recuperan de la API GET /api/sales
    const sales = []; // Mapeado básico por ahora
    
    const salesVelocityMap = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= thirtyDaysAgo) {
        sale.items.forEach(item => {
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

  async getWeeklyProjections(storeId = 'all', weeksPeriod = 4) {
    const products = await this.getAll(storeId);
    const sales = []; // En el futuro se alimenta de la API GET /api/sales

    const now = new Date();
    const periodDays = 60;
    const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    const salesVelocityMap = {};
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= startDate) {
        sale.items.forEach(item => {
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
