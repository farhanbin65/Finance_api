import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FinanceService } from '../services/finance.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-budgets',
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.css'
})
export class BudgetsComponent implements OnInit {

  budgets: any[] = [];
  expenses: any[] = [];
  alerts: any[] = [];
  enrichedBudgets: any[] = [];
  filteredBudgets: any[] = [];

  showModal = false;
  isEditing = false;
  saving = false;
  deleteConfirmId: number | null = null;

  form = {
    budget_id: null as number | null,
    budget_amount: '',
    month: ''
  };

  selectedMonth = '';
  availableMonths: string[] = [];

  successMessage = '';
  errorMessage = '';

  isAdmin = false;

  private apiBase = 'http://127.0.0.1:5001';

  constructor(
    private financeService: FinanceService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.loadData();
  }

  loadData(): void {
    if (this.isAdmin) {
      this.financeService.getAdminBudgets().subscribe(budgets => {
        // Admin budgets already have spent calculated by backend
        this.enrichedBudgets = budgets.map(b => {
          const percent = b.budget_amount > 0
            ? Math.min((b.spent / b.budget_amount) * 100, 100)
            : 0;
          return {
            ...b,
            percent: +percent.toFixed(1),
            remaining: b.budget_amount - b.spent,
            status: percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : 'success'
          };
        });

        this.availableMonths = [...new Set(this.enrichedBudgets.map(b => b.month))].sort().reverse();
        this.applyMonthFilter();
      });
    } else {
      this.financeService.getCurrentUser().subscribe(user => {
        if (!user) return;
        this.budgets = user.monthly_budgets || [];
        this.expenses = user.expenses || [];
        this.alerts = user.alerts || [];
        this.enrichBudgets();
      });
    }
  }

  enrichBudgets(): void {
    this.enrichedBudgets = this.budgets.map(budget => {
      const spent = this.expenses
        .filter(e => (e.type === 'expense' || !e.type) && e.date?.startsWith(budget.month))
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      const percent = budget.budget_amount > 0
        ? Math.min((spent / budget.budget_amount) * 100, 100)
        : 0;
      const remaining = budget.budget_amount - spent;

      const alert = this.alerts.find(a => a.enabled);
      const isOverAlert = alert && percent >= alert.threshold_percent;

      return {
        ...budget,
        spent,
        percent: +percent.toFixed(1),
        remaining,
        isOverAlert,
        alertThreshold: alert?.threshold_percent,
        status: percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : 'success'
      };
    });

    this.availableMonths = [...new Set(this.enrichedBudgets.map(b => b.month))].sort().reverse();
    this.applyMonthFilter();
  }

  applyMonthFilter(): void {
    if (this.selectedMonth) {
      this.filteredBudgets = this.enrichedBudgets.filter(b => b.month === this.selectedMonth);
    } else {
      this.filteredBudgets = [...this.enrichedBudgets];
    }
  }

  openAddModal(): void {
    this.isEditing = false;
    this.form = { budget_id: null, budget_amount: '', month: '' };
    this.clearMessages();
    this.showModal = true;
  }

  openEditModal(b: any): void {
    this.isEditing = true;
    this.form = {
      budget_id: b.budget_id,
      budget_amount: String(b.budget_amount),
      month: b.month
    };
    this.clearMessages();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private getUserId(): string {
    return localStorage.getItem('finance_id') || '';
  }

  saveBudget(): void {
    if (!this.form.budget_amount || !this.form.month) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    this.saving = true;
    const userId = this.getUserId();

    const body = new FormData();
    body.append('budget_amount', this.form.budget_amount);
    body.append('month', this.form.month);

    if (this.isEditing && this.form.budget_id !== null) {
      this.http.put(
        `${this.apiBase}/users/${userId}/budgets/${this.form.budget_id}`,
        body
      ).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.successMessage = 'Budget updated successfully.';
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.error?.Error || 'Failed to update budget.';
        }
      });
    } else {
      this.http.post(
        `${this.apiBase}/users/${userId}/budgets`,
        body
      ).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.successMessage = 'Budget added successfully.';
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.error?.Error || 'Failed to add budget.';
        }
      });
    }
  }

  confirmDelete(budgetId: number): void {
    this.deleteConfirmId = budgetId;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  deleteBudget(budget: any): void {
    const userId = this.isAdmin ? budget.finance_id : this.getUserId();

    this.http.delete(
      `${this.apiBase}/users/${userId}/budgets/${budget.budget_id}`
    ).subscribe({
      next: () => {
        this.deleteConfirmId = null;
        this.successMessage = 'Budget deleted.';
        this.loadData();
      },
      error: (err) => {
        this.deleteConfirmId = null;
        this.errorMessage = err.error?.Error || 'Failed to delete budget.';
      }
    });
  }
}
