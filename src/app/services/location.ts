import { Injectable } from '@angular/core';

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

  // Obtenir la position GPS actuelle
  getCurrentPosition(): Promise<LocationData> {
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
          resolve(location);
        },
        (error) => {
          console.error('Erreur GPS:', error);
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
