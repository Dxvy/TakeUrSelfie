import {Component, OnInit, OnDestroy, inject} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
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
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  locateOutline,
  mapOutline,
  listOutline,
  locationOutline,
  heart,
  cameraOutline
} from 'ionicons/icons';
import * as L from 'leaflet';
import {PhotoService, UserPhoto} from '../../services/photo';
import {LocationData, LocationService} from '../../services/location';
import {PermissionService} from '../../services/permission.service';
import {PhotoModalComponent} from '../../components/photo-modal/photo-modal.component';

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
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  geolocatedPhotos: UserPhoto[] = [];
  map?: L.Map;
  markers: L.Marker[] = [];
  userMarker?: L.Marker;
  isMapReady = false;
  isLoading = false;

  // Coordonnées par défaut (Paris)
  private readonly DEFAULT_LAT = 48.8566;
  private readonly DEFAULT_LNG = 2.3522;
  private readonly DEFAULT_ZOOM = 13;

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
    console.log("ngOnInit");
    await this.loadPhotos();
    console.log('heyy')
    this.locationService.getCurrentPosition().then(async (coords: LocationData) => {
      const userLat = coords.latitude;
      const userLng = coords.longitude;
      if (this.geolocatedPhotos.length > 0) {
        console.log("pas bon")
        // Vérifier les paramètres de navigation
        this.route.queryParams.subscribe(async params => {
          if (params['photoId']) {
            const photo = this.geolocatedPhotos.find(p => p.id === params['photoId']);
            if (photo && photo.location) {
              await this.initializeMap(photo.location.latitude, photo.location.longitude);
              setTimeout(() => this.selectPhoto(photo), 500);
            }
          }
        });
      } else {
        console.log("test")
        // Initialiser la carte SANS demander de permission
        await this.initializeMap(userLat, userLng);
      }
    }).catch(
      err => {
        console.log(err);
      }
    )
    // Afficher la carte automatiquement si des photos sont géolocalisées
    // IMPORTANT : Ne PAS demander de permission ici

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
    console.log(`${this.geolocatedPhotos.length} photos géolocalisées trouvées`);
  }

  async toggleMapView() {
    if (this.isMapReady) {
      console.log("test")
      // Retour à la liste
      this.isMapReady = false;
      if (this.map) {
        this.map.remove();
        this.map = undefined;
        this.markers = [];
        this.userMarker = undefined;
      }
    } else {
      console.log("pas bon")
      // Afficher la carte SANS demander de permission
      this.locationService.getCurrentPosition().then(async (coords: LocationData) => {
        console.log("Coco", coords);
        await this.initializeMap(coords.latitude, coords.longitude);
      });

    }
  }

  /**
   * Initialise la carte SANS demander de permission de géolocalisation
   * Utilise les photos existantes ou Paris comme centre par défaut
   */
  private async initializeMap(lat?: number, lng?: number) {
    this.isLoading = true;

    // Petite pause pour laisser le DOM se mettre à jour
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      let centerLat: number;
      let centerLng: number;
      let zoom = this.DEFAULT_ZOOM;

      if (lat && lng) {
        // Si des coordonnées spécifiques sont fournies (photo sélectionnée)
        centerLat = lat;
        centerLng = lng;
        zoom = 15;
        console.log(`Centrage sur photo: ${centerLat}, ${centerLng}`);
      } else if (this.geolocatedPhotos.length > 0) {
        // Centrer sur la première photo géolocalisée
        const firstPhoto = this.geolocatedPhotos[0];
        centerLat = firstPhoto.location!.latitude;
        centerLng = firstPhoto.location!.longitude;
        zoom = 12;
        console.log(`Centrage sur première photo: ${centerLat}, ${centerLng}`);
      } else {
        // Position par défaut (Paris) - SANS demander de permission
        centerLat = this.DEFAULT_LAT;
        centerLng = this.DEFAULT_LNG;
        zoom = this.DEFAULT_ZOOM;
        console.log(`Centrage par défaut sur Paris: ${centerLat}, ${centerLng}`);
        await this.showToast('Carte centrée sur Paris. Cliquez sur 📍 pour vous localiser.', 'primary');
      }

      // Vérifier que le conteneur existe
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('Conteneur de carte non trouvé');
        throw new Error('Conteneur de carte non trouvé');
      }

      // Supprimer la carte existante si elle existe
      if (this.map) {
        this.map.remove();
      }

      // Créer la carte avec les coordonnées calculées
      this.map = L.map('map', {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: true,
        attributionControl: true
      });

      console.log('Carte créée avec succès');

      // Ajouter la couche de tuiles OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 2
      }).addTo(this.map);

      console.log('Tuiles ajoutées à la carte');

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
            console.log('Carte ajustée pour inclure tous les marqueurs');
          }
        }, 300);
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      await this.showToast('Erreur lors du chargement de la carte', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private addPhotoMarkers() {
    if (!this.map) return;

    // Icône par défaut de Leaflet (nécessite d'être configurée)
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    this.geolocatedPhotos.forEach(photo => {
      if (photo.location && this.map) {
        const marker = L.marker(
          [photo.location.latitude, photo.location.longitude],
          {icon: defaultIcon}
        );

        // Popup avec miniature
        const address = photo.address || `${photo.location.latitude.toFixed(4)}, ${photo.location.longitude.toFixed(4)}`;
        const popupContent = `
          <div class="photo-popup">
            <img src="${photo.webviewPath}" alt="Photo" />
            <div class="popup-info">
              <p><strong>${this.formatDate(photo.timestamp)}</strong></p>
              <p class="popup-address">${address}</p>
              ${photo.liked ? '<span style="color: #f04141;">❤️</span>' : ''}
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

    console.log(`${this.markers.length} marqueurs ajoutés à la carte`);
  }

  /**
   * Centre la carte sur la position de l'utilisateur
   * ⚠️ IMPORTANT : C'est ICI et UNIQUEMENT ICI que la permission est demandée
   * Cette fonction est appelée UNIQUEMENT lors du clic sur le bouton 📍
   */
  async centerOnUser() {
    console.log('🎯 Clic sur le bouton de localisation - Demande de permission...');

    // ⭐ DEMANDE DE PERMISSION EXPLICITE PAR L'UTILISATEUR ⭐
    // Cette demande est déclenchée par une action volontaire de l'utilisateur
    const hasPermission = await this.permissionService.checkLocationPermission();

    if (!hasPermission) {
      console.log('❌ Permission de localisation refusée');
      await this.showToast('Permission de localisation refusée. Vous pouvez l\'activer dans les paramètres.', 'warning');
      return;
    }

    console.log('✅ Permission de localisation accordée');

    try {
      this.isLoading = true;
      await this.showToast('Localisation en cours...', 'primary');

      // Obtenir la position actuelle
      const position = await this.locationService.getCurrentPosition();
      console.log('📍 Position utilisateur obtenue:', position);

      if (!this.isMapReady) {
        // Si la carte n'est pas encore initialisée, l'initialiser sur la position utilisateur
        await this.initializeMap(position.latitude, position.longitude);
        await this.addUserMarker(position.latitude, position.longitude);
        await this.showToast('Vous êtes ici ! 📍', 'success');
      } else if (this.map) {
        // Si la carte existe déjà, la recentrer sur la position utilisateur
        this.map.setView([position.latitude, position.longitude], 15, {
          animate: true,
          duration: 1
        });

        // Ajouter ou mettre à jour le marqueur utilisateur
        if (this.userMarker) {
          this.userMarker.setLatLng([position.latitude, position.longitude]);
          this.userMarker.openPopup();
        } else {
          await this.addUserMarker(position.latitude, position.longitude);
        }

        await this.showToast('Vous êtes ici ! 📍', 'success');
      }

      console.log('✅ Carte centrée sur la position utilisateur');

    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération de la position:', error);

      // Messages d'erreur plus spécifiques
      let errorMessage = 'Impossible de récupérer votre position';

      if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Délai dépassé. Vérifiez que le GPS est activé.';
      } else if (error.message && error.message.includes('denied')) {
        errorMessage = 'Permission refusée. Activez la localisation dans les paramètres.';
      }

      await this.showToast(errorMessage, 'danger');

      // Proposer un fallback uniquement si la carte n'est pas encore affichée
      if (!this.isMapReady) {
        console.log('Fallback vers Paris après erreur de géolocalisation');
        await this.initializeMap(this.DEFAULT_LAT, this.DEFAULT_LNG);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private async addUserMarker(lat: number, lng: number) {
    if (!this.map) return;

    const userIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#10dc60" stroke="white" stroke-width="3"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      `),
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });

    // Supprimer l'ancien marqueur s'il existe
    if (this.userMarker) {
      this.userMarker.remove();
    }

    this.userMarker = L.marker([lat, lng], {icon: userIcon}).addTo(this.map);
    this.userMarker.bindPopup('📍 Vous êtes ici');

    // Ouvrir automatiquement le popup
    setTimeout(() => {
      if (this.userMarker) {
        this.userMarker.openPopup();
      }
    }, 100);

    console.log('✅ Marqueur utilisateur ajouté et popup ouvert');
  }

  async selectPhoto(photo: UserPhoto) {
    const modal = await this.modalController.create({
      component: PhotoModalComponent,
      componentProps: {photo},
      cssClass: 'photo-modal'
    });

    await modal.present();

    const {data} = await modal.onWillDismiss();
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

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
