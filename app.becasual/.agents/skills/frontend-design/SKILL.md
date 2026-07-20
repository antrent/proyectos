---
name: frontend-design
description: Estándares de diseño de interfaz de usuario de alto nivel (UI/UX), tipografía Inter/Roboto, paletas de color Tailored CSS, animaciones suaves y componentes responsive para BeCasual POS.
---

# Frontend Design Skill

Esta habilidad profesional establece las directrices de diseño visual, interfaz y experiencia de usuario (UI/UX) para garantizar que la plataforma **BeCasual POS** mantenga una apariencia premium, moderna y responsive.

## Directrices de Diseño

1. **Tipografía y Legibilidad**:
   - Usar la fuente `Inter` o `Roboto` como tipografía primaria.
   - Mantener jerarquías claras: `h1` (24px-28px), `h2` (20px-24px), `h3` (16px-18px), cuerpo (13px-14px).

2. **Paleta de Colores Curada**:
   - Utilizar variables CSS globales (`var(--primary)`, `var(--bg-body)`, `var(--card-bg)`, `var(--text-primary)`).
   - Evitar colores planos sin contraste; utilizar degradados sutiles en tarjetas KPI y badges con tonos tailoreados (`success`, `warning`, `danger`).

3. **Micro-interacciones y Estados**:
   - Añadir transiciones suaves en efectos hover de botones y tarjetas (`transition: all 0.2s ease`).
   - Proveer retroalimentación visual inmediata en clicks y cargas (spinners, loaders y deshabilitado de botones durante peticiones).
