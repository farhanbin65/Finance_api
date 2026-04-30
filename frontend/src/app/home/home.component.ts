import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FinanceService } from '../services/finance.service';
import { Chart, registerables } from 'chart.js';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

Chart.register(...registerables);

const CHART_COLORS = [
  '#4F46E5','#059669','#DC2626','#D97706','#0891B2',
  '#7C3AED','#DB2777','#0D9488','#EA580C','#2563EB',
  '#16A34A','#9333EA','#F59E0B','#EF4444','#06B6D4'
];

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('spendingChart') chartRef!: ElementRef;

  totalIncome = 0;
  totalExpenses = 0;
  balance = 0;
  totalUsers = 0;
  recentExpenses: any[] = [];
  allUsers: any[] = [];
  adminExpenses: any[] = [];
  currentUser: any = null;
  chartData: { label: string, amount: number }[] = [];
  isAdmin = false;
  private chartInstance: Chart | null = null;

  constructor(
    private financeService: FinanceService,
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadUserDashboard();
    }
  }

  ngAfterViewInit(): void {}

  // ── Admin analytics ──────────────────────────────────────────────────────

  get topSpender(): { name: string; total: number } | null {
    if (!this.allUsers.length) return null;
    let top: any = null;
    let topTotal = 0;
    for (const u of this.allUsers) {
      const t = (u.expenses || []).reduce((s: number, e: any) => s + e.amount, 0);
      if (t > topTotal) { topTotal = t; top = u; }
    }
    return top ? { name: top.name, total: topTotal } : null;
  }

  get avgExpensePerUser(): number {
    return this.totalUsers > 0 ? this.totalExpenses / this.totalUsers : 0;
  }

  get topCategory(): string {
    if (!this.chartData.length) return '—';
    return this.chartData.reduce((max, d) => d.amount > max.amount ? d : max).label;
  }

  get paymentStats(): { cardPct: number; cashPct: number } {
    const total = this.adminExpenses.length;
    if (!total) return { cardPct: 0, cashPct: 0 };
    const card = this.adminExpenses.filter(e => e.payment_method === 'card').length;
    return {
      cardPct: +((card / total) * 100).toFixed(0),
      cashPct: +(((total - card) / total) * 100).toFixed(0)
    };
  }

  // ── User analytics ───────────────────────────────────────────────────────

  get userTopCategory(): string {
    if (!this.chartData.length) return '—';
    return this.chartData.reduce((max, d) => d.amount > max.amount ? d : max).label;
  }

  get userBiggestExpense(): any {
    if (!this.currentUser) return null;
    const expenses = (this.currentUser.expenses || []).filter((e: any) => (e.type ?? 'expense') === 'expense');
    return expenses.reduce((max: any, e: any) => e.amount > (max?.amount || 0) ? e : max, null);
  }

  getUserCategoryName(expense: any): string {
    if (!expense || !this.currentUser) return '—';
    const cats = this.currentUser.categories || [];
    const cat = cats.find((c: any) => c.category_id === expense.category_id);
    return cat ? cat.name : 'Other';
  }

  // ── Dashboard loaders ────────────────────────────────────────────────────

  loadAdminDashboard(): void {
    this.financeService.getAdminStats().subscribe({
      next: (stats) => {
        this.totalIncome    = stats.total_income;
        this.totalExpenses  = stats.total_expenses;
        this.balance        = stats.balance;
        this.totalUsers     = stats.total_users;
      },
      error: (err) => console.error('Admin stats error:', err)
    });

    this.financeService.getAdminExpenses().subscribe({
      next: (expenses) => {
        this.adminExpenses  = expenses;
        this.recentExpenses = expenses.slice(0, 5).map((e: any) => ({
          ...e,
          _resolvedType: e.type ?? e.category_type ?? 'expense'
        }));
        this.buildAdminChart(expenses);
      },
      error: (err) => console.error('Admin expenses error:', err)
    });

    this.financeService.getAllUsers().subscribe({
      next: (users) => { this.allUsers = users; },
      error: (err) => console.error('Users list error:', err)
    });
  }

  buildAdminChart(expenses: any[]): void {
    const grouped: { [key: string]: number } = {};
    expenses.forEach((e: any) => {
      const name = e.category_name || 'Unknown';
      grouped[name] = (grouped[name] || 0) + e.amount;
    });
    this.chartData = Object.entries(grouped)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
    setTimeout(() => this.renderChart(), 0);
  }

  loadUserDashboard(): void {
    this.financeService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) return;
        this.currentUser = user;
        this.calculateSummary();
      },
      error: (err) => console.error('User load error:', err)
    });
  }

  calculateSummary(): void {
    if (!this.currentUser) return;

    const expenses  = this.currentUser.expenses   || [];
    const categories = this.currentUser.categories || [];

    const mergedCats = this.financeService.getMergedCategories(categories);
    const catTypeMap: { [id: number]: string } = {};
    mergedCats.forEach((c: any) => catTypeMap[c.category_id] = c.type);

    const resolveType = (e: any): string =>
      catTypeMap[e.category_id] ?? e.type ?? 'expense';

    this.totalIncome   = expenses.filter((e: any) => resolveType(e) === 'income') .reduce((s: number, e: any) => s + e.amount, 0);
    this.totalExpenses = expenses.filter((e: any) => resolveType(e) === 'expense').reduce((s: number, e: any) => s + e.amount, 0);
    this.balance       = this.totalIncome - this.totalExpenses;

    this.recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(e => ({ ...e, _resolvedType: resolveType(e) }));

    const catNameMap: { [key: number]: string } = {};
    mergedCats.forEach((c: any) => catNameMap[c.category_id] = c.name);

    const grouped: { [key: string]: number } = {};
    expenses.forEach((e: any) => {
      const catName = catNameMap[e.category_id] || resolveType(e) || 'Other';
      grouped[catName] = (grouped[catName] || 0) + e.amount;
    });

    this.chartData = Object.entries(grouped)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
    setTimeout(() => this.renderChart(), 0);
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
}
