import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navigation',
  imports: [RouterModule, CommonModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent {

  constructor(public authService: AuthService) {}

  get isAdmin(): boolean {
    return localStorage.getItem('admin') === 'true';
  }

  logout(): void {
    this.authService.logout();
  }
}