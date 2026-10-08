import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ---- Panel del coach (lazy; sin sesión ni siquiera se descarga) ----
  {
    path: 'panel',
    canMatch: [authGuard],
    loadChildren: () => import('./pages/panel/panel.routes').then((m) => m.PANEL_ROUTES),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },

  // ---- Portal del cliente (enlace privado, sin contraseña) ----
  {
    path: 'mi-plan/:code',
    loadComponent: () => import('./pages/portal/portal').then((m) => m.Portal),
  },

  // ---- Landing ----
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound) },
];
