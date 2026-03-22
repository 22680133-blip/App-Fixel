import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'pantalla2',
    loadComponent: () => import('./pantalla2/pantalla2.page').then((m) => m.Pantalla2Page),
  },
  {
    path: 'pantalla3',
    loadComponent: () => import('./pantalla3/pantalla3.page').then((m) => m.Pantalla3Page),
  },
  {
    path: 'pantalla4',
    canActivate: [authGuard],
    loadComponent: () => import('./pantalla4/pantalla4.page').then((m) => m.Pantalla4Page),
  },
  {
    path: 'pantalla5',
    canActivate: [authGuard],
    loadComponent: () => import('./pantalla5/pantalla5.page').then((m) => m.Pantalla5Page),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./configuracion/configuracion.page').then((m) => m.ConfiguracionPage),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./perfil/perfil.page').then((m) => m.PerfilPage),
  },
];
