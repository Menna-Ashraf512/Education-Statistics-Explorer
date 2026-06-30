import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard/components/charts/charts').then(m => m.Charts) },
];
