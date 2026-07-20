---
name: unit-test-runner
description: Ejecuta y valida las pruebas unitarias automáticas de las operaciones críticas de negocio (cálculos de ventas, facturación, compras y stock de inventario).
---

# Unit Test Runner Skill

Esta habilidad profesional define las pruebas automáticas para verificar la corrección de los cálculos financieros y de inventario en **BeCasual POS**.

## Áreas de Validación Automatizada

1. **Cálculos Financieros de Facturación**:
   - Verificar que los subtotales, impuestos (IVA 19%), descuentos fijos/porcentuales y totales de venta coincidan matemáticamente en las estrategias de cobro (`StandardBillingStrategy`).
   - Comprobar que los cierres diarios sumen con exactitud todos los métodos de pago (Efectivo, Bold, Nequi, SisteCrédito, etc.).

2. **Integridad del Inventario**:
   - Probar que cada operación de venta reste la cantidad correspondiente del campo `stock` del producto.
   - Probar que cada operación de compra adicione la cantidad del campo `stock` del producto.
   - Validar que el stock neto resultante cumpla la relación: `Stock = Compras - Ventas`.
