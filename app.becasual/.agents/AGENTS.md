# Reglas de Gobierno y Control de Cambios - BeCasual POS

Este documento establece las políticas obligatorias de ingeniería de software, control de calidad y gestión de despliegues para el proyecto **BeCasual POS**.

---

## 1. Política de Desarrollo "Local-First" (Obligatoria)
*   **Regla**: Todo cambio de código (Frontend o Backend) o modificación en el esquema de base de datos DEBE ser desarrollado, probado y verificado previamente en el entorno local (`http://localhost:5173` y PostgreSQL local `localhost:5432`).
*   **Prohibición**: Queda estrictamente prohibido realizar despliegues directos a producción (GCP Cloud Run o Firebase) sin la previa validación local.

## 2. Calidad de Código y Verificación de Compilación
*   **Frontend**: Antes de cualquier commit, se debe ejecutar `npm run build` en la carpeta `frontend/` y verificar que la compilación pase sin errores de sintaxis o referencias rotas.
*   **Backend**: Antes de cualquier commit, se debe verificar la sintaxis ejecutando `node -c <archivo>` en los controladores y scripts modificados.

## 3. Seguridad e Integridad de Base de Datos
*   **Patrón de Inserción Masiva**: Las llamadas a la API que procesen volúmenes masivos de datos (ventas/compras) deben usar transacciones no bloqueantes con mapeo en memoria y `createMany` de Prisma para prevenir caídas por timeout.
*   **Integridad Referencial**: Todo cambio de esquema en `prisma/schema.prisma` debe incluir la verificación de llaves foráneas (`onDelete` / `onUpdate`) y probarse con `npx prisma db push` en la BD local antes de sincronizar con GCP.
*   **Afectación de Inventario**: Toda operación que involucre venta o compra de productos debe actualizar automáticamente el campo `stock` con el cálculo neto `(Compras - Ventas)`.

## 4. Control de Versiones (Git)
*   **Commits Informativos**: Los mensajes de commit deben describir claramente la funcionalidad agregada o el bug solucionado (ej. `feat: añadido módulo de presupuestos` o `fix: corregido cruce de SKU en importador`).
