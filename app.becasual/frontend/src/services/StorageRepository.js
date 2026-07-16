import seedData from '../../data/parsed_data.json';
import { api } from './api.js';

class StorageRepository {
  constructor() {
    this.initDatabase();
    this.syncInterval = null;
    // Iniciar sincronización e intervalo recurrente si el usuario ya está autenticado
    const currentUser = sessionStorage.getItem('becasual_current_user');
    if (currentUser) {
      this.syncWithCloud();
      this.startSyncInterval();
    }
  }

  startSyncInterval() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Realizar sincronización periódica en segundo plano cada 30 segundos
    this.syncInterval = setInterval(() => {
      const currentUser = sessionStorage.getItem('becasual_current_user');
      if (currentUser) {
        this.syncWithCloud();
      } else {
        this.stopSyncInterval();
      }
    }, 30000);
  }

  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  initDatabase() {
    // Garantizar que existan las colecciones de gastos en localStorage
    if (!localStorage.getItem('becasual_expenses')) {
      localStorage.setItem('becasual_expenses', JSON.stringify([]));
    }
    if (!localStorage.getItem('becasual_expense_budgets')) {
      localStorage.setItem('becasual_expense_budgets', JSON.stringify([]));
    }
    if (!localStorage.getItem('becasual_expense_categories')) {
      const defaultCategories = [
        { id: 'cat_1', name: 'Arriendo', description: 'Gasto de alquiler del local comercial' },
        { id: 'cat_2', name: 'Servicios Públicos', description: 'Luz, agua, internet, telefonía' },
        { id: 'cat_3', name: 'Nómina y Salarios', description: 'Pago de salarios, comisiones y prestaciones a empleados' },
        { id: 'cat_4', name: 'Impuestos y Tasas', description: 'Declaraciones, retenciones e impuestos locales' },
        { id: 'cat_5', name: 'Mantenimiento y Aseo', description: 'Reparaciones, aseo y desinfección del local' },
        { id: 'cat_6', name: 'Papelería y Suministros', description: 'Bolsas, etiquetas, ganchos y útiles de oficina' },
        { id: 'cat_7', name: 'Publicidad y Marketing', description: 'Redes sociales, folletos, pautas publicitarias' },
        { id: 'cat_8', name: 'Comisión Bancaria', description: 'Comisiones de pasarelas de pago, Bold, datáfono, transferencias' },
        { id: 'cat_9', name: 'Otros Gastos Operativos', description: 'Imprevistos y gastos menores' }
      ];
      localStorage.setItem('becasual_expense_categories', JSON.stringify(defaultCategories));
    }

    // Si no está inicializado en localStorage, sembrar por defecto
    if (!localStorage.getItem('becasual_db_initialized')) {
      console.log('Initializing localStorage with seed data from Excel...');
      
      const defaultStores = [
        {
          id: 'store_1',
          name: seedData.config.nombre || 'tienda.Be casual Principal',
          slogan: seedData.config.slogan || 'Vístete para ser tú mismo.',
          address: seedData.config.dirección || 'Calle 132 # 92-32',
          phone: seedData.config.celular || '3115929346',
          email: seedData.config.correo || 'ventas@tiendabecasual.com',
          rent: seedData.config.arriendo || '2 millones',
          taxRate: 19
        },
        {
          id: 'store_2',
          name: 'tienda.Be casual Centro',
          slogan: 'Calidad y diseño para tu estilo.',
          address: 'Carrera 10 # 12-45',
          phone: '3204567890',
          email: 'centro@tiendabecasual.com',
          rent: '1.5 millones',
          taxRate: 19
        }
      ];
      localStorage.setItem('becasual_stores', JSON.stringify(defaultStores));
      localStorage.setItem('becasual_config', JSON.stringify(defaultStores[0]));
      localStorage.setItem('becasual_params', JSON.stringify(seedData.params));

      // Sembrar productos iniciales
      const products = seedData.products.map((p, index) => ({
        id: `prod_${Date.now()}_${index}`,
        storeId: 'store_1',
        barcode: p.barcode,
        sku: p.sku,
        name: p.name,
        stock: Number(p.stock) || 0,
        costPrice: Number(p.costPrice) || 0,
        sellPrice: Number(p.sellPrice) || 0,
        line: p.line,
        category: p.category,
        gender: p.gender,
        style: p.style,
        color: p.color,
        size: p.size,
        provider: p.provider,
        minStock: 5
      }));
      localStorage.setItem('becasual_products', JSON.stringify(products));

      // Sembrar compras iniciales
      const purchases = seedData.purchases.map((pur, index) => ({
        id: `pur_${Date.now()}_${index}`,
        storeId: 'store_1',
        date: pur.date,
        barcode: pur.barcode,
        sku: pur.sku,
        name: pur.name,
        provider: pur.provider,
        quantity: Number(pur.quantity) || 0,
        costPrice: Number(pur.costPrice) || 0,
        totalPrice: Number(pur.totalPrice) || 0,
        sellPrice: Number(pur.sellPrice) || 0
      }));
      localStorage.setItem('becasual_purchases', JSON.stringify(purchases));

      // Sembrar usuarios iniciales
      const users = [
        { id: 'usr_1', username: 'admin', password: '123', name: 'Administrador BeCasual', role: 'admin' },
        { id: 'usr_2', username: 'cajero', password: '123', name: 'Carlos Vendedor', role: 'vendedor' },
        { id: 'usr_3', username: 'comprador', password: '123', name: 'María Compras', role: 'comprador' }
      ];
      localStorage.setItem('becasual_users', JSON.stringify(users));

      // Inicializar vacíos
      localStorage.setItem('becasual_sales', JSON.stringify([]));
      localStorage.setItem('becasual_clients', JSON.stringify([]));
      localStorage.setItem('becasual_employees', JSON.stringify([
        {
          id: 'emp_1', name: 'Administrador BeCasual', document: '00000001',
          role: 'Administrador', phone: '', email: 'admin@becasual.com',
          salary: 0, startDate: new Date().toISOString().split('T')[0], status: 'activo'
        }
      ]));
      localStorage.setItem('becasual_closings', JSON.stringify([]));
      localStorage.setItem('becasual_layaways', JSON.stringify([]));
      localStorage.setItem('becasual_openings', JSON.stringify([]));

      localStorage.setItem('becasual_db_initialized', 'true');
    }
  }

  // Sincronización asíncrona en segundo plano con GCP con mezcla (Merge) resiliente
  async syncWithCloud() {
    try {
      console.log('Iniciando sincronización con la nube de GCP (background)...');
      
      // 1. Productos (el catálogo maestro de la nube manda)
      const products = await api.get('/products');
      if (Array.isArray(products)) this.setData('products', products);

      // 2. Sincronización inteligente de Ventas
      const localSales = this.getData('sales') || [];
      const cloudSales = await api.get('/sales');
      if (Array.isArray(cloudSales)) {
        const pendingSales = localSales.filter(local => 
          !cloudSales.some(cloud => cloud.id === local.id || cloud.invoiceNumber === local.invoiceNumber)
        );

        if (pendingSales.length > 5) {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < pendingSales.length; i += CHUNK_SIZE) {
            const chunk = pendingSales.slice(i, i + CHUNK_SIZE);
            try {
              console.log(`Subiendo bloque de ${chunk.length} ventas pendientes masivamente (Bulk)...`);
              await api.post('/sales/bulk', {
                sales: chunk.map(sale => ({
                  id: sale.id,
                  storeId: sale.storeId,
                  invoiceNumber: sale.invoiceNumber,
                  date: sale.date,
                  clientName: sale.clientName,
                  clientDocument: sale.clientDocument || null,
                  sellerId: sale.sellerId || 'emp_1',
                  paymentMethod: sale.paymentMethod,
                  subtotal: sale.subtotal,
                  tax: sale.tax,
                  total: sale.total,
                  discount: sale.discount,
                  cost: sale.cost,
                  profit: sale.profit,
                  items: sale.items.map(item => ({
                    productId: item.productId,
                    barcode: item.barcode || '',
                    quantity: item.quantity,
                    price: item.sellPrice || item.price,
                    subtotal: item.subtotal || ((item.sellPrice || item.price) * item.quantity)
                  }))
                }))
              });
            } catch (err) {
              console.error('Error al subir bloque masivo de ventas:', err.response?.data || err);
            }
          }
          console.log('Carga masiva por bloques completada con éxito.');
        } else {
          for (const sale of pendingSales) {
            try {
              await api.post('/sales', {
                id: sale.id,
                storeId: sale.storeId,
                invoiceNumber: sale.invoiceNumber,
                clientName: sale.clientName,
                clientDocument: sale.clientDocument || null,
                employeeId: sale.sellerId || 'emp_1',
                paymentMethod: sale.paymentMethod,
                subtotal: sale.subtotal,
                tax: sale.tax,
                total: sale.total,
                discount: sale.discount,
                cost: sale.cost,
                profit: sale.profit,
                items: sale.items.map(item => ({
                  productId: item.productId,
                  barcode: item.barcode || '',
                  quantity: item.quantity,
                  price: item.sellPrice,
                  subtotal: (item.sellPrice * item.quantity) - (item.sellPrice * item.quantity * (item.discount / 100))
                }))
              });
            } catch (err) {
              console.error(`Fallo al autosincronizar venta pendiente ${sale.invoiceNumber}:`, err.response?.data || err);
            }
          }
        }
        const finalSales = pendingSales.length > 0 ? (await api.get('/sales').catch(() => cloudSales)) : cloudSales;
        if (Array.isArray(finalSales)) {
          const normalized = finalSales.map(s => ({
            ...s,
            items: s.items || s.details || []
          }));
          this.setData('sales', normalized);
        }
      }

      // 3. Sincronización inteligente de Compras
      const localPurchases = this.getData('purchases') || [];
      const cloudPurchases = await api.get('/purchases');
      if (Array.isArray(cloudPurchases)) {
        const pendingPurchases = localPurchases.filter(local => 
          !cloudPurchases.some(cloud => cloud.id === local.id || cloud.invoiceNumber === local.invoiceNumber)
        );
        for (const pur of pendingPurchases) {
          try {
            await api.post('/purchases', {
              id: pur.id,
              storeId: pur.storeId,
              invoiceNumber: pur.invoiceNumber,
              provider: pur.provider,
              date: pur.date,
              total: pur.total,
              items: pur.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                costPrice: item.costPrice,
                sellPrice: item.sellPrice
              }))
            });
          } catch (err) {
            console.error(`Fallo al autosincronizar compra pendiente ${pur.invoiceNumber}:`, err);
          }
        }
        const finalPurchases = pendingPurchases.length > 0 ? (await api.get('/purchases').catch(() => cloudPurchases)) : cloudPurchases;
        if (Array.isArray(finalPurchases)) {
          const normalized = finalPurchases.map(p => ({
            ...p,
            items: p.items || p.details || []
          }));
          this.setData('purchases', normalized);
        }
      }

      // 4. Sincronización inteligente de Separados
      const localLayaways = this.getData('layaways') || [];
      const cloudLayaways = await api.get('/layaways');
      if (Array.isArray(cloudLayaways)) {
        const pendingLayaways = localLayaways.filter(local => 
          !cloudLayaways.some(cloud => cloud.id === local.id || cloud.layawayNumber === local.layawayNumber)
        );
        for (const lay of pendingLayaways) {
          try {
            await api.post('/layaways', {
              id: lay.id,
              storeId: lay.storeId,
              layawayNumber: lay.layawayNumber,
              clientName: lay.clientName,
              clientPhone: lay.clientPhone,
              clientEmail: lay.clientEmail,
              clientDocument: lay.clientDocument,
              total: lay.total,
              paid: lay.paid,
              balance: lay.balance,
              status: lay.status,
              items: lay.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.sellPrice,
                subtotal: (item.sellPrice * item.quantity) - (item.sellPrice * item.quantity * (item.discount / 100))
              }))
            });
          } catch (err) {
            console.error(`Fallo al autosincronizar separado pendiente ${lay.layawayNumber}:`, err);
          }
        }
        const finalLayaways = pendingLayaways.length > 0 ? (await api.get('/layaways').catch(() => cloudLayaways)) : cloudLayaways;
        if (Array.isArray(finalLayaways)) {
          const normalized = finalLayaways.map(l => ({
            ...l,
            items: l.items || l.details || []
          }));
          this.setData('layaways', normalized);
        }
      }

      // 5. Sincronización inteligente de Cierres de Caja
      const localClosings = this.getData('closings') || [];
      const cloudClosings = await api.get('/closings');
      if (Array.isArray(cloudClosings)) {
        const pendingClosings = localClosings.filter(local => 
          !cloudClosings.some(cloud => cloud.id === local.id)
        );
        for (const close of pendingClosings) {
          try {
            await api.post('/closings', {
              id: close.id,
              storeId: close.storeId,
              closingDate: close.closingDate || close.date,
              openingCash: close.openingCash,
              salesCash: close.salesCash,
              salesNequi: close.salesNequi,
              salesDaviplata: close.salesDaviplata,
              salesCard: close.salesCard,
              salesSistecredito: close.salesSistecredito,
              salesAddi: close.salesAddi,
              salesBold: close.salesBold,
              totalRevenue: close.totalRevenue,
              expectedCash: close.expectedCash,
              actualCash: close.actualCash,
              difference: close.difference,
              notes: close.notes || '',
              employeeId: close.employeeId || 'emp_1'
            });
          } catch (err) {
            console.error(`Fallo al autosincronizar cierre pendiente ${close.id}:`, err);
          }
        }
        const finalClosings = pendingClosings.length > 0 ? (await api.get('/closings').catch(() => cloudClosings)) : cloudClosings;
        if (Array.isArray(finalClosings)) this.setData('closings', finalClosings);
      }

      // 6. Sincronización de Sucursales
      const stores = await api.get('/stores');
      if (Array.isArray(stores)) {
        this.setData('stores', stores);
        const savedStoreId = localStorage.getItem('becasual_current_store_id');
        const activeStore = stores.find(s => s.id === savedStoreId) || stores[0];
        if (activeStore) {
          localStorage.setItem('becasual_config', JSON.stringify(activeStore));
        }
      }

      // 7. Sincronización de Categorías de Gastos
      try {
        const localCategories = this.getData('expense_categories') || [];
        const cloudCategories = await api.get('/expenses/categories').catch(() => null);
        if (Array.isArray(cloudCategories)) {
          const pendingCategories = localCategories.filter(local => 
            !cloudCategories.some(cloud => cloud.id === local.id || cloud.name.toLowerCase() === local.name.toLowerCase())
          );
          if (pendingCategories.length > 0) {
            await api.post('/expenses/categories/bulk', { categories: pendingCategories }).catch(e => console.error(e));
          }
          const finalCategories = await api.get('/expenses/categories').catch(() => cloudCategories);
          if (Array.isArray(finalCategories)) this.setData('expense_categories', finalCategories);
        }
      } catch (err) {
        console.error('Error syncing expense categories:', err);
      }

      // 8. Sincronización de Gastos
      try {
        const localExpenses = this.getData('expenses') || [];
        const cloudExpenses = await api.get('/expenses').catch(() => null);
        if (Array.isArray(cloudExpenses)) {
          const pendingExpenses = localExpenses.filter(local =>
            !cloudExpenses.some(cloud => cloud.id === local.id)
          );
          if (pendingExpenses.length > 0) {
            await api.post('/expenses/bulk', { expenses: pendingExpenses }).catch(e => console.error(e));
          }
          const finalExpenses = await api.get('/expenses').catch(() => cloudExpenses);
          if (Array.isArray(finalExpenses)) this.setData('expenses', finalExpenses);
        }
      } catch (err) {
        console.error('Error syncing expenses:', err);
      }

      // 9. Sincronización de Presupuestos
      try {
        const localBudgets = this.getData('expense_budgets') || [];
        const cloudBudgets = await api.get('/expenses/budgets').catch(() => null);
        if (Array.isArray(cloudBudgets)) {
          if (localBudgets.length > 0) {
            await api.post('/expenses/budgets/bulk', { budgets: localBudgets }).catch(e => console.error(e));
          }
          const finalBudgets = await api.get('/expenses/budgets').catch(() => cloudBudgets);
          if (Array.isArray(finalBudgets)) this.setData('expense_budgets', finalBudgets);
        }
      } catch (err) {
        console.error('Error syncing budgets:', err);
      }

      console.log('Sincronización con GCP completada de forma exitosa. 🎉');
      // Desencadenar evento global para que React actualice componentes
      window.dispatchEvent(new CustomEvent('becasual_db_sync_complete'));
    } catch (e) {
      console.error('Falla en la sincronización en segundo plano con GCP:', e);
    }
  }

  getData(key) {
    try {
      const data = localStorage.getItem(`becasual_${key}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading becasual_${key} from localStorage:`, error);
      return [];
    }
  }

  setData(key, value) {
    try {
      localStorage.setItem(`becasual_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing becasual_${key} to localStorage:`, error);
      return false;
    }
  }

  getProducts() { return this.getData('products'); }
  saveProducts(products) { return this.setData('products', products); }

  getPurchases() { return this.getData('purchases'); }
  savePurchases(purchases) { return this.setData('purchases', purchases); }

  getSales() { return this.getData('sales'); }
  saveSales(sales) { return this.setData('sales', sales); }

  getOpenings() { return this.getData('openings'); }
  saveOpenings(openings) { return this.setData('openings', openings); }

  getParams() {
    try {
      const data = localStorage.getItem('becasual_params');
      return data ? JSON.parse(data) : { lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] };
    } catch (error) {
      return { lines: [], categories: [], styles: [], genders: [], colors: [], sizes: [], providers: [] };
    }
  }
  saveParams(params) { return this.setData('params', params); }

  getConfig() {
    try {
      const data = localStorage.getItem('becasual_config');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }
  saveConfig(config) { return this.setData('config', config); }

  getUsers()     { return this.getData('users'); }
  saveUsers(u)   { return this.setData('users', u); }

  getClients()        { return this.getData('clients'); }
  saveClients(c)      { return this.setData('clients', c); }

  getEmployees()      { return this.getData('employees'); }
  saveEmployees(e)    { return this.setData('employees', e); }

  getClosings()       { return this.getData('closings'); }
  saveClosings(c)     { return this.setData('closings', c); }

  getStores() {
    let stores = this.getData('stores');
    if (!stores || stores.length === 0) {
      const config = this.getConfig();
      stores = [
        {
          id: 'store_1',
          name: config.name || 'tienda.Be casual Principal',
          slogan: config.slogan || 'Vístete para ser tú mismo.',
          address: config.address || 'Calle 132 # 92-32',
          phone: config.phone || '3115929346',
          email: config.email || 'ventas@tiendabecasual.com',
          rent: config.rent || '2 millones',
          taxRate: config.taxRate || 19
        },
        {
          id: 'store_2',
          name: 'tienda.Be casual Centro',
          slogan: 'Calidad y diseño para tu estilo.',
          address: 'Carrera 10 # 12-45',
          phone: '3204567890',
          email: 'centro@tiendabecasual.com',
          rent: '1.5 millones',
          taxRate: 19
        }
      ];
      this.saveStores(stores);
    }
    return stores;
  }
  saveStores(stores) { return this.setData('stores', stores); }

  getLayaways() { return this.getData('layaways'); }
  saveLayaways(layaways) { return this.setData('layaways', layaways); }

  getPaymentMethods() {
    const requiredMethods = ['Efectivo', 'Nequi', 'Daviplata', 'SisteCredito', 'Addi', 'Bold'];
    this.savePaymentMethods(requiredMethods);
    return requiredMethods;
  }
  savePaymentMethods(methods) {
    return this.setData('payment_methods', methods);
  }

  // === Database Version & Snapshot Control ===
  getSnapshots() {
    try {
      const data = localStorage.getItem('becasual_db_snapshots');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading snapshots:', e);
      return [];
    }
  }

  saveSnapshots(snapshots) {
    try {
      localStorage.setItem('becasual_db_snapshots', JSON.stringify(snapshots));
      return true;
    } catch (e) {
      console.error('Error saving snapshots:', e);
      return false;
    }
  }

  createSnapshot(name, description) {
    const snapshotData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('becasual_') && key !== 'becasual_db_snapshots') {
        snapshotData[key] = localStorage.getItem(key);
      }
    }
    const newSnapshot = {
      id: `snap_${Date.now()}`,
      name: name || `Copia ${new Date().toLocaleDateString()}`,
      description: description || 'Sin descripción',
      timestamp: new Date().toISOString(),
      data: snapshotData
    };
    const snapshots = this.getSnapshots();
    snapshots.push(newSnapshot);
    this.saveSnapshots(snapshots);
    return newSnapshot;
  }

  restoreSnapshot(snapshotId) {
    const snapshots = this.getSnapshots();
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) throw new Error('Copia de seguridad no encontrada.');

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('becasual_') && key !== 'becasual_db_snapshots') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    Object.entries(snapshot.data).forEach(([key, val]) => {
      localStorage.setItem(key, val);
    });

    return true;
  }

  deleteSnapshot(snapshotId) {
    const snapshots = this.getSnapshots().filter(s => s.id !== snapshotId);
    this.saveSnapshots(snapshots);
    return true;
  }

  importSnapshots(importedList) {
    if (!Array.isArray(importedList)) throw new Error('El formato importado no es una lista válida.');
    
    importedList.forEach(s => {
      if (!s.id || !s.name || !s.data || typeof s.data !== 'object') {
        throw new Error('El archivo importado contiene una copia con formato inválido.');
      }
    });

    const currentSnapshots = this.getSnapshots();
    const merged = [...currentSnapshots];
    importedList.forEach(imp => {
      const index = merged.findIndex(s => s.id === imp.id);
      if (index >= 0) {
        merged[index] = imp;
      } else {
        merged.push(imp);
      }
    });

    this.saveSnapshots(merged);
    return true;
  }

  getExpenses() { return this.getData('expenses') || []; }
  saveExpenses(expenses) { return this.setData('expenses', expenses); }

  getExpenseCategories() { return this.getData('expense_categories') || []; }
  saveExpenseCategories(categories) { return this.setData('expense_categories', categories); }

  getExpenseBudgets() { return this.getData('expense_budgets') || []; }
  saveExpenseBudgets(budgets) { return this.setData('expense_budgets', budgets); }
}

export const storageRepository = new StorageRepository();
