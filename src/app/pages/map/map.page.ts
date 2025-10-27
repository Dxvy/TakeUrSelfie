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

    // ⭐ Afficher la carte automatiquement si des photos sont géolocalisées
    if (this.geolocatedPhotos.length > 0) {
      // Vérifier les paramètres de navigation
      this.route.queryParams.subscribe(async params => {
        if (params['photoId']) {
          const photo = this.geolocatedPhotos.find(p => p.id === params['photoId']);
          if (photo && photo.location) {
            await this.initializeMap(photo.location.latitude, photo.location.longitude);
            setTimeout(() => this.selectPhoto(photo), 500);
          }
        } else {
          // Initialiser la carte sans demander de permission
          await this.initializeMap();
        }
      });
    }
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
        this.markers = [];
        this.userMarker = undefined;
      }
    } else {
      // Afficher la carte
      await this.initializeMap();
    }
  }

  private async initializeMap(lat?: number, lng?: number) {
    this.isLoading = true;

    // Petite pause pour laisser le DOM se mettre à jour
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      let centerLat: number;
      let centerLng: number;
      let zoom = 13;

      if (lat && lng) {
        // Si des coordonnées spécifiques sont fournies (photo sélectionnée)
        centerLat = lat;
        centerLng = lng;
        zoom = 15;
      } else if (this.geolocatedPhotos.length > 0) {
        // ⭐ Centrer sur la première photo géolocalisée
        const firstPhoto = this.geolocatedPhotos[0];
        centerLat = firstPhoto.location!.latitude;
        centerLng = firstPhoto.location!.longitude;
        zoom = 12;
      } else {
        // Position par défaut (Paris)
        centerLat = 48.8566;
        centerLng = 2.3522;
      }

      // Vérifier que le conteneur existe
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('Conteneur de carte non trouvé');
        return;
      }

      // Supprimer la carte existante si elle existe
      if (this.map) {
        this.map.remove();
      }

      // Créer la carte
      this.map = L.map('map', {
        center: [5, 43],
        zoom: zoom,
        zoomControl: true,
        attributionControl: true
      });

      // Ajouter la couche de tuiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        minZoom: 2
      }).addTo(this.map);

      // Ajouter les marqueurs pour chaque photo
      this.addPhotoMarkers();

      this.isMapReady = true;

      // Ajuster la vue pour inclure tous les marqueurs
      if (this.markers.length > 1) {
        // Attendre que la carte soit complètement chargée
        setTimeout(() => {
          if (this.map && this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
          }
        }, 300);
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
      iconAnchor: [15, 42],
      popupAnchor: [0, -42]
    });

    this.geolocatedPhotos.forEach(photo => {
      if (photo.location && this.map) {
        const marker = L.marker(
          [photo.location.latitude, photo.location.longitude],
          { icon: photoIcon }
        );

        // Popup avec miniature
        const address = photo.address || `${photo.location.latitude.toFixed(4)}, ${photo.location.longitude.toFixed(4)}`;
        const popupContent = `
          <div class="photo-popup">
            <img src="${photo.webviewPath}" alt="Photo" />
            <div class="popup-info">
              <p><strong>${this.formatDate(photo.timestamp)}</strong></p>
              <p class="popup-address">${address}</p>
              ${photo.liked ? '<ion-icon name="heart" color="danger"></ion-icon>' : ''}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: 'custom-popup'
        });

        marker.on('click', () => this.selectPhoto(photo));

        marker.addTo(this.map);
        this.markers.push(marker);
      }
    });
  }

  async centerOnUser() {
    // ⭐ ICI on demande la permission car c'est une action explicite de l'utilisateur
    const hasPermission = await this.permissionService.checkLocationPermission();
    if (!hasPermission) return;

    try {
      this.isLoading = true;
      const position = await this.locationService.getCurrentPosition();

      if (!this.isMapReady) {
        // Initialiser la carte sur la position de l'utilisateur
        await this.initializeMap(position.latitude, position.longitude);
        await this.addUserMarker(position.latitude, position.longitude);
      } else if (this.map) {
        // Centrer la carte existante
        this.map.setView([position.latitude, position.longitude], 15);

        if (this.userMarker) {
          this.userMarker.setLatLng([position.latitude, position.longitude]);
        } else {
          await this.addUserMarker(position.latitude, position.longitude);
        }
      }
    } catch (error) {
      console.error('Erreur lors du centrage:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async addUserMarker(lat: number, lng: number) {
    if (!this.map) return;

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div class="user-marker-inner"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Supprimer l'ancien marqueur s'il existe
    if (this.userMarker) {
      this.userMarker.remove();
    }

    this.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
    this.userMarker.bindPopup('Vous êtes ici');
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
