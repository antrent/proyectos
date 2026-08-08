# BeCasual POS - Guía de Configuración e Instalación Local

Este repositorio contiene la aplicación **BeCasual POS** (Frontend de React + Vite y Backend de Node.js + Express + Prisma). Sigue estos pasos para instalar y ejecutar el proyecto en tu entorno local.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:

1. **Node.js** (Versión 18 o superior recomendada).
2. **PostgreSQL** (Versión 14 o superior recomendada, corriendo localmente en el puerto `5432`).
3. **npm** (Viene integrado con Node.js).

---

## ⚙️ 1. Configuración de la Base de Datos

El backend se conecta a una base de datos local llamada `becasual`. Sigue estos pasos para configurarla:

1. Abre tu gestor de base de datos PostgreSQL (psql, pgAdmin o DBeaver) y ejecuta los siguientes comandos SQL para crear el usuario y la base de datos:

```sql
-- Crear el usuario para la aplicación
CREATE USER becasual_user WITH PASSWORD 'becasual_password_987';

-- Crear la base de datos asignando el dueño
CREATE DATABASE becasual OWNER becasual_user;
```

2. Conéctate a la base de datos `becasual` y asegúrate de que el esquema `public` tenga permisos para el usuario `becasual_user`.

---

## 📥 2. Instalación de Dependencias

Ejecuta los siguientes comandos desde la terminal en la raíz del proyecto para descargar e instalar los módulos requeridos por el frontend y el backend:

### En macOS / Linux:
```bash
# Instalar dependencias del backend
cd backend && npm install

# Sincronizar esquema de base de datos local mediante Prisma
npx prisma db push

# Regresar e instalar dependencias del frontend
cd ../frontend && npm install
cd ..
```

### En Windows (PowerShell / Command Prompt):
```cmd
:: Instalar dependencias del backend
cd backend
npm install

:: Sincronizar esquema de base de datos local mediante Prisma
npx prisma db push

:: Regresar e instalar dependencias del frontend
cd ..\frontend
npm install
cd ..
```

---

## 🚀 3. Ejecución del Entorno Local

Hemos creado scripts de un solo clic para inicializar tanto el servidor backend como el frontend en paralelo:

### 🍎 En macOS y Linux:
1. Dale permisos de ejecución al script (solo la primera vez):
   ```bash
   chmod +x start-local-dev.sh
   ```
2. Ejecuta el script:
   ```bash
   ./start-local-dev.sh
   ```

### 🪟 En Windows:
1. Haz doble clic en el archivo `start-local-dev.bat` o ejecútalo desde el Command Prompt:
   ```cmd
   start-local-dev.bat
   ```

Esto abrirá los puertos locales:
*   **Frontend**: `http://localhost:5173` (React / Vite)
*   **Backend**: `http://localhost:5000` (Node.js API)

---

## 🔑 Credenciales Iniciales de Acceso
*   **Usuario**: `admin`
*   **Contraseña**: `123`
