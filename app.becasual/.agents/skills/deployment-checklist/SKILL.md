---
name: deployment-checklist
description: Lista de comprobación automatizada previa al despliegue en producción en GCP Cloud Run y Firebase Hosting.
---

# Deployment Checklist Skill

Esta habilidad define la lista de verificación obligatoria que debe ejecutarse antes de cualquier despliegue a producción.

## Lista de Comprobación Pre-Despliegue

- [ ] **Validación Local Exitosa**: La funcionalidad ha sido probada en `http://localhost:5173` usando el entorno local (`./start-local-dev.sh`).
- [ ] **Sin Errores de Compilación**: `npm run build` en `frontend/` se ejecuta con éxito en 0 errores.
- [ ] **Sintaxis Backend Validada**: `node -c` en archivos JS modificados no muestra advertencias ni fallos.
- [ ] **Revisión de Variables de Entorno**: Las URLs de API (`VITE_API_URL`) y la base de datos de producción (`DATABASE_URL`) apuntan a los endpoints correctos en sus archivos `.env` respectivos.
- [ ] **Afectación de Stock Verificada**: Si el cambio involucra compras o ventas, la afectación del inventario ha sido comprobada.
- [ ] **Despliegue Controlado**: Ejecución del script automatizado `./deploy-to-production.sh`.
