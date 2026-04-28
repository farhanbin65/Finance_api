import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FinanceService } from '../services/finance.service';
import { ToastService } from '../services/toast.service';

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
  deleting = false;
  deleteConfirmId: number | null = null;
  deleteConfirmInput = '';
  isLoading = true;

  form = { name: '', type: 'expense' };

  private apiBase = 'http://127.0.0.1:5001';

  constructor(
    private financeService: FinanceService,
    private http: HttpClient,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.financeService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) return;
        this.categories = user.categories || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load categories');
      }
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
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  saveCategory(): void {
    if (!this.form.name.trim()) {
      this.toast.error('Category name is required');
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
        this.toast.success(`Category "${this.form.name}" added`);
        this.loadData();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.error?.Error || 'Failed to add category');
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
    this.deleteConfirmInput = '';
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
    this.deleteConfirmInput = '';
  }

  deleteCategory(id: number): void {
    if (this.deleteConfirmInput !== 'DELETE') return;
    this.deleting = true;
    this.http.delete(
      `${this.apiBase}/users/${this.getUserId()}/categories/${id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmId = null;
        this.toast.success('Category deleted');
        this.loadData();
      },
      error: (err) => {
        this.deleting = false;
        this.deleteConfirmId = null;
        this.toast.error(err.error?.Error || 'Failed to delete category');
      }
    });
  }
}
