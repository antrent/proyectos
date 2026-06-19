import { authService as _auth } from './services/AuthService';
// Extend AuthService permissions to include new modules
const _orig = _auth.hasPermission.bind(_auth);
_auth.hasPermission = function (role, moduleName) {
  if (role === 'admin') return true;
  const extras = {
    vendedor:  ['sales', 'inventory_view', 'clients', 'invoices'],
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
import { authService } from './services/AuthService';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [triggerUpdate, setTriggerUpdate] = useState(false);

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

  const toggleUpdate = () => setTriggerUpdate(prev => !prev);

  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <Layout
      user={user}
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      onLogout={handleLogout}
    >
      {currentTab === 'dashboard'    && <Dashboard triggerUpdate={triggerUpdate} />}
      {currentTab === 'inventory'    && <Inventory user={user} onDataChange={toggleUpdate} />}
      {currentTab === 'sales'        && <Sales user={user} onSaleSuccess={toggleUpdate} />}
      {currentTab === 'invoices'     && <InvoiceHistory user={user} />}
      {currentTab === 'purchases'    && <Purchases user={user} onPurchaseSuccess={toggleUpdate} />}
      {currentTab === 'stockbreak'   && <StockBreak onGoToPurchases={() => setCurrentTab('purchases')} />}
      {currentTab === 'dailyclosing' && <DailyClosing user={user} />}
      {currentTab === 'clients'      && <Clients user={user} />}
      {currentTab === 'employees'    && <Employees user={user} />}
      {currentTab === 'config'       && <Configuration user={user} onConfigChange={toggleUpdate} />}
    </Layout>
  );
}
