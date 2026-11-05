/**
 * Ficha técnica e historial del sistema ("Acerca del sistema" en el panel).
 *
 * Regla: cada vez que se entra a corregir o cambiar algo, se agrega aquí antes de publicar.
 * - Corrección o ajuste chico → sube el último número (1.5.0 → 1.5.1).
 * - Mejora o función nueva → sube el de en medio (1.5.1 → 1.6.0).
 * - Cambio que transforma el sistema (rediseño completo, nueva plataforma) → sube el primero (1.6.0 → 2.0.0).
 * La versión más nueva va primero, y `version` en package.json debe coincidir con ella.
 */

export type ChangeKind = 'nuevo' | 'mejora' | 'correccion';

export interface Release {
  version: string;
  /** AAAA-MM-DD */
  date: string;
  title: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const SYSTEM = {
  name: 'Fitness by Evidence',
  type: 'Plataforma de coaching: panel del coach, portal privado de cada cliente y sitio público',
  client: 'Germain Camarillo · Fitness by Evidence',
  developer: 'Bruno Dunay',
  developerRole: 'Diseño y desarrollo',
  supportPhone: '449 396 5327',
  supportWhatsapp: 'https://wa.me/524493965327',
  developerCard: 'https://tarjeta-bruno-dunay.vercel.app',
  /** Inicio del desarrollo. */
  createdAt: '2026-10-08',
  /** Primer día en producción. */
  liveSince: '2026-10-09',
  stack: [
    { label: 'Sitio y panel', value: 'Angular 22 con render en servidor (SSR)' },
    { label: 'API', value: 'Node.js + Express 5' },
    { label: 'Base de datos', value: 'PostgreSQL' },
    { label: 'Cálculos', value: 'Motor propio con pruebas contra las plantillas de Excel originales' },
    { label: 'Alojamiento del sitio', value: 'Netlify' },
    { label: 'Alojamiento de la API', value: 'Render' },
    { label: 'Código fuente', value: 'GitHub, con historial de cada cambio' },
  ],
} as const;

export const RELEASES: Release[] = [
  {
    version: '1.5.0',
    date: '2026-11-05',
    title: 'Acerca del sistema',
    changes: [{ kind: 'nuevo', text: 'Esta página: ficha técnica, estado de la conexión e historial de versiones del sistema.' }],
  },
  {
    version: '1.4.0',
    date: '2026-11-04',
    title: 'Instalación de demostración',
    changes: [
      { kind: 'nuevo', text: 'Copia aparte del sistema, de solo lectura y con clientes inventados, para enseñarlo sin abrir el real.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-13',
    title: 'Rediseño, agenda y legales',
    changes: [
      { kind: 'mejora', text: 'Rediseño visual del panel, el portal y el sitio.' },
      { kind: 'nuevo', text: 'Agenda de sesiones.' },
      { kind: 'nuevo', text: 'Pagos quincenales.' },
      { kind: 'nuevo', text: 'Páginas legales (aviso de privacidad y términos).' },
      { kind: 'mejora', text: 'Nutrición: "¿Cuadra el plan?" colorea cada renglón según su estado.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-10',
    title: 'Portal más claro y protocolos animados',
    changes: [
      { kind: 'mejora', text: 'Portal y panel: días en orden con descanso, día de hoy marcado y clientes plegables.' },
      { kind: 'nuevo', text: 'Lista del súper descargable para el cliente.' },
      { kind: 'nuevo', text: 'Protocolos con dibujos animados de caminata, bicicleta, sentadilla y máquinas de gimnasio.' },
      { kind: 'mejora', text: 'Íconos de cardio y calentamiento con movimiento propio.' },
      { kind: 'correccion', text: 'Teléfono: semanas, días, pestañas y la tabla de clientes ya no se desplazan de lado.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-09',
    title: 'Nutrición por porciones y pagos por cliente',
    changes: [
      { kind: 'nuevo', text: 'Nutrición por porciones (SMAE): dietocálculo, reparto por comida, equivalentes para el cliente, adicionales y notas.' },
      { kind: 'nuevo', text: 'Pagos: tarifa acordada por cliente, abonos parciales y saldo visible para coach y cliente.' },
      { kind: 'nuevo', text: 'Alta de cliente con apartado de pago y plan personalizado automático.' },
      { kind: 'mejora', text: 'El ajuste de calorías elige déficit o superávit con un botón.' },
      { kind: 'mejora', text: 'El logo superior lleva al panel (coach) o al resumen del plan (cliente).' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-10-09',
    title: 'Ajustes tras la publicación',
    changes: [
      { kind: 'correccion', text: 'Conexión entre el sitio y la API aunque la dirección se capture con diagonal final.' },
      { kind: 'nuevo', text: 'Cuenta de soporte opcional: segundo acceso al panel para dar mantenimiento.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-09',
    title: 'Puesta en producción',
    changes: [{ kind: 'nuevo', text: 'El sistema se publica: sitio en Netlify y API en Render.' }],
  },
  {
    version: '0.2.0',
    date: '2026-10-08',
    title: 'Pagos, nutrición y versión para teléfono',
    changes: [
      { kind: 'mejora', text: 'Rediseño visual: color por tipo, íconos animados y apoyo visual en catálogos.' },
      { kind: 'nuevo', text: 'Pagos y bloqueo del portal por pago vencido.' },
      { kind: 'nuevo', text: 'Un dibujo animado por ejercicio y ejercicios editables.' },
      { kind: 'nuevo', text: 'Nutrición con hasta 8 comidas, reparto manual con tope de 100 % y aviso de cuadre.' },
      { kind: 'mejora', text: 'Tablas y botones de guardar adaptados al teléfono.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-08',
    title: 'Primera versión',
    changes: [
      { kind: 'nuevo', text: 'Catálogos extraídos de las plantillas y motor de cálculo con pruebas.' },
      { kind: 'nuevo', text: 'API con clientes, planes de entrenamiento y nutrición, seguimiento y portal del cliente.' },
      { kind: 'nuevo', text: 'Sitio público, panel del coach y portal del cliente.' },
    ],
  },
];
