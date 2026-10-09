# Fitness by Evidence · Germain Camarillo

Panel de trabajo del coach, portal del cliente y landing pública. Sustituye las plantillas de Excel de entrenamiento y nutrición: los mismos cálculos, sin duplicar hojas ni archivos por cliente.

```
/
├── frontend/           Angular 22 + SSR (landing, panel del coach y portal del cliente)
├── backend/            Node.js + Express 5 + PostgreSQL (API REST)
└── Identidad visual/   Logotipo y referencias de diseño
```

## Qué hace

- **Panel del coach** (`/panel`): clientes con su historia clínica, plan de entrenamiento (bloques, split, prioridades, semanas con pauta por ejercicio, cardio y calentamiento), plan de nutrición (gasto, macros, reparto por comida, gramos automáticos, cambios, lista del súper, hidratación y suplementos), seguimiento, **pagos** y catálogos editables.
- **Portal del cliente** (`/mi-plan/<código>`): cada cliente recibe un enlace privado, sin contraseña. Ahí ve su plan y registra carga y reps por serie, minutos de cardio, peso diario, cuestionario semanal y mediciones. El coach ve y puede corregir lo mismo desde el expediente. Si su pago está por vencer o ya venció, ve un aviso.
- **Landing** (`/`): servicios, método, coach y contacto. Todo el texto se edita desde el panel.

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 o superior (corriendo localmente)

## 1. Base de datos

Con `psql` (en Windows: `"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres`):

```sql
CREATE USER fbe_app WITH PASSWORD 'tu-contraseña';
CREATE DATABASE fbe OWNER fbe_app;
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # y completa DATABASE_URL, JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD
npm run dev            # http://localhost:3000/api
```

Al arrancar, el servidor:

1. aplica las migraciones pendientes (`backend/migrations/`);
2. crea la cuenta del coach con `ADMIN_EMAIL` / `ADMIN_PASSWORD` si todavía no existe;
3. carga los catálogos de las plantillas (149 ejercicios, 120 alimentos, 17 suplementos y los protocolos de cardio y calentamiento) y el contenido inicial de la landing, **solo si las tablas están vacías**. Nunca sobrescribe lo editado desde el panel.

Otros comandos: `npm test`, `npm run migrate`, `npm run migrate:down`.

### Pruebas

`npm test` corre las pruebas del motor de cálculo, que comparan cada fórmula contra los valores de las plantillas originales. Las pruebas de integración de la API necesitan una base desechable (la vacían al empezar):

```bash
TEST_DATABASE_URL=postgres://usuario:contraseña@localhost:5432/fbe_test npm test
```

## 3. Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:4200
```

- Panel: http://localhost:4200/login
- Build de producción con SSR: `npm run build`

## Dónde vive cada cálculo

Las fórmulas de las plantillas están en `backend/src/services/calculations/` como funciones puras:

| Archivo | Qué calcula |
|---|---|
| `nutrition.js` | Tasa metabólica, objetivo, macros, ciclado de calorías, reparto por comida, hidratación, dosis de suplementos, peso esperado |
| `meal-plan.js` | Gramos de cada alimento por comida, medidas caseras, equivalencias y lista del súper |
| `training.js` | Series hechas, e1RM (Epley), tonelaje, volumen por músculo, fechas de bloques, pasos, cumplimiento de cardio |

El frontend no repite ninguna fórmula: mientras el coach edita el plan de nutrición, el borrador se recalcula en el servidor con el mismo motor que verá el cliente.

## Pagos

La fecha del **próximo pago** de cada cliente está en su expediente. Cuando el coach registra un pago (pestaña **Pagos** del cliente o desde el resumen), el vencimiento se recorre solo según el tipo de plan (mensual, trimestral, semestral o anual) y el pago queda en el historial con su puntualidad: a tiempo, días antes o días tarde. El siguiente vencimiento se calcula a partir del vencimiento anterior, no del día en que se pagó; el coach puede cambiarlo a mano. El cliente ve un aviso en su portal desde 7 días antes. Con el pago vencido su enlace sigue abriendo, pero solo muestra el aviso de pago (no puede ver ni registrar nada); el coach puede permitirle el acceso con un clic desde la lista de clientes, el resumen o la pestaña Pagos, y ese permiso se apaga solo al registrar el pago. Las reglas están en `backend/src/services/calculations/payments.js`.

## Dibujos de los ejercicios

Cada ejercicio del catálogo tiene un dibujo animado propio que muestra el movimiento y el equipo (barra, Smith, mancuernas, polea o máquina). No son imágenes: cada dibujo son dos posturas de un esqueleto articulado y la animación se calcula entre ambas.

- `frontend/src/app/components/visual/figure-rig.ts`: el esqueleto y el equipo.
- `frontend/src/app/components/visual/exercise-figures.ts`: las posturas de cada ejercicio.
- `frontend/src/app/components/visual/figure-resolve.ts`: qué dibujo le toca a cada ejercicio. Uno nuevo toma el del ejercicio de nombre más parecido; el coach puede elegir otro al editarlo.

## Contenido provisional

Los textos de la landing son provisionales hasta que se guarden desde **Panel → Contenido**; mientras tanto aparecen en el resumen del panel como "Pendiente de confirmar". Faltan por capturar: teléfono, correo, redes sociales, estudios y certificaciones del coach. El contenido inicial está en `backend/seeders/initial-content.js`.

## Producción

**Backend** (`backend/.env`):
- `NODE_ENV=production` y `DATABASE_URL` de la base en la nube (`DATABASE_SSL=true` si el proveedor lo pide).
- `JWT_SECRET` nuevo y largo (48+ caracteres aleatorios).
- `CORS_ORIGINS` y `PUBLIC_SITE_URL` con el dominio real (sin localhost). Con `PUBLIC_SITE_URL` se arman los enlaces privados de los clientes.
- `npm start`: aplica las migraciones pendientes y crea la cuenta inicial si no existe.

**Frontend en Netlify**:
- `netlify.toml` (raíz) define carpeta, comando y encabezados; el SSR corre como Edge Function desde `frontend/src/server.ts`.
- `frontend/src/environments/environment.ts`: `apiUrl` debe apuntar a la API desplegada.
