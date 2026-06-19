import React, { useState } from 'react';
import { authService } from '../services/AuthService';

const ALL_NAV_ITEMS = [
  { id: 'dashboard',       name: 'Dashboard',          icon: '📊', module: 'dashboard' },
  { id: 'inventory',       name: 'Inventario',          icon: '📦', module: 'inventory_view' },
  { id: 'sales',           name: 'Registrar Venta',     icon: '🛒', module: 'sales' },
  { id: 'invoices',        name: 'Historial Facturas',  icon: '🧾', module: 'sales' },
  { id: 'purchases',       name: 'Registrar Compra',    icon: '➕', module: 'purchases' },
  { id: 'stockbreak',      name: 'Quiebres / Reposición', icon: '⚡', module: 'inventory_view' },
  { id: 'dailyclosing',    name: 'Cierre Diario',       icon: '🏁', module: 'sales' },
  { id: 'clients',         name: 'Clientes',            icon: '👥', module: 'clients' },
  { id: 'employees',       name: 'Empleados',           icon: '👤', module: 'employees' },
  { id: 'config',          name: 'Configuración',       icon: '⚙️', module: 'config' }
];

export default function Layout({ user, currentTab, setCurrentTab, onLogout, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allowedNavItems = ALL_NAV_ITEMS.filter(item =>
    authService.hasPermission(user.role, item.module)
  );

  const handleNavClick = (tabId) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  const getTabTitle = () => {
    const item = ALL_NAV_ITEMS.find(n => n.id === currentTab);
    return item ? `${item.icon} ${item.name}` : 'BeCasual';
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="modal-close"
            style={{ fontSize: '24px' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '14px' }}>BE</div>
          <span className="logo-text" style={{ fontSize: '16px' }}>Be<span>Casual</span></span>
        </div>
        <button className="btn btn-danger btn-sm" onClick={onLogout}>✕ Salir</button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">BE</div>
          <div>
            <div className="logo-text">Be<span>Casual</span></div>
            <div className="logo-slogan">Store Manager</div>
          </div>
        </div>

        <div className="sidebar-nav" style={{ overflowY: 'auto', paddingRight: '4px' }}>
          {allowedNavItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={onLogout}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
          >
            👋 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="main-content">
        <div className="navbar">
          <h2 className="navbar-title">{getTabTitle()}</h2>
          <div className="navbar-actions">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Local Sede Principal</span>
              <span style={{ color: 'var(--text-muted)' }}>Bogotá, Colombia</span>
            </div>
            <span style={{ fontSize: '20px' }}>🇨🇴</span>
          </div>
        </div>

        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  );
}
