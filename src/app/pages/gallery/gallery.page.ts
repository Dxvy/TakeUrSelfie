import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ModalController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera,
  filterOutline,
  heart,
  location,
  imagesOutline,
  heartOutline,
  locationOutline,
  cameraOutline
} from 'ionicons/icons';
import { PhotoService, UserPhoto } from '../../services/photo';
import { PhotoCardComponent } from '../../components/photo-card/photo-card.component';
import { PhotoModalComponent } from '../../components/photo-modal/photo-modal.component';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    PhotoCardComponent
  ]
})
export class GalleryPage implements OnInit {
  private photoService = inject(PhotoService);
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  photos: UserPhoto[] = [];
  filteredPhotos: UserPhoto[] = [];
  filterType: 'all' | 'liked' | 'geolocated' = 'all';
  showFilters = false;

  constructor() {
    addIcons({
      camera,
      filterOutline,
      heart,
      location,
      imagesOutline,
      heartOutline,
      locationOutline,
      cameraOutline
    });
  }

  async ngOnInit() {
    await this.loadPhotos();

    // Vérifier si un photoId est passé en paramètre
    this.route.queryParams.subscribe(params => {
      if (params['photoId']) {
        const photo = this.photos.find(p => p.id === params['photoId']);
        if (photo) {
          this.openPhotoModal(photo);
        }
      }
    });
  }

  async ionViewWillEnter() {
    await this.loadPhotos();
  }

  private async loadPhotos() {
    await this.photoService.loadSaved();
    this.photos = this.photoService.getPhotos();
    this.applyFilter();
  }

  toggleFilterMenu() {
    this.showFilters = !this.showFilters;
  }

  onFilterChange() {
    this.applyFilter();
  }

  private applyFilter() {
    switch (this.filterType) {
      case 'liked':
        this.filteredPhotos = this.photos.filter(p => p.liked);
        break;
      case 'geolocated':
        this.filteredPhotos = this.photos.filter(p => p.location);
        break;
      default:
        this.filteredPhotos = [...this.photos];
    }
  }

  async openPhotoModal(photo: UserPhoto) {
    const modal = await this.modalController.create({
      component: PhotoModalComponent,
      componentProps: { photo },
      cssClass: 'photo-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.action === 'refresh') {
      await this.loadPhotos();
    }
  }

  async toggleLike(photoId: string) {
    await this.photoService.toggleLike(photoId);
    await this.loadPhotos();
  }

  async confirmDelete(photoId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette photo ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.photoService.deletePhoto(photoId);
            await this.loadPhotos();
          }
        }
      ]
    });

    await alert.present();
  }

  navigateToCamera() {
    this.router.navigate(['/camera']);
  }

  getEmptyIcon(): string {
    switch (this.filterType) {
      case 'liked':
        return 'heart-outline';
      case 'geolocated':
        return 'location-outline';
      default:
        return 'images-outline';
    }
  }

  getEmptyTitle(): string {
    switch (this.filterType) {
      case 'liked':
        return 'Aucune photo aimée';
      case 'geolocated':
        return 'Aucune photo géolocalisée';
      default:
        return 'Aucune photo';
    }
  }

  getEmptyMessage(): string {
    switch (this.filterType) {
      case 'liked':
        return 'Appuyez sur ❤️ pour ajouter des photos à vos favoris';
      case 'geolocated':
        return 'Activez la localisation lors de la prise de photo';
      default:
        return 'Commencez par prendre votre première photo !';
    }
  }
}
