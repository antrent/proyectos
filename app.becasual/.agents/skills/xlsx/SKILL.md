---
name: xlsx
description: Herramientas y procedimientos para la lectura, validación, limpieza e importación masiva de datos desde archivos Excel (.xlsx/.csv).
---

# XLSX & Data Migration Skill

Esta habilidad profesional proporciona directrices para el procesamiento seguro de datos importados desde hojas de cálculo Excel (`.xlsx`) y archivos separados por comas (`.csv`).

## Procedimiento de Migración de Archivos

1. **Inspección de Encabezados**:
   - Leer y validar los nombres de columnas antes de procesar las filas para evitar fallos por columnas faltantes o renombradas.
   - Normalizar textos quitando asteriscos (`*`), espacios extra y convirtiendo valores numéricos (`parseCSVNumber`).

2. **Procesamiento e Inserción por Lotes**:
   - Evitar inserciones fila por fila en la base de datos.
   - Mapear productos y SKU en memoria y utilizar transacciones por bloques (`createMany`) de 100 en 100.
   - Generar un reporte de inconsistencias o filas omitidas para entregar al usuario al finalizar la importación.
