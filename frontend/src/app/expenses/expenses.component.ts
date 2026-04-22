import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../services/finance.service';
import { AuthService } from '../services/auth.service';

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

  constructor(
    private financeService: FinanceService,
    private authService: AuthService
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
    this.financeService.getAdminExpenses().subscribe(expenses => {
      this.allExpenses = expenses;
      // Build unique category list from enriched category_name field
      const seen = new Set<string>();
      this.categories = [];
      expenses.forEach(e => {
        if (e.category_name && !seen.has(e.category_name)) {
          seen.add(e.category_name);
          this.categories.push({ category_id: e.category_name, name: e.category_name });
        }
      });
      this.applyFilters();
    });
  }

  loadUserExpenses(): void {
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.categories = this.financeService.getMergedCategories(user.categories || []);
    });

    this.financeService.getExpenses(1, 500).subscribe(expenses => {
      this.allExpenses = expenses;
      this.applyFilters();
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

  getCategoryName(expense: any): string {
    if (this.isAdmin) return expense.category_name || 'Unknown';
    const cat = this.categories.find(c => c.category_id === expense.category_id);
    return cat ? cat.name : 'Unknown';
  }

  deleteExpense(expense: any): void {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    // For admin, we need the finance_id (user's mongo ID) to delete from correct user
    if (this.isAdmin) {
      // Admin delete not supported from this view — expenses belong to individual users
      alert('To delete an expense, go to that user\'s account.');
      return;
    }
    this.financeService.deleteExpense(expense.expense_id).subscribe({
      next: () => {
        this.allExpenses = this.allExpenses.filter(e => e.expense_id !== expense.expense_id);
        this.applyFilters();
      },
      error: (err) => console.error('Delete failed', err)
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedPayment = '';
    this.applyFilters();
  }
}
