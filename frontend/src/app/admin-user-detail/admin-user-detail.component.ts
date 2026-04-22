import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FinanceService } from '../services/finance.service';

@Component({
  selector: 'app-admin-user-detail',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: './admin-user-detail.component.css'
})
export class AdminUserDetailComponent implements OnInit {

  user: any = null;
  loading = true;

  // Expenses
  allExpenses: any[] = [];
  filteredExpenses: any[] = [];
  paginatedExpenses: any[] = [];
  expenseSearch = '';
  selectedCategory = '';
  selectedPayment = '';
  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  // Budgets
  enrichedBudgets: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private financeService: FinanceService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.financeService.getUserById(id).subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
        this.prepareExpenses();
        this.prepareBudgets();
      },
      error: () => { this.loading = false; }
    });
  }

  prepareExpenses(): void {
    const categories: any[] = this.user.categories || [];
    const catMap: { [id: number]: any } = {};
    categories.forEach((c: any) => catMap[c.category_id] = c);

    this.allExpenses = (this.user.expenses || []).map((e: any) => ({
      ...e,
      category_name: catMap[e.category_id]?.name || 'Unknown',
      category_type: catMap[e.category_id]?.type || 'expense'
    }));

    this.applyFilters();
  }

  prepareBudgets(): void {
    const expenses: any[] = this.user.expenses || [];
    this.enrichedBudgets = (this.user.monthly_budgets || []).map((b: any) => {
      const spent = expenses
        .filter((e: any) => (e.type === 'expense' || !e.type) && e.date?.startsWith(b.month))
        .reduce((sum: number, e: any) => sum + e.amount, 0);
      const percent = b.budget_amount > 0 ? Math.min((spent / b.budget_amount) * 100, 100) : 0;
      return {
        ...b,
        spent,
        percent: +percent.toFixed(1),
        remaining: b.budget_amount - spent,
        status: percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : 'success'
      };
    }).sort((a: any, b: any) => b.month.localeCompare(a.month));
  }

  get categories(): any[] {
    const seen = new Set<string>();
    const result: any[] = [];
    this.allExpenses.forEach(e => {
      if (!seen.has(e.category_name)) {
        seen.add(e.category_name);
        result.push({ id: e.category_name, name: e.category_name });
      }
    });
    return result;
  }

  applyFilters(): void {
    let result = [...this.allExpenses];

    if (this.expenseSearch.trim()) {
      result = result.filter(e =>
        (e.merchant || '').toLowerCase().includes(this.expenseSearch.toLowerCase())
      );
    }

    if (this.selectedCategory) {
      result = result.filter(e => e.category_name === this.selectedCategory);
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

  clearFilters(): void {
    this.expenseSearch = '';
    this.selectedCategory = '';
    this.selectedPayment = '';
    this.applyFilters();
  }
}
