import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { ExpenseFormComponent } from './expense-form/expense-form.component';
import { BudgetsComponent } from './budgets/budgets.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminComponent } from './admin/admin.component';
import { AdminUserDetailComponent } from './admin-user-detail/admin-user-detail.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [AuthGuard] },
  { path: 'admin/users/:id', component: AdminUserDetailComponent, canActivate: [AuthGuard] },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'expenses', component: ExpensesComponent, canActivate: [AuthGuard] },
  { path: 'expenses/add', component: ExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'expenses/edit/:id', component: ExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'budgets', component: BudgetsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];