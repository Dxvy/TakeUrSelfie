import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { UserPhoto } from '../../services/photo';

@Component({
  selector: 'app-photo-card',
  templateUrl: './photo-card.component.html',
  styleUrls: ['./photo-card.component.scss'],
  imports: [IonicModule, CommonModule],
})
export class PhotoCardComponent {
  @Input() photo!: UserPhoto;
  @Input() showActions: boolean = true;
  @Output() photoClicked = new EventEmitter<UserPhoto>();
  @Output() likeToggled = new EventEmitter<string>();
  @Output() deleteClicked = new EventEmitter<string>();

  onPhotoClick(): void {
    this.photoClicked.emit(this.photo);
  }

  onLikeClick(event: Event): void {
    event.stopPropagation();
    this.likeToggled.emit(this.photo.id);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteClicked.emit(this.photo.id);
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString('fr-FR');
  }
}
