import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera,
  images,
  map,
  heart,
  location
} from 'ionicons/icons';
import { PhotoService } from '../services/photo';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle
  ],
})
export class HomePage implements OnInit {
  private router = inject(Router);
  private photoService = inject(PhotoService);

  photoCount = 0;
  likedCount = 0;
  geolocatedCount = 0;

  constructor() {
    addIcons({ camera, images, map, heart, location });
  }

  async ngOnInit() {
    await this.loadStats();
  }

  async ionViewWillEnter() {
    await this.loadStats();
  }

  private async loadStats() {
    await this.photoService.loadSaved();
    const photos = this.photoService.getPhotos();

    this.photoCount = photos.length;
    this.likedCount = photos.filter(p => p.liked).length;
    this.geolocatedCount = photos.filter(p => p.location).length;
  }

  navigateToCamera() {
    this.router.navigate(['/camera']);
  }

  navigateToGallery() {
    this.router.navigate(['/gallery']);
  }

  navigateToMap() {
    this.router.navigate(['/map']);
  }
}
