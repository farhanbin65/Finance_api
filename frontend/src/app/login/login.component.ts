import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { ToastService } from '../services/toast.service';
import { filter, switchMap, take } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private auth0: Auth0Service,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    // After Auth0 redirect, wait for SDK to finish processing the callback,
    // then exchange the Auth0 ID token for our app JWT.
    this.auth0.isLoading$.pipe(
      filter(loading => !loading),
      take(1),
      switchMap(() => this.auth0.isAuthenticated$),
      take(1),
      switchMap(isAuth => {
        if (!isAuth) return EMPTY;
        this.isLoading = true;
        return this.auth0.idTokenClaims$.pipe(
          filter(claims => !!claims),
          take(1)
        );
      }),
      switchMap(claims => this.authService.auth0Exchange((claims as any)['__raw']))
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success(`Welcome back, ${this.authService.getName()}!`);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Auth0 login failed. Please try again.';
      }
    });
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter your username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success(`Welcome back, ${this.authService.getName()}!`);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  loginWithGoogle(): void {
    this.auth0.loginWithRedirect({
      authorizationParams: { connection: 'google-oauth2' }
    });
  }
}