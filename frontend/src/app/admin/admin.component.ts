import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const adminValue = localStorage.getItem('admin');
    console.log('Admin value:', adminValue, typeof adminValue);
    this.isAdmin = adminValue === 'true';
    console.log('isAdmin:', this.isAdmin);
    
    if (!this.isAdmin) {
      this.router.navigate(['/']);
      return;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<any[]>('http://127.0.0.1:5001/users?ps=200').subscribe({
      next: users => this.users = users,
      error: err => console.error('Failed to load users', err)
    });
  }

  selectUser(user: any): void {
    this.selectedUser = user;
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

  deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to delete this user?')) return;
    this.http.delete(`http://127.0.0.1:5001/users/${userId}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u._id !== userId);
        if (this.selectedUser?._id === userId) this.selectedUser = null;
      },
      error: err => console.error('Delete failed', err)
    });
  }
}