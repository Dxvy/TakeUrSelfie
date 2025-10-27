import { Injectable } from '@angular/core';

export interface GeocodingResult {
  address: string;
  city: string;
  country: string;
  fullAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  constructor() {}

  /**
   * Convertir des coordonnées GPS en adresse lisible
   * Utilise l'API Nominatim d'OpenStreetMap (gratuite, pas de clé API nécessaire)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    console.log('reverseGeocode -', latitude, longitude);

    try {
      // API Nominatim d'OpenStreetMap (gratuite)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CapsuleSelfie/1.0' // Requis par Nominatim
        }
      });

      if (!response.ok) {
        throw new Error('Erreur API Nominatim');
      }

      const data = await response.json();
      console.log('Résultat géocodage:', data);

      // Extraire les informations utiles
      const address = data.address || {};

      // Construire l'adresse selon la disponibilité des données
      let shortAddress = '';
      let city = '';
      let country = address.country || '';

      // Adresse de rue
      if (address.road) {
        shortAddress = address.road;
        if (address.house_number) {
          shortAddress = `${address.house_number} ${shortAddress}`;
        }
      } else if (address.suburb) {
        shortAddress = address.suburb;
      } else if (address.neighbourhood) {
        shortAddress = address.neighbourhood;
      }

      // Ville
      if (address.city) {
        city = address.city;
      } else if (address.town) {
        city = address.town;
      } else if (address.village) {
        city = address.village;
      }

      // Construire l'adresse complète
      let fullAddress = data.display_name || `${latitude}, ${longitude}`;

      // Adresse courte pour l'affichage
      const parts = [];
      if (shortAddress) parts.push(shortAddress);
      if (city) parts.push(city);
      if (country) parts.push(country);

      const displayAddress = parts.length > 0 ? parts.join(', ') : fullAddress;

      return {
        address: shortAddress || city || 'Adresse inconnue',
        city: city || '',
        country: country || '',
        fullAddress: displayAddress
      };

    } catch (error) {
      console.error('Erreur géocodage inverse:', error);

      // Retour par défaut en cas d'erreur
      return {
        address: 'Lieu inconnu',
        city: '',
        country: '',
        fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };
    }
  }

  /**
   * Formater une adresse de manière concise
   */
  formatAddress(result: GeocodingResult, maxLength: number = 50): string {
    if (result.fullAddress.length <= maxLength) {
      return result.fullAddress;
    }

    // Version courte
    if (result.address && result.city) {
      return `${result.address}, ${result.city}`;
    } else if (result.city) {
      return result.city;
    } else {
      return result.address;
    }
  }
}
