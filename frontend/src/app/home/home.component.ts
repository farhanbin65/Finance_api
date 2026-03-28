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
  recentExpenses: any[] = [];
  currentUser: any = null;
  chartData: { label: string, amount: number }[] = [];

  constructor(
    private financeService: FinanceService,
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  ngOnInit(): void {
    this.financeService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) return;
        this.currentUser = user;
        this.calculateSummary();
      },
      error: (err) => {
        console.error('User load error:', err);
        // Don't redirect, just show empty dashboard
      }
    });
  }
  ngAfterViewInit(): void {
    // Chart renders after data is loaded
  }

  calculateSummary(): void {
    if (!this.currentUser) return;

    const expenses = this.currentUser.expenses || [];
    const categories = this.currentUser.categories || [];

    // Separate income and expense category IDs
    const incomeCategoryIds = categories
      .filter((c: any) => c.type === 'income')
      .map((c: any) => c.category_id);

    const expenseCategoryIds = categories
      .filter((c: any) => c.type === 'expense')
      .map((c: any) => c.category_id);

    // Total income = sum of transactions in income categories
    this.totalIncome = expenses
      .filter((e: any) => incomeCategoryIds.includes(e.category_id))
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    // Total expenses = sum of transactions in expense categories only
    this.totalExpenses = expenses
      .filter((e: any) => expenseCategoryIds.includes(e.category_id))
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    // Balance = income - expenses
    this.balance = this.totalIncome - this.totalExpenses;

    // Recent 5 expenses (all transactions sorted by date)
    this.recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Chart data grouped by category name
    const categoryMap: { [key: number]: string } = {};
    categories.forEach((c: any) => categoryMap[c.category_id] = c.name);

    const grouped: { [key: string]: number } = {};
    expenses.forEach((e: any) => {
      const catName = categoryMap[e.category_id] || 'Unknown';
      grouped[catName] = (grouped[catName] || 0) + e.amount;
    });

    this.chartData = Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
    setTimeout(() => this.renderChart(), 0);
  }

  renderChart(): void {
    if (!isPlatformBrowser(this.platformId)) return; // ← stops SSR from touching canvas
    if (!this.chartRef) return;

    new Chart(this.chartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.chartData.map(d => d.label),
        datasets: [{
          data: this.chartData.map(d => d.amount),
          backgroundColor: ['#198754', '#dc3545', '#0d6efd', '#ffc107', '#6f42c1', '#0dcaf0'],
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