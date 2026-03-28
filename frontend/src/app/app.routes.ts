import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { ExpenseFormComponent } from './expense-form/expense-form.component';
import { BudgetsComponent } from './budgets/budgets.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'expenses', component: ExpensesComponent },
  { path: 'expenses/add', component: ExpenseFormComponent },
  { path: 'expenses/edit/:id', component: ExpenseFormComponent },
  { path: 'budgets', component: BudgetsComponent },
];