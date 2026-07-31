@echo off
echo ========================================================
echo 🚀 Iniciando Entorno de Desarrollo Local BeCasual POS
echo ========================================================

rem 1. Verificar e instalar dependencias del Backend
if exist "backend\node_modules\.bin\prisma.cmd" goto check_prisma_client
echo 📦 No se detectaron las herramientas de Prisma en backend. Instalando dependencias...
cd backend
call npm install
cd ..

:check_prisma_client
if exist "backend\node_modules\.prisma" goto check_frontend
echo ⚙️ Generando cliente Prisma local para el Backend...
cd backend
call npx prisma generate
cd ..

:check_frontend
rem 2. Verificar e instalar dependencias del Frontend
if exist "frontend\node_modules\.bin\vite.cmd" goto check_postgres
echo 📦 No se detecto Vite en frontend. Instalando dependencias...
cd frontend
call npm install
cd ..

:check_postgres
rem 3. Comprobar si PostgreSQL está activo en el puerto local 5432
netstat -ano | findstr :5432 >nul
if %errorlevel% equ 0 goto postgres_ok

echo ⚠️ PostgreSQL no responde en el puerto 5432.
echo Asegurese de iniciar el servicio PostgreSQL local en Windows.
echo (Puedes iniciarlo desde el Administrador de Servicios o services.msc).
pause
exit /b

:postgres_ok
echo ✅ PostgreSQL local activo.

rem Iniciar Backend en una nueva consola
echo 🌐 Iniciando Servidor Backend (http://localhost:5000)...
start "BeCasual Backend" cmd /k "cd backend && set DATABASE_URL=postgresql://becasual_user:becasual_password_987@localhost:5432/becasual?schema=public && npm run dev"

rem Iniciar Frontend en una nueva consola
echo 🌐 Iniciando Servidor Frontend (http://localhost:5173)...
start "BeCasual Frontend" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo ✅ Entorno local listo en ejecucion.
echo Puedes cerrar esta ventana.
echo ========================================================
pause
