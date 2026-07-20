---
name: theme-factory
description: Sistema de temas visuales dinámicos, soporte para modo claro/oscuro, glassmorphism y variables CSS unificadas para el POS.
---

# Theme Factory Skill

Esta habilidad profesional gestiona los temas visuales y estilos CSS unificados de **BeCasual POS**.

## Reglas del Sistema de Temas

1. **Tokens de Estilo CSS**:
   - Mantener las variables centrales en `:root` dentro de `index.css`:
     - `--primary`: Color corporativo principal (Naranja / Terracota `#e05638`).
     - `--bg-body`: Fondo de aplicación limpio y elegante.
     - `--card-bg`: Fondo de contenedores y tarjetas.
     - `--border-color`: Bordes suaves para delimitación de bloques.

2. **Diseño de Tarjetas y Glassmorphism**:
   - Aplicar efectos de sombreado sutiles (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05)`).
   - Usar bordes redondeados consistentes (`border-radius: 12px` en tarjetas, `8px` en botones).
