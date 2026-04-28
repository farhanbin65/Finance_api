import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../services/finance.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-expenses',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {

  allExpenses: any[] = [];
  filteredExpenses: any[] = [];
  paginatedExpenses: any[] = [];
  categories: any[] = [];

  searchTerm = '';
  selectedCategory = '';
  selectedPayment = '';

  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  isAdmin = false;
  isLoading = true;
  deletingId: number | null = null;
  deleteConfirmId: number | null = null;
  deleteConfirmInput = '';

  constructor(
    private financeService: FinanceService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();

    if (this.isAdmin) {
      this.loadAdminExpenses();
    } else {
      this.loadUserExpenses();
    }
  }

  loadAdminExpenses(): void {
    this.isLoading = true;
    this.financeService.getAdminExpenses().subscribe({
      next: (expenses) => {
        this.allExpenses = expenses;
        const seen = new Set<string>();
        this.categories = [];
        expenses.forEach(e => {
          if (e.category_name && !seen.has(e.category_name)) {
            seen.add(e.category_name);
            this.categories.push({ category_id: e.category_name, name: e.category_name });
          }
        });
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load expenses');
      }
    });
  }

  loadUserExpenses(): void {
    this.isLoading = true;
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.categories = this.financeService.getMergedCategories(user.categories || []);
    });

    this.financeService.getExpenses(1, 500).subscribe({
      next: (expenses) => {
        this.allExpenses = expenses;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load expenses');
      }
    });
  }

  applyFilters(): void {
    let result = [...this.allExpenses];

    if (this.searchTerm.trim()) {
      result = result.filter(e =>
        (e.merchant || '').toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedCategory) {
      if (this.isAdmin) {
        result = result.filter(e => e.category_name === this.selectedCategory);
      } else {
        result = result.filter(e => e.category_id === +this.selectedCategory);
      }
    }

    if (this.selectedPayment) {
      result = result.filter(e => e.payment_method === this.selectedPayment);
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.filteredExpenses = result;
    this.totalPages = Math.ceil(result.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedExpenses = this.filteredExpenses.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePage();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visiblePages(): (number | null)[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    if (total <= 7) return this.pageNumbers;
    const pages: (number | null)[] = [1];
    if (cur > 3) pages.push(null);
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) {
      pages.push(i);
    }
    if (cur < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  }

  getCategoryName(expense: any): string {
    if (this.isAdmin) return expense.category_name || 'Unknown';
    const cat = this.categories.find(c => c.category_id === expense.category_id);
    return cat ? cat.name : 'Unknown';
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
    this.deleteConfirmInput = '';
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
    this.deleteConfirmInput = '';
  }

  deleteExpense(expense: any): void {
    if (this.deleteConfirmInput !== 'DELETE') return;
    if (this.isAdmin) {
      this.toast.info('To delete an expense, go to that user\'s account.');
      return;
    }
    this.deletingId = expense.expense_id;
    this.deleteConfirmId = null;
    this.financeService.deleteExpense(expense.expense_id).subscribe({
      next: () => {
        this.deletingId = null;
        this.allExpenses = this.allExpenses.filter(e => e.expense_id !== expense.expense_id);
        this.applyFilters();
        this.toast.success('Expense deleted');
      },
      error: () => {
        this.deletingId = null;
        this.toast.error('Failed to delete expense');
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedPayment = '';
    this.applyFilters();
  }
}
