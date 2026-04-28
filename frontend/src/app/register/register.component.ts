import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  selectedStyle = 'avataaars';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  avatarStyles = [
    { id: 'avataaars',    label: 'Cartoon'   },
    { id: 'bottts',       label: 'Robot'     },
    { id: 'pixel-art',    label: 'Pixel'     },
    { id: 'lorelei',      label: 'Minimal'   },
    { id: 'adventurer',   label: 'Adventure' },
    { id: 'micah',        label: 'Sketch'    },
  ];

  constructor(private authService: AuthService, private router: Router, private toast: ToastService) {}

  getPreviewUrl(style: string): string {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(this.name || 'preview')}`;
  }

  validate(): boolean {
    this.errorMessage = '';
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return false;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return false;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return false;
    }
    return true;
  }

  onRegister(): void {
    if (!this.validate()) return;
    this.isLoading = true;

    this.authService.register(this.name, this.email, this.password, this.selectedStyle).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Account created! Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed.';
      }
    });
  }
}