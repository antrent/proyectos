---
name: code-quality-auditor
description: Audita la calidad del código, sintaxis de JS/JSX, rendimiento de consultas Prisma y compilación del frontend/backend antes de realizar commits o despliegues.
---

# Code Quality Auditor Skill

Esta habilidad proporciona un procedimiento sistemático para auditar el código fuente del proyecto **BeCasual POS** antes de aceptar cambios o desplegar a producción.

## Pasos de Auditoría

1. **Auditoría de Sintaxis del Backend**:
   - Verificar sintaxis de controladores: `node -c src/controllers/salesController.js` (y de los controladores modificados).
   - Comprobar que no haya variables indefinidas o ReferenceErrors dentro de bucles o condicionales (`if`/`else`).

2. **Auditoría de Compilación del Frontend**:
   - Ejecutar en `frontend/`: `npm run build`.
   - Asegurarse de que el empaquetador Vite compile en limpio sin errores de JSX, imports no resueltos o variables globales inexistentes.

3. **Auditoría de Rendimiento en Consultas Prisma**:
   - Verificar que no existan bucles `for` que realicen consultas a la base de datos `await prisma...` en N iteraciones secuenciales.
   - Forzar el patrón de mapas en memoria + `createMany` de Prisma para inserciones de más de 10 elementos.
