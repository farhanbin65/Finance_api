import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://127.0.0.1:5001';

  constructor(private http: HttpClient, private router: Router) {}

login(email: string, password: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true }).pipe(
    tap(res => {
      // Token is stored as HttpOnly cookie by the server — never touch it here
      localStorage.setItem('user_id', res.user_id);
      localStorage.setItem('finance_id', res.finance_id);
      localStorage.setItem('name', res.name);
      localStorage.setItem('admin', String(res.admin));
      // Store expiry time (30 min) so isLoggedIn() can check it without reading the cookie
      localStorage.setItem('session_exp', String(Date.now() + 30 * 60 * 1000));
    })
  );
}

getFinanceId(): string | null {
  return localStorage.getItem('finance_id');
}

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, { name, email, password });
  }

  logout(): void {
    // Server will read the cookie and blacklist it, then clear the cookie
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  getName(): string | null {
    return localStorage.getItem('name');
  }

  isAdmin(): boolean {
    return localStorage.getItem('admin') === 'true';
  }

  isLoggedIn(): boolean {
    const exp = localStorage.getItem('session_exp');
    if (!exp) return false;
    if (Date.now() > Number(exp)) {
      localStorage.clear();
      return false;
    }
    return true;
  }
}