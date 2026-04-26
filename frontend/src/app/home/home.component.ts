import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FinanceService } from '../services/finance.service';
import { Chart, registerables } from 'chart.js';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

Chart.register(...registerables);

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

  loadAdminDashboard(): void {
    this.financeService.getAdminStats().subscribe({
      next: (stats) => {
        this.totalIncome = stats.total_income;
        this.totalExpenses = stats.total_expenses;
        this.balance = stats.balance;
        this.totalUsers = stats.total_users;
      },
      error: (err) => console.error('Admin stats error:', err)
    });

    this.financeService.getAdminExpenses().subscribe({
      next: (expenses) => {
        this.recentExpenses = expenses.slice(0, 5);
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
    this.chartData = Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
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

    const expenses = this.currentUser.expenses || [];
    const categories = this.currentUser.categories || [];

    // Build a category-id → type map (merge in defaults for negative IDs)
    const mergedCats = this.financeService.getMergedCategories(categories);
    const catTypeMap: { [id: number]: string } = {};
    mergedCats.forEach((c: any) => catTypeMap[c.category_id] = c.type);

    // Resolve type: category lookup first, then stored type field, then default to expense
    const resolveType = (e: any): string =>
      catTypeMap[e.category_id] ?? e.type ?? 'expense';

    this.totalIncome   = expenses.filter((e: any) => resolveType(e) === 'income') .reduce((s: number, e: any) => s + e.amount, 0);
    this.totalExpenses = expenses.filter((e: any) => resolveType(e) === 'expense').reduce((s: number, e: any) => s + e.amount, 0);

    this.balance = this.totalIncome - this.totalExpenses;

    this.recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Build chart using already-merged categories
    const catNameMap: { [key: number]: string } = {};
    mergedCats.forEach((c: any) => catNameMap[c.category_id] = c.name);

    const grouped: { [key: string]: number } = {};
    expenses.forEach((e: any) => {
      const catName = catNameMap[e.category_id] || resolveType(e) || 'Other';
      grouped[catName] = (grouped[catName] || 0) + e.amount;
    });

    this.chartData = Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
    setTimeout(() => this.renderChart(), 0);
  }

  renderChart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.chartRef) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    this.chartInstance = new Chart(this.chartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.chartData.map(d => d.label),
        datasets: [{
          data: this.chartData.map(d => d.amount),
          backgroundColor: ['#4F46E5','#059669','#DC2626','#D97706','#0891B2','#7C3AED','#DB2777','#0D9488'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}
