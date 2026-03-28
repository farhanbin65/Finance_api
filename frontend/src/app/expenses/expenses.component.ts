import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../services/finance.service';

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

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    this.financeService.getCurrentUser().subscribe(user => {
      if (!user) return;
      this.categories = user.categories || [];
    });

    this.financeService.getExpenses(1, 100).subscribe(expenses => {
      this.allExpenses = expenses;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let result = [...this.allExpenses];

    if (this.searchTerm.trim()) {
      result = result.filter(e =>
        e.merchant.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedCategory) {
      result = result.filter(e => e.category_id === +this.selectedCategory);
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

  getCategoryName(id: number): string {
    const cat = this.categories.find(c => c.category_id === id);
    return cat ? cat.name : 'Unknown';
  }

deleteExpense(id: number): void {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  this.financeService.deleteExpense(id).subscribe({
    next: () => {
      this.allExpenses = this.allExpenses.filter(e => e.expense_id !== id);
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