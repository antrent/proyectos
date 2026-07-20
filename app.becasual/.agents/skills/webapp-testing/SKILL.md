---
name: webapp-testing
description: Procedimientos de prueba integral para validar el funcionamiento de formularios, modales, estado global y navegación en el frontend de React.
---

# WebApp Testing Skill

Esta habilidad guía las pruebas de extremo a extremo de las funcionalidades de la aplicación web del cliente **BeCasual POS**.

## Procedimiento de Pruebas

1. **Flujo de Autenticación y Sesión**:
   - Probar inicio de sesión con credenciales válidas e inválidas.
   - Verificar la persistencia del token de sesión en `sessionStorage` y la redirección según el rol (`admin` o `vendedor`).

2. **Formularios de Facturación e Inventario**:
   - Validar que los campos numéricos (cantidades, precios, descuentos) no permitan valores negativos o no numéricos.
   - Probar la apertura y cierre de modales de confirmación (anulación de factura, creación de producto, registro de gasto).

3. **Manejo de Errores y Carga**:
   - Simular pérdida de conexión a internet o fallos de API para comprobar que la interfaz muestre mensajes de alerta claros al usuario sin romperse ni quedarse en pantalla blanca.
