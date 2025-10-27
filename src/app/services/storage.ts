import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() {}

  // Sauvegarder des données
  async set(key: string, value: any): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(value)
    });
  }

  // Récupérer des données
  async get(key: string): Promise<any> {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  }

  // Supprimer des données
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  // Vider tout le stockage
  async clear(): Promise<void> {
    await Preferences.clear();
  }
}
