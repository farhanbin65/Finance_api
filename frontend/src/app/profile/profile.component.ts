import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  profile: any = null;
  selectedStyle = 'avataaars';
  saveSuccess = false;

  avatarStyles = [
    { id: 'avataaars',    label: 'Cartoon'   },
    { id: 'bottts',       label: 'Robot'     },
    { id: 'pixel-art',    label: 'Pixel'     },
    { id: 'lorelei',      label: 'Minimal'   },
    { id: 'adventurer',   label: 'Adventure' },
    { id: 'micah',        label: 'Sketch'    },
  ];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.selectedStyle = this.authService.getAvatarStyle();
    this.authService.getProfile().subscribe({
      next: (data) => this.profile = data,
      error: (err) => console.error(err)
    });
  }

  getPreviewUrl(style: string): string {
    return this.authService.getAvatarUrl(this.profile?.name, style);
  }

  saveAvatar(): void {
    this.authService.updateAvatar(this.selectedStyle).subscribe({
      next: () => {
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => console.error(err)
    });
  }
}