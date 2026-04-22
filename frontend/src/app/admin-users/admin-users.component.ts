import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FinanceService } from '../services/finance.service';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent implements OnInit {

  allUsers: any[] = [];
  filteredUsers: any[] = [];
  searchTerm = '';

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    this.financeService.getAllUsers().subscribe(users => {
      this.allUsers = users;
      this.filteredUsers = users;
    });
  }

  applySearch(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }
}
