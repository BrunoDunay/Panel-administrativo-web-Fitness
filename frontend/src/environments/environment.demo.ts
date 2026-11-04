/**
 * Demostración: otra instalación del sistema, con su propia API y base de datos de clientes inventados.
 * Se construye con `ng build --configuration demo`. Nunca apunta a la API real.
 */
export const environment = {
  production: true,
  /** API de la demostración (backend con DEMO_MODE=true). Se ajusta al desplegarla. */
  apiUrl: 'https://fbe-demo-api.vercel.app/api',
  siteUrl: '',
  demo: true,
};
