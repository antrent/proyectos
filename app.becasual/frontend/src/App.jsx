import { authService as _auth } from './services/AuthService';
// Extend AuthService permissions to include new modules
const _orig = _auth.hasPermission.bind(_auth);
_auth.hasPermission = function (role, moduleName) {
  if (role === 'admin') return true;
  const extras = {
    vendedor:  ['sales', 'inventory_view', 'clients', 'invoices', 'layaways'],
    comprador: ['purchases', 'inventory_view', 'inventory_edit']
  };
  const allowed = extras[role] || [];
  if (allowed.includes(moduleName)) return true;
  return _orig(role, moduleName);
};

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Configuration from './components/Configuration';
import DailyClosing from './components/DailyClosing';
import StockBreak from './components/StockBreak';
import Clients from './components/Clients';
import Employees from './components/Employees';
import InvoiceHistory from './components/InvoiceHistory';
import Layaways from './components/Layaways';
import { authService } from './services/AuthService';
import { storageRepository } from './services/StorageRepository';
import OpeningBoxForm from './components/OpeningBoxForm';
import Documentation from './components/Documentation';
import Expenses from './components/Expenses';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [triggerUpdate, setTriggerUpdate] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [openings, setOpenings] = useState([]);

  useEffect(() => {
    const list = storageRepository.getStores();
    setStores(list);
    const savedStoreId = localStorage.getItem('becasual_current_store_id');
    if (savedStoreId === 'all') {
      setCurrentStore({ id: 'all', name: 'Todas las Sedes (Consolidado)', slogan: 'Visión General', address: 'Reporte General' });
    } else {
      const savedStore = list.find(s => s.id === savedStoreId);
      setCurrentStore(savedStore || list[0] || null);
    }
    setOpenings(storageRepository.getOpenings());
  }, [triggerUpdate]);

  useEffect(() => {
    const activeUser = authService.getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
      setDefaultTab(activeUser.role);
    }
  }, []);

  const setDefaultTab = (role) => {
    if (role === 'vendedor') setCurrentTab('sales');
    else if (role === 'comprador') setCurrentTab('purchases');
    else setCurrentTab('dashboard');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setDefaultTab(loggedInUser.role);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentTab('dashboard');
  };

  const handleStoreChange = (store) => {
    setCurrentStore(store);
    if (store) {
      localStorage.setItem('becasual_current_store_id', store.id);
    } else {
      localStorage.removeItem('becasual_current_store_id');
    }
    setOpenings(storageRepository.getOpenings());
    toggleUpdate();
  };

  const handleOpenBox = (openingCash, notes) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newOpening = {
      id: `open_${Date.now()}`,
      date: todayStr,
      storeId: storeId,
      openingCash: Number(openingCash) || 0,
      notes: notes || '',
      registeredBy: user?.name || 'Administrador',
      timestamp: new Date().toISOString()
    };
    const currentOpenings = storageRepository.getOpenings();
    currentOpenings.push(newOpening);
    storageRepository.saveOpenings(currentOpenings);
    setOpenings(currentOpenings);
    toggleUpdate();
  };

  const toggleUpdate = () => setTriggerUpdate(prev => !prev);

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  const storeId = currentStore?.id || 'store_1';
  const todayStr = new Date().toISOString().split('T')[0];
  const isSpecificStore = storeId !== 'all';
  const isOpenToday = !isSpecificStore || openings.some(o => o.date === todayStr && o.storeId === storeId);

  return (
    <Layout
      user={user}
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      onLogout={handleLogout}
      currentStore={currentStore}
      stores={stores}
      onStoreChange={handleStoreChange}
    >
      {currentTab === 'dashboard'    && <Dashboard triggerUpdate={triggerUpdate} currentStoreId={storeId} />}
      {currentTab === 'inventory'    && <Inventory user={user} onDataChange={toggleUpdate} currentStoreId={storeId} />}
      {currentTab === 'sales'        && (
        isOpenToday ? (
          <Sales user={user} onSaleSuccess={toggleUpdate} currentStoreId={storeId} />
        ) : (
          <OpeningBoxForm storeName={currentStore?.name} onOpen={handleOpenBox} />
        )
      )}
      {currentTab === 'invoices'     && <InvoiceHistory user={user} currentStoreId={storeId} />}
      {currentTab === 'purchases'    && <Purchases user={user} onPurchaseSuccess={toggleUpdate} currentStoreId={storeId} />}
      {currentTab === 'stockbreak'   && <StockBreak onGoToPurchases={() => setCurrentTab('purchases')} currentStoreId={storeId} />}
      {currentTab === 'dailyclosing' && <DailyClosing user={user} currentStoreId={storeId} />}
      {currentTab === 'clients'      && <Clients user={user} />}
      {currentTab === 'employees'    && <Employees user={user} />}
      {currentTab === 'layaways'     && <Layaways user={user} currentStoreId={storeId} onDataChange={toggleUpdate} />}
      {currentTab === 'expenses'     && <Expenses user={user} currentStoreId={storeId} triggerUpdate={triggerUpdate} onDataChange={toggleUpdate} />}
      {currentTab === 'docs'         && <Documentation />}
      {currentTab === 'config'       && <Configuration user={user} onConfigChange={toggleUpdate} currentStoreId={storeId} />}
    </Layout>
  );
}
