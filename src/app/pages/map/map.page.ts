import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonFab,
  IonFabButton,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locateOutline,
  mapOutline,
  listOutline,
  locationOutline,
  heart,
  cameraOutline
} from 'ionicons/icons';
// @ts-ignore
import * as L from 'leaflet';
import { PhotoService, UserPhoto } from '../../services/photo';
import { LocationService } from '../../services/location';
import { PermissionService } from '../../services/permission.service';
import { PhotoModalComponent } from '../../components/photo-modal/photo-modal.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
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
    IonFab,
    IonFabButton,
    IonSpinner
  ]
})
export class MapPage implements OnInit, OnDestroy {
  private photoService = inject(PhotoService);
  private locationService = inject(LocationService);
  private permissionService = inject(PermissionService);
  private modalController = inject(ModalController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  geolocatedPhotos: UserPhoto[] = [];
  map?: L.Map;
  markers: L.Marker[] = [];
  userMarker?: L.Marker;
  isMapReady = false;
  isLoading = false;

  constructor() {
    addIcons({
      locateOutline,
      mapOutline,
      listOutline,
      locationOutline,
      heart,
      cameraOutline
    });
  }

   async ngOnInit() {
    await this.loadPhotos();

    // Vérifier les paramètres de navigation
    this.route.queryParams.subscribe(async params => {
      if (params['photoId']) {
        const photo = this.geolocatedPhotos.find(p => p.id === params['photoId']);
        if (photo) {
          await this.initializeMap(photo.location!.latitude, photo.location!.longitude);
          this.selectPhoto(photo);
        } else {
          // Initialiser à la position actuelle si la photo n'est pas trouvée
          await this.initializeMap();
        }
      } else {
        // Initialiser à la position actuelle par défaut
        await this.initializeMap();
      }
    });
  }

  async ionViewWillEnter() {
    await this.loadPhotos();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private async loadPhotos() {
    await this.photoService.loadSaved();
    const allPhotos = this.photoService.getPhotos();
    this.geolocatedPhotos = allPhotos.filter(p => p.location);
  }

  async toggleMapView() {
    if (this.isMapReady) {
      // Retour à la liste
      this.isMapReady = false;
      if (this.map) {
        this.map.remove();
        this.map = undefined;
      }
    } else {
      // Afficher la carte
      await this.initializeMap();
    }
  }

  private async initializeMap(lat?: number, lng?: number) {
    this.isLoading = true;

    try {
      // Si des coordonnées spécifiques sont fournies, les utiliser
      // Sinon, utiliser la position actuelle de l'utilisateur
      let centerLat = lat;
      let centerLng = lng;

      if (!lat && !lng) {
        // Toujours essayer d'obtenir la position actuelle
        const hasPermission = await this.permissionService.checkLocationPermission();
        if (hasPermission) {
          try {
            const position = await this.locationService.getCurrentPosition();
            centerLat = position.latitude;
            centerLng = position.longitude;
          } catch (error) {
            console.warn('Impossible de récupérer la position:', error);
            // Utiliser Paris comme position par défaut seulement en cas d'erreur
            centerLat = 48.8566;
            centerLng = 2.3522;
          }
        } else {
          // Utiliser Paris comme position par défaut si pas de permission
          centerLat = 48.8566;
          centerLng = 2.3522;
        }
      }

      // Créer la carte
      this.map = L.map('map').setView([centerLat!, centerLng!], 13);

      // Ajouter la couche de tuiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Ajouter les marqueurs pour chaque photo
      this.addPhotoMarkers();

      // Ajouter le marqueur de l'utilisateur
      if (!lat && !lng) {
        await this.addUserMarker();
      }

      this.isMapReady = true;

      // Ajuster la vue pour inclure tous les marqueurs
      if (this.markers.length > 0) {
        const group = L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private addPhotoMarkers() {
    if (!this.map) return;

    // Créer une icône personnalisée
    const photoIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="marker-pin"></div>',
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });

    this.geolocatedPhotos.forEach(photo => {
      if (photo.location && this.map) {
        const marker = L.marker(
          [photo.location.latitude, photo.location.longitude],
          { icon: photoIcon }
        );

        // Popup avec miniature
        const popupContent = `
          <div class="photo-popup">
            <img src="${photo.webviewPath}" alt="Photo" />
            <div class="popup-info">
              <p>${this.formatDate(photo.timestamp)}</p>
              ${photo.liked ? '<ion-icon name="heart" color="danger"></ion-icon>' : ''}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => this.selectPhoto(photo));

        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });
  }

  private async addUserMarker() {
    if (!this.map) return;

    try {
      const position = await this.locationService.getCurrentPosition();

      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div class="user-marker-inner"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      this.userMarker = L.marker(
        [position.latitude, position.longitude],
        { icon: userIcon }
      ).addTo(this.map);

      this.userMarker.bindPopup('Vous êtes ici');
    } catch (error) {
      console.warn('Impossible d\'ajouter le marqueur utilisateur:', error);
    }
  }

  async centerOnUser() {
    if (!this.isMapReady) {
      await this.initializeMap();
      return;
    }

    const hasPermission = await this.permissionService.checkLocationPermission();
    if (!hasPermission) return;

    try {
      const position = await this.locationService.getCurrentPosition();

      if (this.map) {
        this.map.setView([position.latitude, position.longitude], 15);

        if (this.userMarker) {
          this.userMarker.setLatLng([position.latitude, position.longitude]);
        } else {
          await this.addUserMarker();
        }
      }
    } catch (error) {
      console.error('Erreur lors du centrage:', error);
    }
  }

  async selectPhoto(photo: UserPhoto) {
    const modal = await this.modalController.create({
      component: PhotoModalComponent,
      componentProps: { photo },
      cssClass: 'photo-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.action === 'refresh') {
      await this.loadPhotos();
      if (this.isMapReady && this.map) {
        // Recharger les marqueurs
        this.markers.forEach(m => m.remove());
        this.markers = [];
        this.addPhotoMarkers();
      }
    }
  }

  formatDate(timestamp: Date): string {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
