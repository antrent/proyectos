#!/bin/bash

# Exit on error
set -e

echo "=============================================="
echo "🚀 Iniciando BeCasual en Docker Desktop..."
echo "=============================================="

# 1. Check if docker command is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado en tu sistema."
    echo "Por favor, descarga e instala Docker Desktop desde https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# 2. Check if Docker Daemon is running
if ! docker info &> /dev/null; then
    echo "⏳ El servicio de Docker no está activo. Intentando abrir Docker Desktop..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        echo "⏳ Esperando a que Docker Desktop se inicie..."
        until docker info &> /dev/null; do
            sleep 3
            echo -n "."
        done
        echo ""
    else
        echo "❌ Por favor, inicia Docker Desktop manualmente en tu sistema y vuelve a intentarlo."
        exit 1
    fi
fi

echo "✅ Docker está activo."

# 3. Stop and remove existing container if it exists
CONTAINER_NAME="becasual-app"
if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
    echo "🧹 Deteniendo y eliminando contenedor antiguo '${CONTAINER_NAME}'..."
    docker stop ${CONTAINER_NAME} &> /dev/null || true
    docker rm ${CONTAINER_NAME} &> /dev/null || true
fi

# 4. Clean macOS metadata files (prevent xattr build issues on external drives)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🧹 Consolidando metadatos de macOS (dot_clean)..."
    dot_clean .
fi

# 5. Build the image
echo "📦 Construyendo la imagen de Docker 'app-becasual'..."
docker build -t app-becasual .

# 6. Run the new container
echo "🚢 Lanzando el contenedor en el puerto 8080..."
docker run -d -p 8080:80 --name ${CONTAINER_NAME} app-becasual

echo "=============================================="
echo "🎉 ¡Todo listo! La aplicación se ejecutará en segundo plano."
echo "👉 Abre tu navegador en: http://localhost:8080"
echo "=============================================="

# 7. Open in browser automatically
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open "http://localhost:8080"
fi
