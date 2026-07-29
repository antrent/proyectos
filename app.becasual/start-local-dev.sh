#!/bin/bash

echo "========================================================"
echo "🚀 Iniciando Entorno de Desarrollo Local BeCasual POS"
echo "========================================================"

# Comprobar si PostgreSQL local está activo
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️ PostgreSQL local no responde en localhost:5432."
    echo "Intentando iniciar servicio PostgreSQL local vía Homebrew (macOS)..."
    if command -v brew >/dev/null 2>&1; then
        brew services start postgresql@15 || brew services start postgresql
    else
        echo "No se encontro Homebrew. Asegurate de que tu servidor PostgreSQL local este corriendo manualmente en el puerto 5432."
    fi
    sleep 2
fi

echo "✅ PostgreSQL local activo."

# Iniciar Backend y Frontend en paralelo
echo "🌐 Arrancando Servidor Backend (http://localhost:5000) y Frontend (http://localhost:5173)..."

(cd backend && DATABASE_URL="postgresql://becasual_user:becasual_password_987@localhost:5432/becasual?schema=public" npm run dev) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
