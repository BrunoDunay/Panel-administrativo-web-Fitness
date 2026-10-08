import { IconName } from '../../components/icon/icon';

export interface PanelNavItem {
  label: string;
  path: string;
  icon: IconName;
}

export interface PanelNavGroup {
  title: string;
  items: PanelNavItem[];
}

/** Menú lateral del panel, agrupado por tarea. */
export const PANEL_NAV: PanelNavGroup[] = [
  {
    title: 'Trabajo',
    items: [
      { label: 'Resumen', path: '/panel', icon: 'dashboard' },
      { label: 'Clientes', path: '/panel/clients', icon: 'users' },
    ],
  },
  {
    title: 'Catálogos',
    items: [
      { label: 'Ejercicios', path: '/panel/exercises', icon: 'dumbbell' },
      { label: 'Alimentos', path: '/panel/foods', icon: 'food' },
      { label: 'Suplementos', path: '/panel/supplements', icon: 'pill' },
      { label: 'Protocolos', path: '/panel/protocols', icon: 'clipboard' },
    ],
  },
  {
    title: 'Sitio',
    items: [
      { label: 'Contenido', path: '/panel/content', icon: 'edit' },
      { label: 'Cuenta', path: '/panel/settings', icon: 'settings' },
    ],
  },
];
