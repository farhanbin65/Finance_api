import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  users: any[] = [];
  selectedUser: any = null;
  isAdmin = false;
  searchTerm = '';

  // Delete confirmation
  deleteConfirmId: string | null = null;
  deleteConfirmInput = '';

  // Ban confirmation
  banConfirmId: string | null = null;
  banConfirmInput = '';
  banning = false;

  private readonly apiBase = 'http://127.0.0.1:5001';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const adminValue = localStorage.getItem('admin');
    this.isAdmin = adminValue === 'true';
    if (!this.isAdmin) {
      this.router.navigate(['/']);
      return;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<any[]>(`${this.apiBase}/users?ps=200`).subscribe({
      next: users => this.users = users,
      error: () => this.toast.error('Failed to load users')
    });
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.cancelConfirm();
  }

  getTotalExpenses(user: any): number {
    const categories = user.categories || [];
    const expenseCatIds = categories
      .filter((c: any) => c.type === 'expense')
      .map((c: any) => c.category_id);
    return (user.expenses || [])
      .filter((e: any) => expenseCatIds.includes(e.category_id))
      .reduce((s: number, e: any) => s + e.amount, 0);
  }

  getTotalIncome(user: any): number {
    const categories = user.categories || [];
    const incomeCatIds = categories
      .filter((c: any) => c.type === 'income')
      .map((c: any) => c.category_id);
    return (user.expenses || [])
      .filter((e: any) => incomeCatIds.includes(e.category_id))
      .reduce((s: number, e: any) => s + e.amount, 0);
  }

  getBalance(user: any): number {
    return this.getTotalIncome(user) - this.getTotalExpenses(user);
  }

  getCategoryName(user: any, id: number): string {
    const cat = (user.categories || []).find((c: any) => c.category_id === id);
    return cat ? cat.name : 'Unknown';
  }

  get filteredUsers(): any[] {
    if (!this.searchTerm.trim()) return this.users;
    return this.users.filter(u =>
      u.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  confirmDeleteUser(userId: string): void {
    this.deleteConfirmId = userId;
    this.deleteConfirmInput = '';
    this.banConfirmId = null;
    this.banConfirmInput = '';
  }

  confirmBanUser(userId: string): void {
    this.banConfirmId = userId;
    this.banConfirmInput = '';
    this.deleteConfirmId = null;
    this.deleteConfirmInput = '';
  }

  cancelConfirm(): void {
    this.deleteConfirmId = null;
    this.deleteConfirmInput = '';
    this.banConfirmId = null;
    this.banConfirmInput = '';
  }

  deleteUser(userId: string): void {
    if (this.deleteConfirmInput !== 'DELETE') return;
    this.http.delete(`${this.apiBase}/admin/users/${userId}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== userId);
        if (this.selectedUser?._id === userId) this.selectedUser = null;
        this.cancelConfirm();
        this.toast.success('User deleted successfully');
      },
      error: () => this.toast.error('Failed to delete user')
    });
  }

  banUser(userId: string): void {
    if (this.banConfirmInput !== 'BAN') return;
    this.banning = true;
    this.http.post(`${this.apiBase}/admin/ban/${userId}`, {}).subscribe({
      next: () => {
        this.banning = false;
        this.users = this.users.filter(u => u._id !== userId);
        if (this.selectedUser?._id === userId) this.selectedUser = null;
        this.cancelConfirm();
        this.toast.warning('User has been banned');
      },
      error: () => {
        this.banning = false;
        this.toast.error('Failed to ban user');
      }
    });
  }
}
