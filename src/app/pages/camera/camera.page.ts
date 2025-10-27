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
import { Capacitor } from '@capacitor/core';
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
  isWeb = false;

  constructor() {
    addIcons({
      cameraOutline,
      expandOutline,
      imagesOutline,
      timeOutline,
      locationOutline,
      informationCircleOutline
    });

    // Détecter si on est sur le web
    this.isWeb = Capacitor.getPlatform() === 'web';
    console.log('📱 Plateforme:', Capacitor.getPlatform());
  }

  async ngOnInit() {
    await this.loadLastPhoto();

    // Sur le web, afficher un message d'information sur les permissions
    if (this.isWeb) {
      console.log('🌐 Mode web détecté');
    }
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
    console.log('📷 takePicture - Début');
    console.log('📱 Plateforme:', Capacitor.getPlatform());

    // Sur le web, afficher un message explicatif avant la première capture
    if (this.isWeb && !this.lastPhoto) {
      await this.showWebCameraInfo();
    }

    // 1. Vérifier les permissions caméra
    try {
      console.log('🔐 Vérification permission caméra...');
      const hasCameraPermission = await this.permissionService.checkCameraPermission();
      console.log('📋 Permission caméra:', hasCameraPermission);

      if (!hasCameraPermission) {
        console.log('❌ Permission caméra refusée');
        // Le service a déjà affiché une alerte
        return;
      }

      console.log('✅ Permission caméra OK');
    } catch (error) {
      console.error('❌ Erreur vérification permission caméra:', error);
      await this.showToast('Erreur lors de la vérification des permissions de caméra', 'danger');
      return;
    }

    // 2. Vérifier les permissions localisation (optionnel)
    let hasLocationPermission = false;
    try {
      console.log('🔐 Vérification permission localisation...');
      hasLocationPermission = await this.permissionService.checkLocationPermission();
      console.log('📋 Permission localisation:', hasLocationPermission);

      if (!hasLocationPermission) {
        console.log('⚠️ Permission localisation refusée - Photo sera prise sans localisation');
        await this.showToast('Photo prise sans localisation', 'warning');
      }
    } catch (error) {
      console.error('⚠️ Erreur vérification permission localisation:', error);
      await this.showToast('Photo prise sans localisation', 'warning');
    }

    // 3. Prendre la photo
    try {
      this.isCapturing = true;
      console.log('📸 Lancement capture photo...');

      const photo = await this.photoService.takePicture();
      this.lastPhoto = photo;

      // Message de succès différent selon la localisation
      if (photo.location) {
        await this.showToast('Photo capturée avec localisation ! 📍', 'success');
      } else {
        await this.showToast('Photo capturée avec succès ! 📷', 'success');
      }

      console.log('✅ Photo capturée:', {
        id: photo.id,
        hasLocation: !!photo.location,
        hasAddress: !!photo.address
      });

    } catch (error: any) {
      console.error('❌ Erreur lors de la capture:', error);

      // Messages d'erreur spécifiques
      if (error.message && error.message.includes('cancelled')) {
        console.log('ℹ️ Capture annulée par l\'utilisateur');
        await this.showToast('Capture annulée', 'warning');
      } else if (error.message && error.message.includes('User denied')) {
        console.log('❌ Permission refusée pendant la capture');
        await this.showToast('Permission refusée. Veuillez autoriser l\'accès à la caméra.', 'danger');
      } else {
        await this.showToast('Erreur lors de la capture de la photo', 'danger');
      }
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Afficher un message d'information sur les permissions web
   */
  private async showWebCameraInfo() {
    const alert = await this.alertController.create({
      header: '📷 Accès à la caméra',
      message:
        'Votre navigateur va vous demander l\'autorisation d\'accéder à votre caméra.\n\n' +
        'Cliquez sur "Autoriser" dans la popup qui va apparaître.',
      buttons: [
        {
          text: 'J\'ai compris',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
    await alert.onDidDismiss();
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
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
