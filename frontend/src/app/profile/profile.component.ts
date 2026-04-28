import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  profile: any = null;
  isLoading = true;
  activeTab: 'avatar' | 'name' | 'password' | 'delete' = 'avatar';

  // Avatar
  selectedStyle = 'avataaars';
  savingAvatar = false;

  avatarStyles = [
    { id: 'avataaars',    label: 'Cartoon'   },
    { id: 'bottts',       label: 'Robot'     },
    { id: 'pixel-art',    label: 'Pixel'     },
    { id: 'lorelei',      label: 'Minimal'   },
    { id: 'adventurer',   label: 'Adventure' },
    { id: 'micah',        label: 'Sketch'    },
  ];

  // Name
  newName = '';
  savingName = false;

  // Password
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  savingPassword = false;
  passwordError = '';

  // Delete account
  deleteAccountInput = '';
  deletingAccount = false;

  constructor(public authService: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.selectedStyle = this.authService.getAvatarStyle();
    this.authService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.newName = data.name || '';
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load profile');
      }
    });
  }

  getPreviewUrl(style: string): string {
    return this.authService.getAvatarUrl(this.profile?.name, style);
  }

  saveAvatar(): void {
    this.savingAvatar = true;
    this.authService.updateAvatar(this.selectedStyle).subscribe({
      next: () => {
        this.savingAvatar = false;
        this.toast.success('Avatar updated successfully');
      },
      error: () => {
        this.savingAvatar = false;
        this.toast.error('Failed to update avatar');
      }
    });
  }

  saveName(): void {
    if (!this.newName.trim()) {
      this.toast.error('Name cannot be empty');
      return;
    }
    this.savingName = true;
    this.authService.updateName(this.newName.trim()).subscribe({
      next: (res) => {
        this.savingName = false;
        this.profile = { ...this.profile, name: res.name };
        this.toast.success('Name updated successfully');
      },
      error: (err) => {
        this.savingName = false;
        this.toast.error(err.error?.message || 'Failed to update name');
      }
    });
  }

  deleteAccount(): void {
    if (this.deleteAccountInput !== 'DELETE') return;
    this.deletingAccount = true;
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.authService.logout();
      },
      error: (err) => {
        this.deletingAccount = false;
        this.toast.error(err.error?.message || 'Failed to delete account');
      }
    });
  }

  savePassword(): void {
    this.passwordError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.toast.error('Please fill in all password fields');
      return;
    }
    if (this.newPassword.length < 6) {
      this.toast.error('New password must be at least 6 characters');
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.toast.error('New passwords do not match');
      return;
    }
    this.savingPassword = true;
    this.authService.updatePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPassword = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.toast.success('Password changed successfully');
      },
      error: (err) => {
        this.savingPassword = false;
        this.toast.error(err.error?.message || 'Failed to change password');
      }
    });
  }
}
