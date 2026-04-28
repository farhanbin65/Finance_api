import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://localhost:5001';

  constructor(
    private http: HttpClient,
    private auth0: Auth0Service
  ) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user_id', res.user_id);
        localStorage.setItem('finance_id', res.finance_id);
        localStorage.setItem('name', res.name);
        localStorage.setItem('admin', res.admin);
        localStorage.setItem('avatar_style', res.avatar_style || 'avataaars');
      })
    );
  }

  register(name: string, email: string, password: string, avatarStyle: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, { name, email, password, avatar_style: avatarStyle });
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe();
    }
    localStorage.clear();
    // End the Auth0 session too, otherwise Auth0 re-logs the user in automatically
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
  }

  updateAvatar(style: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/avatar`, { avatar_style: style }).pipe(
      tap(() => localStorage.setItem('avatar_style', style))
    );
  }

  updateName(name: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/name`, { name }).pipe(
      tap(() => localStorage.setItem('name', name))
    );
  }

  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/password`, {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profile`);
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  getUserId(): string | null { return localStorage.getItem('user_id'); }
  getFinanceId(): string | null { return localStorage.getItem('finance_id'); }
  getName(): string | null { return localStorage.getItem('name'); }
  getAvatarStyle(): string { return localStorage.getItem('avatar_style') || 'avataaars'; }

  getAvatarUrl(name?: string, style?: string): string {
    const seed = name || this.getName() || 'user';
    const avatarStyle = style || this.getAvatarStyle();
    return `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(seed)}`;
  }

  isAdmin(): boolean { return localStorage.getItem('admin') === 'true'; }

  auth0Exchange(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth0/exchange`, { id_token: idToken }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user_id', res.user_id);
        localStorage.setItem('finance_id', res.finance_id);
        localStorage.setItem('name', res.name);
        localStorage.setItem('admin', String(res.admin));
        localStorage.setItem('avatar_style', res.avatar_style || 'avataaars');
      })
    );
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expired = payload.exp * 1000 < Date.now();
      if (expired) { localStorage.clear(); return false; }
      return true;
    } catch { return false; }
  }
}