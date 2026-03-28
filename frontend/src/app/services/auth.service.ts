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
  return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
    tap(res => {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user_id', res.user_id);
      localStorage.setItem('finance_id', res.finance_id);
      localStorage.setItem('name', res.name);
      localStorage.setItem('admin', res.admin);
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
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe();
    }
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  getName(): string | null {
    return localStorage.getItem('name');
  }

 isLoggedIn(): boolean {
  const token = this.getToken();
  if (!token) return false;

  // Decode token and check expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expired = payload.exp * 1000 < Date.now();
    if (expired) {
      localStorage.clear();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
}