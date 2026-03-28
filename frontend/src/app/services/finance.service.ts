import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FinanceService {

  private apiUrl = 'http://127.0.0.1:5001';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private get userId(): string {
    return this.authService.getFinanceId() || '';
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${this.userId}`);
  }

  getExpenses(page = 1, size = 100): Observable<any[]> {
    const params = new HttpParams().set('pn', page).set('ps', size);
    return this.http.get<any[]>(
      `${this.apiUrl}/users/${this.userId}/expenses`, { params }
    );
  }

  addExpense(expense: any): Observable<any> {
    const form = new FormData();
    form.append('category_id', expense.category_id);
    form.append('amount', expense.amount);
    form.append('date', expense.date);
    form.append('merchant', expense.merchant);
    form.append('note', expense.note || '');
    form.append('payment_method', expense.payment_method);
    return this.http.post(
      `${this.apiUrl}/users/${this.userId}/expenses`, form
    );
  }

  updateExpense(expenseId: number, expense: any): Observable<any> {
    const form = new FormData();
    form.append('category_id', expense.category_id);
    form.append('amount', expense.amount);
    form.append('date', expense.date);
    form.append('merchant', expense.merchant);
    form.append('note', expense.note || '');
    form.append('payment_method', expense.payment_method);
    return this.http.put(
      `${this.apiUrl}/users/${this.userId}/expenses/${expenseId}`, form
    );
  }

  deleteExpense(expenseId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${this.userId}/expenses/${expenseId}`
    );
  }
}