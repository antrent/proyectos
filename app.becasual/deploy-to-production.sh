#!/bin/bash

echo "=========================================================="
echo "🚀 PUBLICACIÓN A PRODUCCIÓN (GCP) - BeCasual POS"
echo "=========================================================="
echo "⚠️  REGLA DE ORO: Asegúrate de haber probado y validado tus cambios"
echo "    previamente en tu entorno local (http://localhost:5173)."
echo "=========================================================="
read -p "¿Confirmas que los cambios ya fueron probados y aprobados localmente? (s/n): " confirm

if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo "❌ Despliegue cancelado. Continúa probando tus cambios localmente."
    exit 1
fi

echo ""
echo "📌 Paso 1: Subiendo cambios a GitHub..."
read -p "Escribe el mensaje del commit para esta versión: " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Actualización probada localmente y lista para producción"
fi

git add .
git commit -m "$commit_msg"
git push origin RamaRemota

echo "✅ Cambios subidos a GitHub."

echo ""
echo "🚀 Paso 2: Desplegando Backend a GCP Cloud Run..."
(cd backend && gcloud run deploy becasual-backend --source . --project pto-becasual --region us-central1 --allow-unauthenticated)

echo ""
echo "🌐 Paso 3: Compilando y desplegando Frontend a Firebase Hosting..."
(cd frontend && npm run build && firebase deploy --only hosting --project pto-becasual)

echo ""
echo "=========================================================="
echo "🎉 ¡DESPLIEGUE A PRODUCCIÓN COMPLETADO CON ÉXITO!"
echo "=========================================================="
