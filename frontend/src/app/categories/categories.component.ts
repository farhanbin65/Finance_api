import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FinanceService } from '../services/finance.service';

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {

  categories: any[] = [];
  showModal = false;
  saving = false;
  deleteConfirmId: number | null = null;
  successMessage = '';
  errorMessage = '';

  form = { name: '', type: 'expense' };

  private apiBase = 'http://127.0.0.1:5001';

  constructor(
    private financeService: FinanceService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.categories = user.categories || [];
    });
  }

  get expenseCategories() { return this.categories.filter(c => c.type === 'expense'); }
  get incomeCategories()  { return this.categories.filter(c => c.type === 'income');  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': localStorage.getItem('token') || '' });
  }
  private getUserId(): string {
    return localStorage.getItem('finance_id') || '';
  }

  openAddModal(): void {
    this.form = { name: '', type: 'expense' };
    this.clearMessages();
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }
  clearMessages(): void { this.successMessage = ''; this.errorMessage = ''; }

  saveCategory(): void {
    if (!this.form.name.trim()) {
      this.errorMessage = 'Category name is required.';
      return;
    }

    this.saving = true;
    const body = new FormData();
    body.append('name', this.form.name.trim());
    body.append('type', this.form.type);

    this.http.post(
      `${this.apiBase}/users/${this.getUserId()}/categories`,
      body,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.successMessage = `Category "${this.form.name}" added.`;
        this.loadData();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.Error || 'Failed to add category.';
      }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void            { this.deleteConfirmId = null; }

  deleteCategory(id: number): void {
    this.http.delete(
      `${this.apiBase}/users/${this.getUserId()}/categories/${id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.successMessage = 'Category deleted.';
        this.loadData();
      },
      error: (err) => {
        this.deleteConfirmId = null;
        this.errorMessage = err.error?.Error || 'Failed to delete category.';
      }
    });
  }
}