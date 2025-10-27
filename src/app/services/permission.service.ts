import { Injectable, inject } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { AlertController } from '@ionic/angular';

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt'
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private alertController = inject(AlertController);

  constructor() {}

  // Vérifier et demander permission caméra
  async checkCameraPermission(): Promise<boolean> {
    console.log('checkCameraPermission - Début');

    try {
      // Vérifier l'état actuel
      const permission = await Camera.checkPermissions();
      console.log('État permission caméra:', permission);

      if (permission.camera === 'granted') {
        console.log('Permission caméra déjà accordée');
        return true;
      }

      if (permission.camera === 'denied') {
        console.log('Permission caméra refusée - affichage alerte');
        await this.showPermissionDeniedAlert('caméra');
        return false;
      }

      // Demander la permission
      console.log('Demande permission caméra...');
      const request = await Camera.requestPermissions({ permissions: ['camera'] });
      console.log('Résultat demande permission caméra:', request);

      if (request.camera === 'granted') {
        console.log('Permission caméra accordée');
        return true;
      } else {
        console.log('Permission caméra refusée après demande');
        await this.showPermissionDeniedAlert('caméra');
        return false;
      }
    } catch (error) {
      console.error('Erreur permission caméra:', error);
      return false;
    }
  }

  // Vérifier et demander permission localisation
  async checkLocationPermission(): Promise<boolean> {
    console.log('checkLocationPermission - Début');

    try {
      // Vérifier l'état actuel
      const permission = await Geolocation.checkPermissions();
      console.log('État permission localisation:', permission);

      if (permission.location === 'granted') {
        console.log('Permission localisation déjà accordée');
        return true;
      }

      if (permission.location === 'denied') {
        console.log('Permission localisation refusée - affichage alerte');
        await this.showPermissionDeniedAlert('localisation');
        return false;
      }

      // Demander la permission
      console.log('Demande permission localisation...');
      const request = await Geolocation.requestPermissions();
      console.log('Résultat demande permission localisation:', request);

      if (request.location === 'granted') {
        console.log('Permission localisation accordée');
        return true;
      } else {
        console.log('Permission localisation refusée après demande');
        await this.showPermissionDeniedAlert('localisation');
        return false;
      }
    } catch (error) {
      console.error('Erreur permission localisation:', error);
      return false;
    }
  }

  // Afficher l'alerte pour permission refusée
  private async showPermissionDeniedAlert(permissionType: string): Promise<void> {
    console.log('showPermissionDeniedAlert:', permissionType);

    const alert = await this.alertController.create({
      header: 'Permission refusée',
      message: `L'accès à la ${permissionType} est nécessaire pour utiliser cette fonctionnalité. Veuillez activer la permission dans les paramètres de votre appareil.`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: () => {
            console.log('Alerte permission - Annuler cliqué');
          }
        },
        {
          text: 'Ouvrir les paramètres',
          handler: () => {
            console.log('Alerte permission - Ouvrir paramètres cliqué');
            this.openSettings();
          }
        }
      ]
    });

    await alert.present();
    console.log('Alerte permission affichée');
  }

  // Ouvrir les paramètres (nécessite @capacitor/app)
  private openSettings(): void {
    console.log('Tentative ouverture paramètres');
    // Cette fonctionnalité nécessite le plugin @capacitor/app
    // Pour l'instant, on affiche juste un message
    this.showInfoAlert(
      'Paramètres',
      'Veuillez ouvrir les paramètres de votre appareil manuellement pour accorder les permissions.'
    );
  }

  // Afficher une alerte d'information
  async showInfoAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }
}
