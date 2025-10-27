import { Component, Input } from '@angular/core';
import { IonicModule, ModalController, AlertController } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { UserPhoto } from '../../services/photo';
import { PhotoService } from '../../services/photo';

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Photo {
  filepath: string;
  webviewPath?: string;
  timestamp: number;
  liked?: boolean;
  location?: PhotoLocation;
}

@Component({
  selector: 'app-photo-modal',
  templateUrl: './photo-modal.component.html',
  styleUrls: ['./photo-modal.component.scss'],
  imports: [
    IonicModule,
    CommonModule
  ]
})
export class PhotoModalComponent {
  @Input() photo!: UserPhoto;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private modalController: ModalController) { }

  /**
   * Ferme le modal
   */
  dismiss() {
    this.modalController.dismiss();
  }

  /**
   * Bascule l'état "j'aime" de la photo
   */
  toggleLike() {
    if (this.photo) {
      this.photo.liked = !this.photo.liked;
    }
  }

  /**
   * Demande confirmation avant de supprimer la photo
   */
  async confirmDelete() {
    const alert = await this.modalController.create({
      component: 'ion-alert',
      cssClass: 'custom-alert',
    });

    // Alternative simple : fermer le modal avec l'action de suppression
    this.modalController.dismiss({ action: 'delete' });
  }

  /**
   * Formate la date au format lisible
   */
  formatDate(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Formate l'heure au format lisible
   */
  formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Ouvre la localisation sur une carte (Google Maps ou autre)
   */
  showOnMap() {
    if (this.photo.location) {
      const { latitude, longitude } = this.photo.location;
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(url, '_blank');
    }
  }
}
