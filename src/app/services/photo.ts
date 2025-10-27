import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { LocationService, LocationData } from './location';
import { StorageService } from './storage';

export interface UserPhoto {
  id: string;
  filepath: string;
  webviewPath: string;
  timestamp: Date;
  location?: LocationData;
  liked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private locationService = inject(LocationService);
  private storageService = inject(StorageService);

  private photos: UserPhoto[] = [];
  private readonly STORAGE_KEY = 'photos';

  /** Inserted by Angular inject() migration for backwards compatibility */
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(...args: unknown[]);

  constructor() {}

  // Charger les photos sauvegardées
  async loadSaved(): Promise<void> {
    const savedPhotos = await this.storageService.get(this.STORAGE_KEY);
    this.photos = (savedPhotos || []).map((photo: any) => ({
      ...photo,
      timestamp: new Date(photo.timestamp)
    }));
  }

  // Obtenir toutes les photos
  getPhotos(): UserPhoto[] {
    return this.photos;
  }

  // Prendre une nouvelle photo
  async takePicture(): Promise<UserPhoto> {
    try {
      // Prendre la photo
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true
      });

      // Obtenir la localisation
      let location: LocationData | undefined;
      try {
        location = await this.locationService.getCurrentPosition();
      } catch (error) {
        console.warn('Impossible de récupérer la localisation:', error);
      }

      // Créer l'objet photo
      const photo: UserPhoto = {
        id: `photo_${Date.now()}`,
        filepath: `photo_${Date.now()}.jpeg`,
        webviewPath: image.webPath!,
        timestamp: new Date(),
        location,
        liked: false
      };

      // Sauvegarder
      this.photos.unshift(photo);
      await this.savePhotos();

      return photo;
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      throw error;
    }
  }

  // Sauvegarder toutes les photos
  private async savePhotos(): Promise<void> {
    await this.storageService.set(this.STORAGE_KEY, this.photos);
  }

  // Supprimer une photo
  async deletePhoto(photoId: string): Promise<void> {
    this.photos = this.photos.filter(p => p.id !== photoId);
    await this.savePhotos();
  }

  // Toggle like
  async toggleLike(photoId: string): Promise<void> {
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
}
