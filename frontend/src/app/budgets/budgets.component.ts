import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../services/finance.service';

@Component({
  selector: 'app-budgets',
  imports: [CommonModule],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.css'
})
export class BudgetsComponent implements OnInit {

  budgets: any[] = [];
  categories: any[] = [];
  expenses: any[] = [];
  alerts: any[] = [];
  enrichedBudgets: any[] = [];

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.budgets = user.monthly_budgets || [];
      this.categories = user.categories || [];
      this.expenses = user.expenses || [];
      this.alerts = user.alerts || [];
      this.enrichBudgets();
    });
  }

  enrichBudgets(): void {
    this.enrichedBudgets = this.budgets.map(budget => {
      const category = this.categories.find(c => c.category_id === budget.category_id);
      const categoryName = category ? category.name : 'Unknown';

      // Total spent in this category this month
      const spent = this.expenses
        .filter(e =>
          e.category_id === budget.category_id &&
          e.date.startsWith(budget.month)
        )
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      const percent = Math.min((spent / budget.budget_amount) * 100, 100);
      const remaining = budget.budget_amount - spent;

      // Check if there's an alert for this category
      const alert = this.alerts.find(
        a => a.category_id === budget.category_id && a.enabled
      );
      const isOverAlert = alert && percent >= alert.threshold_percent;

      return {
        ...budget,
        categoryName,
        spent,
        percent: +percent.toFixed(1),
        remaining,
        isOverAlert,
        alertThreshold: alert?.threshold_percent,
        status: percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : 'success'
      };
    });
  }

  getCategoryName(id: number): string {
    const cat = this.categories.find(c => c.category_id === id);
    return cat ? cat.name : 'Unknown';
  }
}