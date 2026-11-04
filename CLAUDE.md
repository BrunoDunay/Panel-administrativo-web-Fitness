# Fitness by Evidence · Germain Camarillo (cliente real)

Panel del coach, portal privado de cada cliente y landing pública. Reemplaza sus plantillas de Excel de
entrenamiento y nutrición con los mismos cálculos. Detalle de funciones, cálculos e instalación: `README.md`.

## Dónde vive

- Sitio real: https://fitnessbyevidence.netlify.app (Netlify, `netlify.toml` en la raíz).
- API real: https://panel-administrativo-web-fitness.onrender.com/api (Render).
- **Demo** (solo lectura, clientes inventados, acceso de invitado): https://fbe-demo.vercel.app y
  https://fbe-demo-api.vercel.app/api (Vercel `fbe-demo` y `fbe-demo-api`, Neon `fbe-demo`). Se publica a mano, no por git.
- Repo: `BrunoDunay/Panel-administrativo-web-Fitness`, rama `main`.

## Estructura

- `frontend/`: Angular 22 + SSR (landing `/`, panel `/panel`, portal `/mi-plan/<código>`). Configuración `demo` para la instalación de demostración.
- `backend/`: Node + Express 5 + PostgreSQL. Fórmulas en `backend/src/services/calculations/` (funciones puras, con pruebas contra las plantillas).
  `DEMO_MODE=true` = solo lectura + invitado; `backend/api/index.js` + `backend/vercel.json` para correr la API en Vercel.
- `clientes/`: archivos reales de clientes (datos de salud). **Nunca van al repo** (está en `.gitignore`).
- `video-flujo/`, `video-flujo-vertical/`: videos HyperFrames del flujo. `videos-para-compartir/`: los MP4 finales (fuera de git).
- `Identidad visual/`, `Estructura y funcionalidad/`: material del cliente.

## Estado (4 nov 2026)

- Último trabajo: modo demostración. Guardado y subido el 4 nov 2026. La demo (fbe-demo) se sigue usando.
- El 4 nov 2026 se borró la copia `Germain-rediseno` (no se usaba). Sus dos videos pasaron a `videos-para-compartir/`.
  Su PostgreSQL de prueba (`%USERPROFILE%\.fbe-rediseno-pg`) se mandó a la Papelera.
- `figure-rig.ts` (figuras de ejercicios) se copió a la demo Forja de `2-Demos/Gimnasio`.
