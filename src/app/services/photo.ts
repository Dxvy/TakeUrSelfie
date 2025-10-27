import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { LocationService, LocationData } from './location';
import { StorageService } from './storage';
import { GeocodingService } from './geocoding.service';

export interface UserPhoto {
  id: string;
  filepath: string;
  webviewPath: string;
  timestamp: Date;
  location?: LocationData;
  address?: string;
  liked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private locationService = inject(LocationService);
  private storageService = inject(StorageService);
  private geocodingService = inject(GeocodingService);

  private photos: UserPhoto[] = [];
  private readonly STORAGE_KEY = 'photos';

  constructor() {}

  // Charger les photos sauvegardées
  async loadSaved(): Promise<void> {
    console.log('loadSaved - Chargement des photos');
    const savedPhotos = await this.storageService.get(this.STORAGE_KEY);

    if (!savedPhotos) {
      console.log('Aucune photo sauvegardée');
      this.photos = [];
      return;
    }

    this.photos = savedPhotos.map((photo: any) => ({
      ...photo,
      timestamp: new Date(photo.timestamp),
      location: photo.location ? {
        ...photo.location,
        timestamp: new Date(photo.location.timestamp)
      } : undefined
    }));

    console.log(`${this.photos.length} photos chargées`);
  }

  // Obtenir toutes les photos
  getPhotos(): UserPhoto[] {
    return this.photos;
  }

  // Prendre une nouvelle photo
  async takePicture(): Promise<UserPhoto> {
    console.log('takePicture - Début');

    try {
      // Prendre la photo
      console.log('Lancement de Camera.getPhoto()...');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true
      });

      console.log('Photo prise:', image);

      // Obtenir la localisation
      let location: LocationData | undefined;
      let address: string | undefined;

      try {
        console.log('Tentative de récupération de la localisation...');
        location = await this.locationService.getCurrentPosition();
        console.log('✅ Localisation obtenue:', location);

        // ⭐ NOUVEAU : Géocodage inverse pour obtenir l'adresse
        try {
          console.log('Géocodage inverse en cours...');
          const geocodingResult = await this.geocodingService.reverseGeocode(
            location.latitude,
            location.longitude
          );
          address = geocodingResult.fullAddress;
          console.log('✅ Adresse obtenue:', address);
        } catch (geoError) {
          console.warn('⚠️ Erreur géocodage:', geoError);
          address = undefined;
        }

      } catch (error) {
        console.warn('⚠️ Impossible de récupérer la localisation:', error);
        location = undefined;
        address = undefined;
      }

      // Créer l'objet photo
      const photo: UserPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filepath: `photo_${Date.now()}.jpeg`,
        webviewPath: image.webPath!,
        timestamp: new Date(),
        location: location,
        address: address, // ⭐ NOUVEAU
        liked: false
      };

      console.log('Photo créée:', {
        id: photo.id,
        hasLocation: !!photo.location,
        hasAddress: !!photo.address,
        address: photo.address
      });

      // Sauvegarder
      this.photos.unshift(photo);
      await this.savePhotos();

      console.log(`Photo sauvegardée. Total: ${this.photos.length} photos`);

      return photo;
    } catch (error) {
      console.error('❌ Erreur lors de la prise de photo:', error);
      throw error;
    }
  }

  // Sauvegarder toutes les photos
  private async savePhotos(): Promise<void> {
    console.log('savePhotos - Sauvegarde de', this.photos.length, 'photos');

    // Debug : afficher les photos avec localisation
    const photosWithLocation = this.photos.filter(p => p.location);
    console.log(`${photosWithLocation.length} photos ont une localisation`);

    await this.storageService.set(this.STORAGE_KEY, this.photos);
    console.log('✅ Photos sauvegardées dans le storage');
  }

  // Supprimer une photo
  async deletePhoto(photoId: string): Promise<void> {
    console.log('deletePhoto -', photoId);
    this.photos = this.photos.filter(p => p.id !== photoId);
    await this.savePhotos();
  }

  // Toggle like
  async toggleLike(photoId: string): Promise<void> {
    console.log('toggleLike -', photoId);
    const photo = this.photos.find(p => p.id === photoId);
    if (photo) {
      photo.liked = !photo.liked;
      await this.savePhotos();
    }
  }

  // Obtenir une photo par son ID
  getPhotoById(id: string): UserPhoto | undefined {
    return this.photos.find(photo => photo.id === id);
  }

  // Obtenir les statistiques
  getStats() {
    return {
      total: this.photos.length,
      liked: this.photos.filter(p => p.liked).length,
      geolocated: this.photos.filter(p => p.location).length
    };
  }
}
