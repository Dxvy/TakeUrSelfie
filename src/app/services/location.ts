import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor() {}

  // Obtenir la position GPS actuelle avec Capacitor
  async getCurrentPosition(): Promise<LocationData> {
    console.log('getCurrentPosition - Début');

    try {
      // Utiliser Capacitor Geolocation
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      console.log('Position obtenue:', position);

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp)
      };

      console.log('LocationData créé:', location);
      return location;

    } catch (error: any) {
      console.error('Erreur GPS Capacitor:', error);

      // Fallback sur l'API Web si Capacitor échoue (pour test web)
      return this.getCurrentPositionWeb();
    }
  }

  // Fallback avec l'API Web (pour navigateur)
  private getCurrentPositionWeb(): Promise<LocationData> {
    console.log('getCurrentPositionWeb - Fallback API Web');

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };
          console.log('Position Web obtenue:', location);
          resolve(location);
        },
        (error) => {
          console.error('Erreur GPS Web:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  // Formater les coordonnées pour l'affichage
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}
