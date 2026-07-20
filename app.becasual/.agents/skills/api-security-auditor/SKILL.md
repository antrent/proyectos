---
name: api-security-auditor
description: Audita la seguridad de los endpoints del backend Express, verificación de firmas y expiración de tokens JWT y control de acceso basado en roles (RBAC).
---

# API Security Auditor Skill

Esta habilidad profesional proporciona una lista de verificación y procedimiento para auditar la seguridad de la API del proyecto **BeCasual POS**.

## Pasos de Auditoría de Seguridad

1. **Autenticación mediante JWT**:
   - Verificar que todos los endpoints del backend (`/sales`, `/purchases`, `/expenses`, `/closings`) requieran el middleware `authenticateToken`.
   - Comprobar que los tokens incluyan expiración adecuada y que el secreto `JWT_SECRET` esté bien configurado en las variables de entorno.

2. **Control de Acceso Basado en Roles (RBAC)**:
   - Asegurarse de que las rutas administrativas (como presupuestos, configuración de la tienda y eliminaciones en cascada) estén protegidas y solo sean accesibles para usuarios con el rol `admin`.

3. **Prevención de Vulnerabilidades**:
   - Garantizar que los parámetros recibidos por la API en las solicitudes `req.body` o `req.query` sean validados y saneados antes de interactuar con Prisma para prevenir inyecciones o comportamiento no deseado.
