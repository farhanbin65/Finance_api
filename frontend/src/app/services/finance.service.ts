import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FinanceService {

  private apiUrl = 'https://finance-api-jn7k.onrender.com';

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
    form.append('amount',      expense.amount);
    form.append('date',        expense.date);
    form.append('merchant',    expense.merchant);
    form.append('note',        expense.note || '');
    form.append('payment_method', expense.payment_method);
    form.append('type',        expense.type || 'expense');   // ← new
    return this.http.post(`${this.apiUrl}/users/${this.userId}/expenses`, form);
  }


  // Default categories seeded in-app (not DB)
private readonly DEFAULT_CATEGORIES = [
  { category_id: -1, name: 'Food & Dining',   type: 'expense' },
  { category_id: -2, name: 'Transport',        type: 'expense' },
  { category_id: -3, name: 'Shopping',         type: 'expense' },
  { category_id: -4, name: 'Rent & Bills',     type: 'expense' },
  { category_id: -5, name: 'Health',           type: 'expense' },
  { category_id: -6, name: 'Entertainment',    type: 'expense' },
  { category_id: -7, name: 'Salary',           type: 'income'  },
  { category_id: -8, name: 'Freelance',        type: 'income'  },
];

// Merge defaults with user's custom categories (custom ones take priority)
getMergedCategories(userCategories: any[]): any[] {
  const userNames = userCategories.map(c => c.name.toLowerCase());
  const filtered = this.DEFAULT_CATEGORIES.filter(
    d => !userNames.includes(d.name.toLowerCase())
  );
  return [...filtered, ...userCategories];
}

addCategory(category: { name: string; type: string }): Observable<any> {
  const form = new FormData();
  form.append('name', category.name);
  form.append('type', category.type);
  return this.http.post(`${this.apiUrl}/users/${this.userId}/categories`, form);
}

  updateExpense(expenseId: number, expense: any): Observable<any> {
    const form = new FormData();
    form.append('category_id', expense.category_id);
    form.append('amount',      expense.amount);
    form.append('date',        expense.date);
    form.append('merchant',    expense.merchant);
    form.append('note',        expense.note || '');
    form.append('payment_method', expense.payment_method);
    form.append('type',        expense.type || 'expense');   // ← new
    return this.http.put(`${this.apiUrl}/users/${this.userId}/expenses/${expenseId}`, form);
  }
  deleteExpense(expenseId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${this.userId}/expenses/${expenseId}`
    );
  }

  getAllUsers(size = 200): Observable<any[]> {
    const params = new HttpParams().set('pn', 1).set('ps', size);
    return this.http.get<any[]>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}`);
  }

  getAdminStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/stats`);
  }

  getAdminExpenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/expenses`);
  }

  getAdminBudgets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/budgets`);
  }
}