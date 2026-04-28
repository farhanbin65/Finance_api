import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FinanceService } from '../services/finance.service';
import { ToastService } from '../services/toast.service';

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
  isLoading = true;
  isSubmitting = false;

  // Custom category inline add
  showCustomInput = false;
  newCategoryName = '';
  newCategoryType = 'expense';
  savingCategory = false;
  categoryError = '';

  expense = {
    merchant: '',
    amount: 0,
    date: '',
    category_id: '' as string | number,
    payment_method: 'card',
    note: '',
    type: 'expense'
  };

  constructor(
    private financeService: FinanceService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.financeService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) return;
        this.categories = this.financeService.getMergedCategories(user.categories || []);

        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          this.isEditMode = true;
          this.expenseId = +idParam;
          const existing = (user.expenses || []).find(
            (e: any) => e.expense_id === this.expenseId
          );
          if (existing) {
            this.expense = {
              merchant:        existing.merchant,
              amount:          existing.amount,
              date:            existing.date,
              category_id:     existing.category_id,
              payment_method:  existing.payment_method,
              note:            existing.note || '',
              type:            existing.type || 'expense'
            };
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Failed to load form data');
      }
    });
  }

  onMerchantChange(): void {
    if (this.expense.category_id) return;
    const name = this.expense.merchant.toLowerCase();
    const incomeKeywords = ['salary', 'wage', 'freelance', 'payroll', 'dividend', 'bonus'];
    if (incomeKeywords.some(k => name.includes(k))) {
      this.expense.type = 'income';
    } else {
      this.expense.type = 'expense';
    }
  }

  onCategoryChange(): void {
    const cat = this.categories.find(c => c.category_id == this.expense.category_id);
    if (cat) this.expense.type = cat.type;
  }

  get expenseCategories() { return this.categories.filter(c => c.type === 'expense'); }
  get incomeCategories()  { return this.categories.filter(c => c.type === 'income');  }

  openCustomInput(): void {
    this.showCustomInput = true;
    this.newCategoryName = '';
    this.newCategoryType = this.expense.type || 'expense';
    this.categoryError = '';
  }

  cancelCustomInput(): void {
    this.showCustomInput = false;
    this.expense.category_id = '';
  }

  saveCustomCategory(): void {
    if (!this.newCategoryName.trim()) {
      this.categoryError = 'Name is required';
      return;
    }
    this.savingCategory = true;
    this.financeService.addCategory({
      name: this.newCategoryName.trim(),
      type: this.newCategoryType
    }).subscribe({
      next: () => {
        this.financeService.getCurrentUser().subscribe(user => {
          this.categories = this.financeService.getMergedCategories(user.categories || []);
          const newCat = this.categories.find(
            c => c.name.toLowerCase() === this.newCategoryName.trim().toLowerCase()
          );
          if (newCat) {
            this.expense.category_id = newCat.category_id;
            this.expense.type = newCat.type;
          }
          this.showCustomInput = false;
          this.savingCategory = false;
          this.toast.success(`Category "${this.newCategoryName}" added`);
        });
      },
      error: () => {
        this.categoryError = 'Failed to save category';
        this.savingCategory = false;
      }
    });
  }

  validate(): boolean {
    this.errors = {};
    if (!this.expense.merchant.trim()) {
      this.errors.merchant = 'Merchant is required';
    }
    if (!this.expense.amount || this.expense.amount <= 0) {
      this.errors.amount = 'Amount must be greater than £0';
    } else if (this.expense.amount > 1_000_000) {
      this.errors.amount = 'Amount cannot exceed £1,000,000';
    }
    if (!this.expense.date)         this.errors.date        = 'Date is required';
    if (!this.expense.category_id)  this.errors.category_id = 'Please select a category';
    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate()) return;
    this.isSubmitting = true;
    const payload = { ...this.expense };

    if (this.isEditMode && this.expenseId) {
      this.financeService.updateExpense(this.expenseId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.success('Expense updated successfully');
          this.router.navigate(['/expenses']);
        },
        error: () => {
          this.isSubmitting = false;
          this.toast.error('Failed to update expense');
        }
      });
    } else {
      this.financeService.addExpense(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.success('Expense added successfully');
          this.router.navigate(['/expenses']);
        },
        error: () => {
          this.isSubmitting = false;
          this.toast.error('Failed to add expense');
        }
      });
    }
  }
}
