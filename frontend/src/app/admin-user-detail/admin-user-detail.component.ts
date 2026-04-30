import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Inject } from '@angular/core';
import { FinanceService } from '../services/finance.service';
import { ToastService } from '../services/toast.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const CHART_COLORS = [
  '#4F46E5','#059669','#DC2626','#D97706','#0891B2',
  '#7C3AED','#DB2777','#0D9488','#EA580C','#2563EB',
  '#16A34A','#9333EA','#F59E0B','#EF4444','#06B6D4'
];

@Component({
  selector: 'app-admin-user-detail',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: './admin-user-detail.component.css'
})
export class AdminUserDetailComponent implements OnInit, AfterViewInit {

  @ViewChild('spendingChart') chartRef?: ElementRef;

  user: any = null;
  loading = true;
  financeId = '';

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

  // Chart
  chartData: { label: string; amount: number; percent: number }[] = [];
  private chartInstance: Chart | null = null;
  chartReady = false;

  // Delete / Ban confirmation
  showDeleteConfirm = false;
  deleteInput = '';
  deleting = false;

  showBanConfirm = false;
  banInput = '';
  banning = false;

  private readonly apiBase = 'http://127.0.0.1:5001';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private financeService: FinanceService,
    private toast: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.financeId = this.route.snapshot.paramMap.get('id') || '';
    this.financeService.getUserById(this.financeId).subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
        this.prepareExpenses();
        this.prepareBudgets();
      },
      error: () => { this.loading = false; }
    });
  }

  ngAfterViewInit(): void {}

  // ── Analytics getters ────────────────────────────────────────────────────

  get totalExpensesAmount(): number {
    return this.allExpenses
      .filter(e => e.category_type === 'expense')
      .reduce((s, e) => s + e.amount, 0);
  }

  get totalIncomeAmount(): number {
    return this.allExpenses
      .filter(e => e.category_type === 'income')
      .reduce((s, e) => s + e.amount, 0);
  }

  get balanceAmount(): number {
    return this.totalIncomeAmount - this.totalExpensesAmount;
  }

  get biggestExpense(): any {
    const expenses = this.allExpenses.filter(e => e.category_type === 'expense');
    return expenses.reduce((max: any, e: any) => e.amount > (max?.amount || 0) ? e : max, null);
  }

  get topCategoryName(): string {
    return this.chartData.length > 0 ? this.chartData[0].label : '—';
  }

  get cardPercent(): number {
    const total = this.allExpenses.length;
    if (!total) return 0;
    const cards = this.allExpenses.filter(e => e.payment_method === 'card').length;
    return +((cards / total) * 100).toFixed(0);
  }

  get cashPercent(): number {
    return 100 - this.cardPercent;
  }

  get avgExpenseAmount(): number {
    const expenses = this.allExpenses.filter(e => e.category_type === 'expense');
    return expenses.length > 0 ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0;
  }

  // ── Data preparation ─────────────────────────────────────────────────────

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
    this.buildChart();
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

  // ── Chart ────────────────────────────────────────────────────────────────

  buildChart(): void {
    const expenseOnly = this.allExpenses.filter(e => e.category_type === 'expense');
    const grouped: { [key: string]: number } = {};
    expenseOnly.forEach(e => {
      grouped[e.category_name] = (grouped[e.category_name] || 0) + e.amount;
    });
    const total = Object.values(grouped).reduce((s, v) => s + v, 0);
    this.chartData = Object.entries(grouped)
      .map(([label, amount]) => ({
        label,
        amount,
        percent: total > 0 ? +((amount / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    this.chartReady = true;
    setTimeout(() => this.renderChart(), 100);
  }

  renderChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.chartRef) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const total = this.chartData.reduce((s, d) => s + d.amount, 0);

    this.chartInstance = new Chart(this.chartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.chartData.map(d =>
          `${d.label} (${total > 0 ? ((d.amount / total) * 100).toFixed(1) : 0}%)`
        ),
        datasets: [{
          data: this.chartData.map(d => d.amount),
          backgroundColor: CHART_COLORS.slice(0, this.chartData.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed as number;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                return ` £${val.toFixed(2)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ── Filters & pagination ─────────────────────────────────────────────────

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

  clearFilters(): void {
    this.expenseSearch = '';
    this.selectedCategory = '';
    this.selectedPayment = '';
    this.applyFilters();
  }

  // ── User actions ─────────────────────────────────────────────────────────

  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
    this.showBanConfirm = false;
    this.deleteInput = '';
    this.banInput = '';
  }

  openBanConfirm(): void {
    this.showBanConfirm = true;
    this.showDeleteConfirm = false;
    this.banInput = '';
    this.deleteInput = '';
  }

  cancelConfirm(): void {
    this.showDeleteConfirm = false;
    this.showBanConfirm = false;
    this.deleteInput = '';
    this.banInput = '';
  }

  deleteUser(): void {
    if (this.deleteInput !== 'DELETE') return;
    this.deleting = true;
    this.http.delete(`${this.apiBase}/admin/users/${this.financeId}`).subscribe({
      next: () => {
        this.toast.success('User deleted successfully');
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.deleting = false;
        this.toast.error('Failed to delete user');
      }
    });
  }

  banUser(): void {
    if (this.banInput !== 'BAN') return;
    this.banning = true;
    this.http.post(`${this.apiBase}/admin/ban/${this.financeId}`, {}).subscribe({
      next: () => {
        this.toast.warning('User has been banned');
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.banning = false;
        this.toast.error('Failed to ban user');
      }
    });
  }
}
