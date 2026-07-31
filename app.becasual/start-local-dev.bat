@echo off
echo ========================================================
echo 🚀 Iniciando Entorno de Desarrollo Local BeCasual POS
echo ========================================================

rem 1. Verificar e instalar dependencias del Backend si no existen
if not exist "backend\node_modules" (
    echo 📦 No se detecto la carpeta node_modules en backend. Instalando dependencias...
    cd backend
    call npm install
    cd ..
)

rem 2. Verificar e instalar dependencias del Frontend si no existen
if not exist "frontend\node_modules" (
    echo 📦 No se detecto la carpeta node_modules en frontend. Instalando dependencias...
    cd frontend
    call npm install
    cd ..
)

rem 3. Comprobar si PostgreSQL está activo en el puerto local 5432
netstat -ano | findstr :5432 >nul
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL no responde en el puerto 5432.
    echo Asegurese de iniciar el servicio PostgreSQL local en Windows.
    echo (Puedes iniciarlo desde el Administrador de Servicios o services.msc).
    pause
    exit /b
)

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
