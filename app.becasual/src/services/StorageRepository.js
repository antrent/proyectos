import seedData from '../../data/parsed_data.json';

class StorageRepository {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    // If not initialized in localStorage, seed from JSON
    if (!localStorage.getItem('becasual_db_initialized')) {
      console.log('Initializing localStorage with seed data from Excel...');
      
      // Seed default stores list
      const defaultStores = [
        {
          id: 'store_1',
          name: seedData.config.nombre || 'tienda.Be casual Principal',
          slogan: seedData.config.slogan || 'Vístete para ser tú mismo.',
          address: seedData.config.dirección || 'Calle 132 # 92-32',
          phone: seedData.config.celular || '3115929346',
          email: seedData.config.correo || 'ventas@tiendabecasual.com',
          rent: seedData.config.arriendo || '2 millones',
          taxRate: 19 // Default IVA 19%
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

      // Seed configuration (defaults to store_1 config)
      localStorage.setItem('becasual_config', JSON.stringify(defaultStores[0]));

      // Seed parameters
      localStorage.setItem('becasual_params', JSON.stringify(seedData.params));

      // Seed products (Inventory) with storeId: 'store_1'
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
        minStock: 5 // Default warning limit
      }));
      localStorage.setItem('becasual_products', JSON.stringify(products));

      // Seed purchases with storeId: 'store_1'
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

      // Seed initial default users
      const users = [
        { id: 'usr_1', username: 'admin', password: '123', name: 'Administrador BeCasual', role: 'admin' },
        { id: 'usr_2', username: 'cajero', password: '123', name: 'Carlos Vendedor', role: 'vendedor' },
        { id: 'usr_3', username: 'comprador', password: '123', name: 'María Compras', role: 'comprador' }
      ];
      localStorage.setItem('becasual_users', JSON.stringify(users));

      // Initialize sales, clients, employees, closings (empty)
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

      // Mark database as initialized
      localStorage.setItem('becasual_db_initialized', 'true');
    }
  }

  // Generic Get and Set methods
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

  // Direct operations for each entity
  getProducts() { return this.getData('products'); }
  saveProducts(products) { return this.setData('products', products); }

  getPurchases() { return this.getData('purchases'); }
  savePurchases(purchases) { return this.setData('purchases', purchases); }

  getSales() { return this.getData('sales'); }
  saveSales(sales) { return this.setData('sales', sales); }

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

  // Multi-Store and Layaways
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
}

export const storageRepository = new StorageRepository();
