import { Injectable, inject } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
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

  /**
   * Vérifie si on est sur une plateforme web ou native
   */
  private isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  /**
   * Vérifier et demander permission caméra
   * Sur le web : utilise l'API navigator.mediaDevices
   * Sur mobile : utilise Capacitor Camera
   */
  async checkCameraPermission(): Promise<boolean> {
    console.log('🎥 checkCameraPermission - Début');
    console.log('📱 Plateforme:', Capacitor.getPlatform());

    try {
      if (this.isWeb()) {
        // ⭐ GESTION WEB SPÉCIFIQUE ⭐
        return await this.checkCameraPermissionWeb();
      } else {
        // Gestion mobile avec Capacitor
        return await this.checkCameraPermissionNative();
      }
    } catch (error) {
      console.error('❌ Erreur vérification permission caméra:', error);
      return false;
    }
  }

  /**
   * Vérifier permission caméra sur le WEB
   * Utilise l'API navigator.mediaDevices.getUserMedia
   */
  private async checkCameraPermissionWeb(): Promise<boolean> {
    console.log('🌐 Vérification permission caméra WEB');

    // Vérifier si l'API est disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('❌ API mediaDevices non disponible');
      await this.showPermissionAlert(
        'Caméra non disponible',
        'Votre navigateur ne supporte pas l\'accès à la caméra. Utilisez Chrome, Firefox ou Safari récent.'
      );
      return false;
    }

    try {
      // Vérifier d'abord l'état de la permission (si l'API Permissions est disponible)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('📋 État permission caméra:', permissionStatus.state);

          if (permissionStatus.state === 'denied') {
            console.log('❌ Permission caméra refusée définitivement');
            await this.showPermissionDeniedAlert('caméra');
            return false;
          }

          if (permissionStatus.state === 'granted') {
            console.log('✅ Permission caméra déjà accordée');
            return true;
          }
        } catch (e) {
          console.log('⚠️ API Permissions non disponible, tentative directe');
        }
      }

      // Demander l'accès à la caméra
      console.log('🎥 Demande d\'accès à la caméra...');

      // Essayer d'accéder à la caméra (cela déclenche la demande de permission)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Caméra avant par défaut
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('✅ Permission caméra accordée sur le web');

      // Arrêter immédiatement le flux (on voulait juste vérifier la permission)
      stream.getTracks().forEach(track => track.stop());
      console.log('🛑 Flux caméra arrêté');

      return true;

    } catch (error: any) {
      console.error('❌ Erreur accès caméra web:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.log('❌ Permission caméra refusée par l\'utilisateur');
        await this.showPermissionDeniedAlert('caméra');
        return false;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        await this.showPermissionAlert(
          'Caméra non trouvée',
          'Aucune caméra n\'a été détectée sur votre appareil.'
        );
        return false;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        await this.showPermissionAlert(
          'Caméra non accessible',
          'La caméra est peut-être utilisée par une autre application.'
        );
        return false;
      } else {
        await this.showPermissionAlert(
          'Erreur caméra',
          'Une erreur est survenue lors de l\'accès à la caméra.'
        );
        return false;
      }
    }
  }

  /**
   * Vérifier permission caméra sur MOBILE (iOS/Android)
   * Utilise Capacitor Camera API
   */
  private async checkCameraPermissionNative(): Promise<boolean> {
    console.log('📱 Vérification permission caméra NATIVE');

    try {
      // Vérifier l'état actuel
      const permission = await Camera.checkPermissions();
      console.log('📋 État permission caméra native:', permission);

      if (permission.camera === 'granted' && permission.photos === 'granted') {
        console.log('✅ Permission caméra déjà accordée');
        return true;
      }

      if (permission.camera === 'denied' || permission.photos === 'denied') {
        console.log('❌ Permission caméra refusée');
        await this.showPermissionDeniedAlert('caméra');
        return false;
      }

      // Demander la permission
      console.log('🎥 Demande permission caméra native...');
      const request = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      console.log('📋 Résultat demande permission:', request);

      if (request.camera === 'granted' && request.photos === 'granted') {
        console.log('✅ Permission caméra accordée');
        return true;
      } else {
        console.log('❌ Permission caméra refusée après demande');
        await this.showPermissionDeniedAlert('caméra');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur permission caméra native:', error);
      return false;
    }
  }

  /**
   * Vérifier et demander permission localisation
   * Fonctionne sur web et mobile
   */
  async checkLocationPermission(): Promise<boolean> {
    console.log('📍 checkLocationPermission - Début');
    console.log('📱 Plateforme:', Capacitor.getPlatform());

    try {
      if (this.isWeb()) {
        // Sur le web, la permission est demandée automatiquement par getCurrentPosition
        // On vérifie juste si l'API est disponible
        if (!navigator.geolocation) {
          console.error('❌ API Geolocation non disponible');
          await this.showPermissionAlert(
            'Géolocalisation non disponible',
            'Votre navigateur ne supporte pas la géolocalisation.'
          );
          return false;
        }

        // Vérifier l'état de la permission si l'API est disponible
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            console.log('📋 État permission localisation:', permissionStatus.state);

            if (permissionStatus.state === 'denied') {
              console.log('❌ Permission localisation refusée définitivement');
              await this.showPermissionDeniedAlert('localisation');
              return false;
            }

            if (permissionStatus.state === 'granted') {
              console.log('✅ Permission localisation déjà accordée');
              return true;
            }
          } catch (e) {
            console.log('⚠️ API Permissions non disponible pour geolocation');
          }
        }

        // Sur le web, on retourne true et la permission sera demandée lors de getCurrentPosition
        console.log('✅ Permission localisation sera demandée lors de l\'utilisation');
        return true;
      } else {
        // Gestion mobile native
        return await this.checkLocationPermissionNative();
      }
    } catch (error) {
      console.error('❌ Erreur vérification permission localisation:', error);
      return false;
    }
  }

  /**
   * Vérifier permission localisation sur MOBILE
   */
  private async checkLocationPermissionNative(): Promise<boolean> {
    console.log('📱 Vérification permission localisation NATIVE');

    try {
      // Vérifier l'état actuel
      const permission = await Geolocation.checkPermissions();
      console.log('📋 État permission localisation native:', permission);

      if (permission.location === 'granted') {
        console.log('✅ Permission localisation déjà accordée');
        return true;
      }

      if (permission.location === 'denied') {
        console.log('❌ Permission localisation refusée');
        await this.showPermissionDeniedAlert('localisation');
        return false;
      }

      // Demander la permission
      console.log('📍 Demande permission localisation native...');
      const request = await Geolocation.requestPermissions();
      console.log('📋 Résultat demande permission:', request);

      if (request.location === 'granted') {
        console.log('✅ Permission localisation accordée');
        return true;
      } else {
        console.log('❌ Permission localisation refusée après demande');
        await this.showPermissionDeniedAlert('localisation');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur permission localisation native:', error);
      return false;
    }
  }

  /**
   * Afficher l'alerte pour permission refusée
   */
  private async showPermissionDeniedAlert(permissionType: string): Promise<void> {
    console.log('⚠️ Affichage alerte permission refusée:', permissionType);

    let message = '';
    if (this.isWeb()) {
      message = `L'accès à la ${permissionType} a été refusé. Pour l'autoriser :\n\n` +
                `1. Cliquez sur l'icône 🔒 ou ℹ️ dans la barre d'adresse\n` +
                `2. Autorisez l'accès à la ${permissionType}\n` +
                `3. Rechargez la page`;
    } else {
      message = `L'accès à la ${permissionType} est nécessaire. Veuillez activer la permission dans les paramètres de votre appareil.`;
    }

    const alert = await this.alertController.create({
      header: 'Permission refusée',
      message: message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Afficher une alerte d'information personnalisée
   */
  private async showPermissionAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }

  /**
   * Obtenir des informations sur la plateforme
   */
  getPlatformInfo(): string {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    return `Plateforme: ${platform}, Native: ${isNative}`;
  }
}
