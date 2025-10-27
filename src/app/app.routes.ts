import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'camera',
    loadComponent: () => import('./pages/camera/camera.page').then( m => m.CameraPage)
  },
  {
    path: 'gallery',
    loadComponent: () => import('./pages/gallery/gallery.page').then( m => m.GalleryPage)
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map/map.page').then( m => m.MapPage)
  },
];
