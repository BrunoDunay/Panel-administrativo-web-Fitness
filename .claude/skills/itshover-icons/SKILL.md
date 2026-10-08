---
name: itshover-icons
description: Agrega o cambia iconos del proyecto usando la librería itshover (github.com/itshover/itshover). Úsala cuando se pida un icono nuevo, cambiar uno existente, o animar un icono en el panel, el portal o la landing de Fitness by Evidence.
---

# Iconos itshover en este proyecto (Angular)

itshover es una librería de iconos animados hecha con **React + Motion**, así que sus componentes
no se pueden importar en Angular. Aquí se usa así:

1. **Los trazos** (los `<path>` de cada icono) se extraen del repositorio con un script y se guardan
   en `frontend/src/app/components/icon/itshover-icons.ts` (archivo generado, no se edita a mano).
2. **La animación** al pasar el cursor está rehecha en CSS dentro de
   `frontend/src/app/components/icon/icon.ts`.
3. **Lo que itshover no tiene** (mancuerna, pastilla, báscula, corredor, calendario…) vive en
   `frontend/src/app/components/icon/custom-icons.ts`, dibujado en el mismo estilo.

Uso en una plantilla: `<app-icon name="dumbbell" [size]="20" />`.

## Agregar un icono de itshover

1. Busca su nombre de archivo en https://itshover.com/icons o en la carpeta `icons/` del repositorio
   (por ejemplo `trophy-icon`).
2. Añade una línea a `frontend/src/app/components/icon/itshover.map.json`:
   `"nombreEnElProyecto": "nombre-del-archivo-sin-extension"`.
3. Clona el repositorio en una carpeta temporal **fuera del proyecto** y corre el extractor. El
   script solo lee los `.tsx` como texto; no instales ni ejecutes nada del repositorio.

   ```bash
   git clone --depth 1 https://github.com/itshover/itshover.git <carpeta-temporal>/itshover
   node .claude/skills/itshover-icons/scripts/extract.mjs <carpeta-temporal>/itshover \
     frontend/src/app/components/icon/itshover.map.json \
     frontend/src/app/components/icon/itshover-icons.ts
   ```

4. El script avisa si algún nombre no existe. El tipo `IconName` se actualiza solo.

## Si el icono no existe en itshover

Dibújalo en `custom-icons.ts` con las mismas reglas, para que no se note la diferencia:

- Caja de `24 × 24`, solo trazo (sin relleno), puntas y uniones redondeadas. El grosor lo pone el
  componente (equivale a 1.8 en caja de 24).
- **Un trazo por parte del dibujo** (`stroke('M…', 'M…')`): la animación de dibujado recorre los
  trazos en orden, así que el orden es el orden en que "se dibuja".
- Si viene de otra librería, revisa que su licencia permita copiarlo (Tabler y Lucide son MIT/ISC).

## Elegir la animación

En `icon.ts`, el mapa `MOTION` asigna a cada icono cómo se mueve cuando el cursor entra al
enlace, botón o elemento `.icon-hover` que lo contiene. Si no está en el mapa, usa `draw`.

| Animación | Qué hace | Para qué |
|---|---|---|
| `draw` | Los trazos se dibujan uno tras otro | Por defecto |
| `spin` | Media vuelta | Ajustes, recargar |
| `right` / `left` / `up` / `down` | Empujón en esa dirección | Flechas, enviar, descargar, salir |
| `pop` | Crece y regresa | Corazón, estrella, check, agregar |
| `shake` | Sacudida | Eliminar, alertas |
| `lift` | Sube y gira, como una repetición | Mancuerna |
| `tilt` | Inclinación breve | Editar, báscula, pastilla |

Reglas que ya respeta el componente y hay que conservar:

- Solo anima con cursor real (`hover: hover` y `pointer: fine`) y sin "reducir movimiento".
- Dura menos de 650 ms y usa curvas de salida fuertes; no se repite en bucle.
- La animación debe **decir algo del icono** (una flecha avanza, un bote se sacude). Si no hay un
  movimiento que venga al caso, se queda en `draw`.

Para que un contenedor que no es enlace ni botón dispare la animación de sus iconos, ponle la
clase `icon-hover`.
