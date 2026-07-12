import React from 'react';

const CHANGELOG = [
  {
    version: 'v1.8.0',
    date: 'Julio 2026',
    title: 'Cambio de Productos (Canjes) y Desglose Financiero',
    badge: 'Nueva Funcionalidad',
    badgeColor: '#a855f7',
    changes: [
      'Implementada la funcionalidad de Cambio de Productos (Canjes) desde el historial de facturas.',
      'Buscador interactivo de prendas nuevas en inventario en tiempo real con validación automática de stock.',
      'Cálculo automático de saldos de canje: crédito (a favor del cliente) y débito (cobros adicionales).',
      'Desglose y cuadre preciso de diferencias en caja: solicitud de pagos adicionales o reembolsos correspondientes.',
      'Reajuste atómico de existencias físicas en el inventario al registrar cambios de prendas.',
      'Bitácora de auditoría histórica de canjes en el detalle de la factura y actualización de ayuda del sistema.'
    ]
  },
  {
    version: 'v1.7.0',
    date: 'Julio 2026',
    title: 'Control de Apertura de Caja y Devoluciones de Productos',
    badge: 'Nueva Funcionalidad',
    badgeColor: '#a855f7',
    changes: [
      'Implementado control de acceso restrictivo: obliga a realizar la Apertura de Caja Diaria antes de operar en cualquier sucursal.',
      'Añadida vista interactiva de arqueo en el Cierre de Caja Diario (Base Inicial + Ventas Efectivo = Efectivo Esperado).',
      'Implementado sistema de devoluciones de producto parciales y totales con reintegro automático al inventario.',
      'Desglose y validación de reembolso en los métodos de pago originales de la factura.',
      'Bitácora de auditoría y etiquetas de estado de devolución parcial/total en el historial de facturas.'
    ]
  },
  {
    version: 'v1.6.0',
    date: 'Julio 2026',
    title: 'Notificaciones Automáticas de Separaciones (WhatsApp y Email)',
    badge: 'Nueva Funcionalidad',
    badgeColor: '#25D366',
    changes: [
      'Implementado NotificationService con soporte para WhatsApp (enlace wa.me) y Email (mailto:).',
      'Notificación automática al cliente al crear una separación o registrar un abono.',
      'Notificación automática al entregar productos o al marcar "producto listo en tienda" desde Separaciones.',
      'Botón "📣 Notificar" en cada separación activa para avisar al cliente que su producto llegó a tienda.',
      'Panel de historial de notificaciones enviadas en la pantalla de Separaciones.',
      'Panel de configuración de notificaciones en Ajustes: activar/desactivar, modo WhatsApp/Email, y personalización de plantillas de mensajes.',
      'Las plantillas soportan variables dinámicas: nombre de cliente, número de separación, montos, productos y datos de tienda.'
    ]
  },
  {
    version: 'v1.5.0',
    date: 'Julio 2026',
    title: 'Pagos Combinados, Stock Mínimo y Métodos Personalizados',
    badge: 'Mejora',
    badgeColor: '#f59e0b',
    changes: [
      'Pagos combinados en ventas: posibilidad de usar más de 2 métodos de pago simultáneamente.',
      'Soporte para métodos de pago personalizados (opción "Otro...").',
      'Edición individual del stock mínimo por producto desde el inventario.',
      'Configuración global de stock mínimo de alerta para todos los productos a la vez.'
    ]
  },
  {
    version: 'v1.2.0',
    date: 'Julio 2026',
    title: 'Control de Versiones de Datos e Historial',
    badge: 'Nueva Funcionalidad',
    badgeColor: '#a855f7', // Purple
    changes: [
      'Implementado sistema de snapshots para crear puntos de restauración de la base de datos local (localStorage).',
      'Añadida vista de administración de versiones de datos en el módulo de Configuración.',
      'Soporte completo para exportar copias de seguridad de datos en formato JSON y descargarlas localmente.',
      'Soporte para importar archivos de respaldo externos para restaurar de forma masiva los datos.',
      'Añadido botón y badge de versión del software en la barra lateral con este visualizador de cambios.'
    ]
  },
  {
    version: 'v1.1.0',
    date: 'Julio 2026',
    title: 'Dockerización y Despliegue',
    badge: 'Infraestructura',
    badgeColor: '#3b82f6', // Blue
    changes: [
      'Creado Dockerfile optimizado mediante una construcción multi-etapa (multi-stage build).',
      'Configurado Nginx Alpine como servidor web de producción para servir los recursos estáticos compilados.',
      'Añadido archivo .dockerignore para reducir el tamaño del contexto de construcción de la imagen.',
      'Configurado el puerto estándar 80 para la exposición del contenedor.'
    ]
  },
  {
    version: 'v1.0.0',
    date: 'Junio 2026',
    title: 'Lanzamiento Inicial de BeCasual Store Manager',
    badge: 'Lanzamiento',
    badgeColor: '#10b981', // Green
    changes: [
      'Desarrollo del núcleo administrativo BeCasual para la gestión unificada de almacenes de ropa.',
      'Módulo de Punto de Venta (POS) con registro de transacciones, IVA del 19% e historial de facturas.',
      'Módulo de Separaciones (Layaways) para gestionar abonos y plazos de entrega de mercancía a clientes.',
      'Módulo de Inventario con alertas de stock mínimo, escáner de código de barras y editor de catálogo.',
      'Módulo de Compras para registrar abastecimiento a proveedores y calcular costos promedio.',
      'Panel de Proyección y Quiebres de Stock para analizar la velocidad de venta y necesidad de reabastecimiento.',
      'Control de Cierre de Caja Diario con desglose de ventas por método de pago e informe consolidado.',
      'Gestión de Clientes, Empleados con cálculo de costos operativos, y seguridad RBAC con tres perfiles (Administrador, Vendedor, Comprador).'
    ]
  }
];

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '640px', width: '90%' }}>
        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>📜 Historial de Cambios</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Versiones de BeCasual Store Manager</span>
          </div>
          <button className="modal-close" onClick={onClose} style={{ fontSize: '20px' }}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '480px', overflowY: 'auto', padding: '24px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '0 24px' }}>
            {CHANGELOG.map((item, idx) => (
              <div key={item.version} style={{
                position: 'relative',
                paddingLeft: '24px',
                borderLeft: idx === CHANGELOG.length - 1 ? '2px solid transparent' : '2px dashed var(--border-color)',
                paddingBottom: idx === CHANGELOG.length - 1 ? '0' : '8px'
              }}>
                {/* Timeline node */}
                <div style={{
                  position: 'absolute',
                  left: '-7px',
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: item.badgeColor,
                  border: '2px solid var(--bg-card)'
                }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace'
                    }}>{item.version}</span>
                    <span className="badge" style={{
                      backgroundColor: `${item.badgeColor}20`,
                      color: item.badgeColor,
                      border: `1px solid ${item.badgeColor}40`,
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px'
                    }}>{item.badge}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.date}</span>
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                  {item.title}
                </h4>

                {/* List of changes */}
                <ul style={{
                  margin: '0',
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {item.changes.map((change, cIdx) => (
                    <li key={cIdx} style={{ listStyleType: 'disc' }}>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-body)',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Versión Activa: <strong>{CHANGELOG[0].version}</strong></span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
