import { Routes } from '@angular/router';
import { PanelLayout } from '../../layouts/panel-layout/panel-layout';

export const PANEL_ROUTES: Routes = [
  {
    path: '',
    component: PanelLayout,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'clients', loadComponent: () => import('./clients/clients-list').then((m) => m.ClientsList) },
      { path: 'clients/new', loadComponent: () => import('./clients/client-create').then((m) => m.ClientCreate) },
      { path: 'clients/:id', loadComponent: () => import('./clients/client-detail').then((m) => m.ClientDetail) },
      { path: 'exercises', loadComponent: () => import('./catalogs/exercises-admin').then((m) => m.ExercisesAdmin) },
      { path: 'foods', loadComponent: () => import('./catalogs/foods-admin').then((m) => m.FoodsAdmin) },
      { path: 'supplements', loadComponent: () => import('./catalogs/supplements-admin').then((m) => m.SupplementsAdmin) },
      { path: 'protocols', loadComponent: () => import('./catalogs/protocols-admin').then((m) => m.ProtocolsAdmin) },
      { path: 'content', loadComponent: () => import('./content/content').then((m) => m.Content) },
      { path: 'settings', loadComponent: () => import('./settings/settings-admin').then((m) => m.SettingsAdmin) },
    ],
  },
];
