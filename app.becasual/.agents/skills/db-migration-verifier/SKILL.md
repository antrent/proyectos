---
name: db-migration-verifier
description: Procedimiento seguro para verificar migraciones de base de datos PostgreSQL con Prisma, asegurando que las restricciones de clave foránea y los esquemas permanezcan 100% íntegros.
---

# DB Migration Verifier Skill

Esta habilidad guía la validación de cambios en el esquema de base de datos Prisma (`schema.prisma`) para evitar fallos de llaves foráneas o borrados accidentales de información.

## Pasos de Verificación

1. **Prueba en Entorno Local**:
   - Aplicar el cambio de esquema en la base de datos local de Mac:
     `DATABASE_URL="postgresql://becasual_user:becasual_password_987@localhost:5432/becasual?schema=public" npx prisma db push`
   - Regenerar el cliente de Prisma: `npx prisma generate`.

2. **Validación de Claves Foráneas**:
   - Comprobar que todos los modelos que hacen referencia a otros modelos (ej. `ExpenseBudget` -> `ExpenseCategory`) incluyan sus tablas base registradas y las relaciones `fields`/`references` bien declaradas.
   - En borrados de registros vinculados, aplicar cascada manual o verificar restricciones para evitar errores `P2003` (Foreign key constraint failed).

3. **Sincronización Cloud**:
   - Una vez comprobada la migración en local, aplicar `npx prisma db push` a la base de datos de producción de GCP.
