# Landing Page Premium - Consultoría en Arquitectura de TI y Tecnología

Landing Page moderna, de alto impacto y estilo **SaaS Premium / Dev-Focused** diseñada para captar leads ejecutivos (CTOs, CEOs, VPs de Ingeniería) para servicios independientes de consultoría técnica.

---

## 🚀 Cómo Ejecutar Localmente

### Opción 1: Servidor HTTP Simple (Recomendado)
Desde la carpeta raíz del proyecto (`tech-advisory-landing`), ejecuta:

```bash
# Con Python 3
python3 -m http.server 3000
```
Luego abre tu navegador en: [http://localhost:3000](http://localhost:3000)

### Opción 2: Con Node.js / NPM
```bash
# Iniciar servidor de desarrollo
npm run dev
# o
npm start
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Guía de Despliegue en Producción

Al ser una aplicación web estática pura (HTML5, Tailwind CSS, JS Vanilla), se puede desplegar en segundos y gratis en cualquier plataforma cloud:

### 1. Despliegue en Vercel (Recomendado)
```bash
# Usando Vercel CLI
npx vercel
```
*O conecta tu repositorio de GitHub directamente en [vercel.com](https://vercel.com) (no requiere configuración especial).*

### 2. Despliegue en Netlify
```bash
# Usando Netlify CLI
npx netlify deploy --prod
```
*O arrastra la carpeta `tech-advisory-landing` directamente en [app.netlify.com/drop](https://app.netlify.com/drop).*

### 3. Despliegue en Cloudflare Pages / GitHub Pages
1. Sube los archivos a tu repositorio de GitHub.
2. En GitHub: Ve a **Settings > Pages** y selecciona la rama `main` / root directory `/`.
3. ¡Listo! Tu web estará en vivo con certificado SSL automático.
