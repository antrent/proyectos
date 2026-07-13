import React, { useState } from 'react';

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('user-guide');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      id: 'user-guide',
      title: '📖 Manual del Usuario Funcional',
      description: 'Guía paso a paso para la operación diaria de la tienda física (POS, Inventario, Caja y Abonos).',
      topics: [
        {
          title: '💵 1. Apertura Diaria de Caja',
          content: 'Antes de realizar cualquier operación de venta en una sucursal, es obligatorio registrar el saldo inicial en caja (base). Esta acción habilita el POS para facturar. Si la caja no está abierta, el sistema bloqueará la pestaña de ventas.'
        },
        {
          title: '🛒 2. Terminal de Ventas (POS)',
          content: 'Permite registrar compras de clientes escaneando códigos de barras o buscando productos manualmente. Puedes aplicar descuentos porcentuales sobre el total y asociar la compra a clientes registrados. Soporta múltiples métodos de pago (Efectivo, Nequi, Daviplata, Bold, SisteCrédito, Addi).'
        },
        {
          title: '🛍️ 3. Separaciones (Layaways) y Abonos',
          content: 'Si un cliente desea apartar una prenda, puedes registrar un "Separado" desde el checkout con un abono inicial. El inventario descuenta las prendas para reservarlas. El cliente puede realizar abonos parciales y el sistema entregará los productos automáticamente al saldar el 100% de la deuda.'
        },
        {
          title: '📦 4. Gestión de Inventario',
          content: 'Módulo para buscar, crear, editar y eliminar referencias del catálogo. Permite ajustar el stock, precio de costo y precio de venta de cada artículo. Alerta automáticamente cuando el stock de un producto cae por debajo de su stock mínimo configurado.'
        },
        {
          title: '🏁 5. Cierre Diario y Arqueo de Caja',
          content: 'Al final de la jornada laboral, el cajero debe realizar el arqueo físico de caja ingresando el dinero recolectado en efectivo, tarjetas y canales digitales. El sistema calcula automáticamente la diferencia contra las ventas reportadas por el software y registra el cuadre en el historial permanente.'
        }
      ]
    },
    {
      id: 'config-guide',
      title: '⚙️ Manual de Parametrización y Configuración',
      description: 'Cómo adaptar los parámetros, sucursales y roles de usuario de la tienda.',
      topics: [
        {
          title: '🏬 1. Gestión de Sucursales (Sedes)',
          content: 'En la pestaña de Configuración, el administrador puede definir las sucursales del negocio (Sede Principal, Sede Centro, etc.) ingresando su nombre, dirección, celular, correo, arriendo y tasa impositiva. La interfaz permite cambiar de sede activa en el header superior para segmentar los inventarios.'
        },
        {
          title: '🏷️ 2. Atributos de Prendas y Catálogo',
          content: 'El catálogo permite clasificar las prendas mediante parámetros: Líneas, Categorías, Estilos, Tallas, Colores, Géneros y Proveedores. Al registrar una compra o crear un producto nuevo, los nuevos parámetros ingresados se guardan automáticamente en la base de datos maestra.'
        },
        {
          title: '👥 3. Gestión de Empleados y Permisos',
          content: 'Permite administrar el personal registrando su nombre, documento, celular, salario y rol. El sistema cuenta con control de accesos por roles (RBAC): El Administrador tiene acceso total, el Vendedor solo accede a ventas/caja/clientes, y el Comprador solo accede a registrar compras e inventario.'
        }
      ]
    },
    {
      id: 'technical-guide',
      title: '💻 Manual Técnico y de Arquitectura',
      description: 'Estructura de infraestructura en la nube, base de datos de GCP y sincronización periódica.',
      topics: [
        {
          title: '☁️ 1. Arquitectura de Nube Serverless (GCP)',
          content: 'La aplicación opera de forma descentralizada y serverless: El Frontend está alojado en Firebase Hosting (distribución rápida global SSL). El Backend corre en un contenedor Docker en Google Cloud Run (escala a cero y es gratuito para los primeros 2 millones de peticiones). La Base de Datos PostgreSQL 15 corre en un contenedor Docker persistente en una VM e2-micro gratuita de Compute Engine en GCP.'
        },
        {
          title: '🗄️ 2. Modelo Relacional de Datos (Prisma/PostgreSQL)',
          content: 'La base de datos relacional PostgreSQL está estructurada bajo Prisma ORM con 10 tablas clave vinculadas por claves foráneas: Store (Sedes), Product (Inventario), Purchase (Abastecimiento), Sale y SaleDetail (Ventas y prendas facturadas), Client (Directorio de clientes), Employee (Personal), Layaway (Apartados) y Closing (Historial de cuadres de caja).'
        },
        {
          title: '🔄 3. Sincronización en Background (Offline-first)',
          content: 'Para garantizar un rendimiento de milisegundos y evitar caídas en zonas comerciales con mala conexión a internet, la aplicación lee los datos del LocalStorage local. En segundo plano, un servicio de Polling de 30 segundos realiza consultas asíncronas a Cloud Run para sincronizar productos, ventas y compras frescas de la nube, y las escrituras se despachan al instante en background sin congelar la interfaz.'
        },
        {
          title: '🚀 4. Integración y Despliegue Continuo (DevOps)',
          content: 'El código del proyecto está enlazado por SSH a un repositorio de GitHub. Para subir actualizaciones a producción: 1. Compilar localmente en tu Mac. 2. Realizar git push origin main. 3. En la Cloud Shell, correr git pull para actualizar el código. 4. Correr gcloud run deploy para actualizar la API del backend, y firebase deploy para actualizar la web del frontend.'
        }
      ]
    }
  ];

  // Filtrar temas según la búsqueda
  const filteredSections = sections.map(sec => {
    const matchedTopics = sec.topics.filter(topic =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...sec, topics: matchedTopics };
  }).filter(sec => sec.topics.length > 0 || sec.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '8px',
      maxWidth: '1200px',
      margin: '0 auto',
      color: 'var(--text-primary)'
    }}>
      {/* Header y Buscador */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        background: 'var(--bg-card)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
            📖 Centro de Ayuda y Documentación
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Consulta el manual funcional de operación y la arquitectura técnica del sistema POS.
          </p>
        </div>
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Buscar temas de ayuda..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '13px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-app)'
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '14px',
            color: 'var(--text-muted)'
          }}>
          </span>
        </div>
      </div>

      {/* Grid del Portal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '24px',
        alignItems: 'flex-start'
      }}>
        {/* Menú de Navegación del Portal */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'var(--bg-card)',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>
            Secciones
          </strong>
          {sections.map(sec => (
            <button
              key={sec.id}
              onClick={() => {
                setActiveSection(sec.id);
                setSearchQuery(''); // Limpiar búsqueda al cambiar sección
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                width: '100%',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeSection === sec.id && !searchQuery ? 'hsla(190, 70%, 40%, 0.1)' : 'transparent',
                color: activeSection === sec.id && !searchQuery ? 'var(--primary)' : 'var(--text-primary)',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: activeSection === sec.id && !searchQuery ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {sec.id === 'user-guide' && '📖'}
              {sec.id === 'config-guide' && '⚙️'}
              {sec.id === 'technical-guide' && '💻'}
              <span>{sec.title.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>

        {/* Panel de Contenido de Lectura */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {searchQuery ? (
            // Vista de Resultados de Búsqueda
            <div style={{
              background: 'var(--bg-card)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                🔍 Resultados de búsqueda para "{searchQuery}"
              </h2>
              {filteredSections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>⚠️</span>
                  No se encontraron temas que coincidan con tu búsqueda.
                </div>
              ) : (
                filteredSections.map(sec => (
                  <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase' }}>
                      En: {sec.title}
                    </span>
                    {sec.topics.map((topic, i) => (
                      <div key={i} style={{
                        padding: '16px',
                        background: 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>
                          {topic.title}
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {topic.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : (
            // Vista de Sección Activa
            sections.filter(sec => sec.id === activeSection).map(sec => (
              <div key={sec.id} style={{
                background: 'var(--bg-card)',
                padding: '32px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {sec.title}
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                    {sec.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sec.topics.map((topic, index) => (
                    <div key={index} style={{
                      padding: '20px',
                      background: 'var(--bg-app)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {topic.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {topic.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Diagrama adicional interactivo si la sección es Técnica */}
                {sec.id === 'technical-guide' && (
                  <div style={{
                    marginTop: '16px',
                    padding: '24px',
                    background: 'var(--bg-app)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      📡 Mapa de Arquitectura e Infraestructura de Nube
                    </strong>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      padding: '16px 0',
                      borderTop: '1px dashed var(--border-color)'
                    }}>
                      <div style={{ padding: '12px 20px', background: 'hsla(190, 70%, 40%, 0.1)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '20px' }}>🌐</span>
                        <strong style={{ fontSize: '12px', color: 'var(--primary)' }}>Vite Frontend</strong>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Firebase Hosting</span>
                      </div>
                      <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>➔</div>
                      <div style={{ padding: '12px 20px', background: 'hsla(140, 70%, 40%, 0.1)', border: '1px solid #2e7d32', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '20px' }}>🔌</span>
                        <strong style={{ fontSize: '12px', color: '#2e7d32' }}>API Express</strong>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>GCP Cloud Run</span>
                      </div>
                      <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>➔</div>
                      <div style={{ padding: '12px 20px', background: 'hsla(30, 70%, 40%, 0.1)', border: '1px solid #e65100', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '20px' }}>💾</span>
                        <strong style={{ fontSize: '12px', color: '#e65100' }}>PostgreSQL 15</strong>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>GCP Compute Engine</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
