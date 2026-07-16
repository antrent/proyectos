import React, { useState, useEffect } from 'react';
import { authService } from '../services/AuthService';
import ChangelogModal from './ChangelogModal';
import { storageRepository } from '../services/StorageRepository';

const ALL_NAV_ITEMS = [
  { id: 'dashboard',       name: 'Dashboard',          icon: '📊', module: 'dashboard' },
  { id: 'inventory',       name: 'Inventario',          icon: '📦', module: 'inventory_view' },
  { id: 'sales',           name: 'Registrar Venta',     icon: '🛒', module: 'sales' },
  { id: 'invoices',        name: 'Historial Facturas',  icon: '🧾', module: 'sales' },
  { id: 'layaways',        name: 'Separaciones / Abonos', icon: '🛍️', module: 'layaways' },
  { id: 'purchases',       name: 'Registrar Compra',    icon: '➕', module: 'purchases' },
  { id: 'stockbreak',      name: 'Proyección y Quiebres', icon: '⚡', module: 'inventory_view' },
  { id: 'dailyclosing',    name: 'Cierre Diario',       icon: '🏁', module: 'sales' },
  { id: 'expenses',        name: 'Control de Gastos',   icon: '💸', module: 'expenses' },
  { id: 'clients',         name: 'Clientes',            icon: '👥', module: 'clients' },
  { id: 'employees',       name: 'Empleados',           icon: '👤', module: 'employees' },
  { id: 'docs',            name: 'Manual y Soporte',    icon: '📖', module: 'dashboard' },
  { id: 'config',          name: 'Configuración',       icon: '⚙️', module: 'config' }
];

const HELP_DOCUMENTATION = {
  dashboard: {
    title: "📊 Dashboard (Tablero Principal)",
    description: "Muestra una visión general del estado del negocio en tiempo real, consolidando los indicadores clave de rendimiento (KPIs).",
    useCases: [
      "Visualizar las ventas brutas del día, ganancias netas y margen promedio.",
      "Ver la cantidad de facturas emitidas y el ticket promedio por cliente.",
      "Analizar los gráficos de ventas semanales comparando los diferentes métodos de pago.",
      "Identificar los productos más vendidos en el top 5 histórico."
    ],
    dependencies: [
      "Ventas (Sales): Alimenta los KPI de ventas diarias, ticket promedio y gráficos.",
      "Productos (Inventory): Alimenta la información del top de productos más vendidos.",
      "Cierre Diario (DailyClosing): Confirma si los días en el gráfico fueron cerrados oficialmente."
    ]
  },
  inventory: {
    title: "📦 Inventario (Control de Productos)",
    description: "Permite administrar el catálogo maestro de referencias de la tienda, controlando stock físico, precios y categorización.",
    useCases: [
      "Buscar productos por nombre, SKU, código de barras o proveedor.",
      "Agregar nuevos productos especificando línea, categoría, género, estilo, color, talla y proveedor.",
      "Editar el stock actual, stock mínimo (para alertas de quiebre), costo de compra y precio de venta.",
      "Exportar la lista completa del inventario a formato CSV o importar en lote."
    ],
    dependencies: [
      "Configuración (Config): Utiliza las líneas, categorías y otros parámetros registrados para clasificar los productos.",
      "Terminal de Ventas (Sales): Al realizar ventas se descuenta automáticamente el stock de este catálogo.",
      "Compras (Purchases): Al registrar una compra se suma stock a los productos correspondientes."
    ]
  },
  sales: {
    title: "🛒 Terminal de Ventas (POS)",
    description: "Pantalla de cobro ágil para registrar las ventas diarias de los clientes y generar facturas en el sistema.",
    useCases: [
      "Escanear códigos de barras de productos usando un lector físico o buscar manualmente por nombre en la lista.",
      "Aplicar descuentos personalizados en porcentaje sobre el total de la venta.",
      "Asignar la venta a un cliente específico (para histórico o separados).",
      "Registrar la venta con el medio de pago exclusivo correspondiente.",
      "Crear un nuevo 'Separado' para apartar prendas con un abono inicial mínimo."
    ],
    dependencies: [
      "Inventario (Inventory): Requiere productos con stock disponible para poder venderlos.",
      "Clientes (Clients): Utilizado para asociar compras a clientes fidelizados.",
      "Separados (Layaways): Crea registros de separados si se selecciona esa opción al checkout."
    ]
  },
  invoices: {
    title: "🧾 Historial de Facturas",
    description: "Listado histórico de todas las facturas emitidas en el sistema para consulta, anulación, devolución de productos, cambios de prendas (canjes) o exportación masiva.",
    useCases: [
      "Buscar facturas específicas por número de factura o nombre de cliente.",
      "Filtrar el historial por rangos de fecha y estado de la factura (activa/anulada).",
      "Ver el detalle de artículos vendidos, descuentos, devoluciones, canjes y el medio de pago utilizado.",
      "Procesar devoluciones parciales o totales de productos (reintegrando el stock al inventario y deduciendo el reembolso de los métodos de pago de la venta).",
      "Registrar cambios de prendas (canjes), permitiendo devolver ítems y seleccionar nuevos reemplazos del inventario, cobrando el excedente o reembolsando el saldo a favor.",
      "Anular facturas erróneas (lo cual devuelve automáticamente el stock de los productos al inventario).",
      "Cargar masivamente facturas antiguas usando archivos CSV."
    ],
    dependencies: [
      "Terminal de Ventas (Sales): Alimenta esta pantalla con cada venta exitosa.",
      "Inventario (Inventory): Al anular una factura, procesar una devolución o realizar un cambio, el sistema actualiza el stock físico de vuelta en el inventario."
    ]
  },
  layaways: {
    title: "🛍️ Separaciones y Abonos",
    description: "Administra el sistema de separados de la tienda, permitiendo a los clientes apartar prendas y realizar abonos paulatinos.",
    useCases: [
      "Ver la lista de separados activos, entregados o anulados.",
      "Registrar abonos parciales a un separado indicando el monto y método de pago.",
      "Entregar el producto una vez que el saldo pendiente llegue a cero.",
      "Anular separados (liberando las prendas y restaurando el stock al inventario)."
    ],
    dependencies: [
      "Terminal de Ventas (Sales): Los separados se inician desde el POS de ventas.",
      "Inventario (Inventory): Al apartar un producto se reduce su stock para que no se venda a otro cliente, y al anularse se devuelve."
    ]
  },
  purchases: {
    title: "➕ Registro de Compras",
    description: "Módulo para ingresar nueva mercancía al almacén e historial de abastecimiento con proveedores.",
    useCases: [
      "Registrar compras individuales buscando el producto por SKU o código de barras, ingresando cantidad comprada, costo y precio sugerido.",
      "Crear productos nuevos directamente en el inventario si no existían previamente al momento de la compra.",
      "Importar en lote registros de compras desde archivos CSV."
    ],
    dependencies: [
      "Inventario (Inventory): Suma stock automáticamente a los productos comprados y crea nuevas referencias.",
      "Configuración (Config): Requiere parámetros de proveedores y tallas al crear referencias nuevas."
    ]
  },
  stockbreak: {
    title: "⚡ Proyección y Quiebres de Stock",
    description: "Pantalla de inteligencia de negocio para planificar las compras y reposiciones semanales de inventario por prioridad y velocidad de venta.",
    useCases: [
      "Visualizar productos agotados (stock 0) y en stock crítico (por debajo del mínimo).",
      "Utilizar el Planificador Semanal Interactivo para estimar la inversión de compras.",
      "Fijar un presupuesto semanal y controlar los gastos mediante una barra de porcentaje visual.",
      "Estimar compras semanales basado en el promedio de ventas de las últimas semanas (1 a 12 semanas)."
    ],
    dependencies: [
      "Inventario (Inventory): Lee los niveles de stock físico y mínimos del catálogo.",
      "Ventas (Sales): Analiza la velocidad de venta semanal histórica para proyectar la demanda futura."
    ]
  },
  dailyclosing: {
    title: "🏁 Apertura y Cierre Diario de Caja",
    description: "Herramienta obligatoria al inicio de la jornada para registrar la base de caja (apertura) y al final del día para consolidar las ventas físicas en efectivo, transferencias y tarjetas.",
    useCases: [
      "Realizar la Apertura de Caja obligatoria de hoy antes de realizar cualquier operación en la sucursal activa.",
      "Realizar el arqueo de efectivo diario comparando la base inicial de caja con las ventas en efectivo registradas para cuadrar la caja física.",
      "Ver el resumen financiero del día seleccionado (ventas brutas, costo y utilidad).",
      "Visualizar el desglose de ingresos por canal exclusivo (Efectivo, Nequi, Daviplata, SisteCredito, Addi, Bold).",
      "Confirmar y registrar de forma permanente el cierre diario en el historial local.",
      "Exportar o importar los cierres históricos en formato CSV."
    ],
    dependencies: [
      "Ventas (Sales) y Separados (Layaways): Consolida los montos de todas las facturas y abonos cobrados en la fecha seleccionada.",
      "Aperturas (Openings): Lee el saldo inicial de caja registrado hoy para calcular el arqueo de caja."
    ]
  },
  clients: {
    title: "👥 Administración de Clientes",
    description: "Directorio de clientes de la tienda para registrar datos de contacto, facturación y consulta de comportamiento de compra.",
    useCases: [
      "Registrar nuevos clientes con nombre, cédula/documento, celular y correo.",
      "Consultar el número de compras totales y acumulado de inversión por cliente.",
      "Editar datos existentes de clientes."
    ],
    dependencies: [
      "Terminal de Ventas (Sales): Permite seleccionar clientes registrados al facturar."
    ]
  },
  employees: {
    title: "👤 Administración de Empleados",
    description: "Módulo de gestión del personal del almacén para registrar sus roles (Vendedor, Comprador, Administrador) y accesos.",
    useCases: [
      "Crear empleados asignándoles usuario, nombre, rol y contraseña.",
      "Visualizar el listado de personal activo y sus permisos por módulo."
    ],
    dependencies: [
      "Seguridad / Autenticación: Define quién puede acceder a qué módulos en la barra lateral."
    ]
  },
  config: {
    title: "⚙️ Configuración del Sistema",
    description: "Panel de control técnico para definir las sucursales (sedes), parámetros de prendas y reinicio de bases de datos.",
    useCases: [
      "Modificar datos de la sucursal activa (celular, dirección, etc.).",
      "Gestionar las opciones válidas de parámetros de catálogo (Líneas, Categorías, Estilos, Tallas, Colores, Proveedores).",
      "Restaurar la base de datos inicial desde la semilla oficial o realizar copias de seguridad completas."
    ],
    dependencies: [
      "Todas las Pantallas: Altera directamente las opciones disponibles al crear productos, compras o realizar cierres."
    ]
  },
  expenses: {
    title: "💸 Control de Gastos y Presupuestos",
    description: "Módulo administrativo para registrar todos los gastos operativos del almacén (arriendos, nómina, servicios) y realizar la planeación del presupuesto mensual asignado.",
    useCases: [
      "Registrar nuevos egresos detallando categoría, monto, método de pago y número de factura/recibo.",
      "Visualizar el historial de gastos operativos filtrando por fecha, categoría y palabra clave.",
      "Planificar el presupuesto mensual de cada una de las tipologías de gasto y monitorear el porcentaje consumido.",
      "Analizar las alertas visuales del consumo de presupuestos (indicadores verde, amarillo y rojo)."
    ],
    dependencies: [
      "Sedes (Stores): Asocia los gastos y planeación de presupuestos a la sucursal correspondiente.",
      "Configuración de Categorías: Permite crear tipologías de gastos personalizadas.",
      "Tablero Principal (Dashboard): Alimenta el widget consolidado del mes."
    ]
  }
};

export default function Layout({ user, currentTab, setCurrentTab, onLogout, currentStore, stores, onStoreChange, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);



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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '8px'
          }}>
            <span>Versión: <strong>v1.8.0</strong></span>
            <span
              style={{
                cursor: 'pointer',
                color: 'var(--primary)',
                fontWeight: '600',
                textDecoration: 'underline'
              }}
              onClick={() => setChangelogOpen(true)}
            >
              Historial
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="main-content">
        <div className="navbar" style={{ gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="navbar-title">{getTabTitle()}</h2>
            <button
              onClick={() => setHelpOpen(true)}
              style={{
                background: 'hsla(190, 70%, 40%, 0.1)',
                color: 'var(--primary)',
                border: '1px solid hsla(190, 70%, 40%, 0.2)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                outline: 'none',
                padding: 0
              }}
              title="Ayuda de la pantalla actual"
            >
              ❓
            </button>
          </div>
          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>Sucursal:</span>
              <select
                className="form-control"
                style={{
                  width: '210px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  height: '32px'
                }}
                value={currentStore?.id || 'store_1'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    onStoreChange({ id: 'all', name: 'Todas las Sedes (Consolidado)', slogan: 'Visión General', address: 'Reporte General' });
                  } else {
                    const match = stores.find(s => s.id === e.target.value);
                    if (match) onStoreChange(match);
                  }
                }}
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>🏬 {s.name}</option>
                ))}
                {user.role === 'admin' && (
                  <option value="all">🌍 Todas las Sedes (Consolidado)</option>
                )}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                {currentStore?.name || 'Local Sede Principal'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {currentStore?.address || 'Bogotá, Colombia'}
              </span>
            </div>
            <span style={{ fontSize: '20px' }}>🇨🇴</span>
          </div>
        </div>

        <div className="content-body">
          {children}
        </div>
      </div>

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />

      {helpOpen && HELP_DOCUMENTATION[currentTab] && (
        (() => {
          const doc = HELP_DOCUMENTATION[currentTab];
          return (
            <div className="modal-overlay" style={{ zIndex: 1100 }}>
              <div className="modal-content" style={{ maxWidth: '600px', width: '95%', borderRadius: 'var(--radius-lg)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    📖 Ayuda del Sistema
                  </h3>
                  <button className="modal-close" onClick={() => setHelpOpen(false)} style={{ fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
                
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {doc.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {doc.description}
                    </p>
                  </div>

                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                      🔑 Casos de Uso Comunes:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {doc.useCases.map((uc, i) => (
                        <li key={i} style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {uc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      🔌 Dependencias e Integración:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {doc.dependencies.map((dep, i) => (
                        <li key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {dep}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setHelpOpen(false)} style={{ padding: '8px 20px' }}>
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}


