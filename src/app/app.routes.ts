import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    path: 'pantalla2',
    loadComponent: () => import('./pantalla2/pantalla2.page').then(m => m.Pantalla2Page)
  },
  {
    path: 'pantalla3',
    loadComponent: () => import('./pantalla3/pantalla3.page').then( m => m.Pantalla3Page)
  },
  {
    path: 'pantalla4',
    loadComponent: () => import('./pantalla4/pantalla4.page').then( m => m.Pantalla4Page)
  },
  {
    path: 'pantalla5',
    loadComponent: () => import('./pantalla5/pantalla5.page').then( m => m.Pantalla5Page)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion.page').then( m => m.ConfiguracionPage)
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then( m => m.PerfilPage)
  }
];