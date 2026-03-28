import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FinanceService } from '../services/finance.service';

@Component({
  selector: 'app-expense-form',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.css'
})
export class ExpenseFormComponent implements OnInit {

  isEditMode = false;
  expenseId: number | null = null;
  categories: any[] = [];
  errors: any = {};

  expense = {
    merchant: '',
    amount: 0,
    date: '',
    category_id: '',
    payment_method: 'card',
    note: ''
  };

  constructor(
    private financeService: FinanceService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.categories = user.categories || [];

      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam) {
        this.isEditMode = true;
        this.expenseId = +idParam;
        const existing = (user.expenses || []).find(
          (e: any) => e.expense_id === this.expenseId
        );
        if (existing) {
          this.expense = {
            merchant: existing.merchant,
            amount: existing.amount,
            date: existing.date,
            category_id: existing.category_id,
            payment_method: existing.payment_method,
            note: existing.note || ''
          };
        }
      }
    });
  }

  validate(): boolean {
    this.errors = {};
    if (!this.expense.merchant.trim()) this.errors.merchant = 'Merchant is required';
    if (!this.expense.amount || this.expense.amount <= 0) this.errors.amount = 'Enter a valid amount';
    if (!this.expense.date) this.errors.date = 'Date is required';
    if (!this.expense.category_id) this.errors.category_id = 'Please select a category';
    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate()) return;

    if (this.isEditMode && this.expenseId) {
      this.financeService.updateExpense(this.expenseId, this.expense).subscribe({
        next: () => this.router.navigate(['/expenses']),
        error: (err) => console.error('Update failed', err)
      });
    } else {
      this.financeService.addExpense(this.expense).subscribe({
        next: () => this.router.navigate(['/expenses']),
        error: (err) => console.error('Add failed', err)
      });
    }
  }
}