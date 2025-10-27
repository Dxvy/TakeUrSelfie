import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  expandOutline,
  imagesOutline,
  timeOutline,
  locationOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { PhotoService, UserPhoto } from '../../services/photo';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.page.html',
  styleUrls: ['./camera.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class CameraPage implements OnInit {
  private photoService = inject(PhotoService);
  private permissionService = inject(PermissionService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  lastPhoto?: UserPhoto;
  isCapturing = false;

  constructor() {
    addIcons({
      cameraOutline,
      expandOutline,
      imagesOutline,
      timeOutline,
      locationOutline,
      informationCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadLastPhoto();
  }

  async ionViewWillEnter() {
    await this.loadLastPhoto();
  }

  private async loadLastPhoto() {
    await this.photoService.loadSaved();
    const photos = this.photoService.getPhotos();
    if (photos.length > 0) {
      this.lastPhoto = photos[0];
    }
  }

  async takePicture() {
    console.log('takePicture - Début');

    // Vérifier les permissions caméra
    try {
      const hasCameraPermission = await this.permissionService.checkCameraPermission();
      console.log('Permission caméra:', hasCameraPermission);

      if (!hasCameraPermission) {
        console.log('Permission caméra refusée');
        return;
      }
    } catch (error) {
      console.error('Erreur vérification permission caméra:', error);
      await this.showToast('Erreur lors de la vérification des permissions', 'danger');
      return;
    }

    // Vérifier les permissions localisation
    try {
      const hasLocationPermission = await this.permissionService.checkLocationPermission();
      console.log('Permission localisation:', hasLocationPermission);

      if (!hasLocationPermission) {
        await this.showToast('Photo prise sans localisation', 'warning');
      }
    } catch (error) {
      console.error('Erreur vérification permission localisation:', error);
      await this.showToast('Photo prise sans localisation', 'warning');
    }

    try {
      this.isCapturing = true;
      console.log('Lancement capture photo...');

      const photo = await this.photoService.takePicture();
      this.lastPhoto = photo;

      await this.showToast('Photo capturée avec succès !', 'success');
      console.log('Photo capturée:', photo);
    } catch (error: any) {
      console.error('Erreur lors de la capture:', error);

      if (error.message && error.message.includes('cancelled')) {
        await this.showToast('Capture annulée', 'warning');
      } else {
        await this.showToast('Erreur lors de la capture', 'danger');
      }
    } finally {
      this.isCapturing = false;
    }
  }

  viewLastPhoto() {
    if (this.lastPhoto) {
      this.router.navigate(['/gallery'], {
        queryParams: { photoId: this.lastPhoto.id }
      });
    }
  }

  navigateToGallery() {
    this.router.navigate(['/gallery']);
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
