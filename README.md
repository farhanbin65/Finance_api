# Finance Tracker — Full Stack Web Application

A full-stack personal finance management web application built as a university module project. The system allows users to track expenses, manage budgets, set spending alerts, and view financial summaries through an interactive dashboard — all backed by a RESTful API and a NoSQL database.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Setup & Installation](#setup--installation)
- [Screenshots](#screenshots)

---

## Project Overview

This application was developed as part of a university module focused on full-stack web development. It demonstrates the integration of a modern frontend framework (Angular 17+) with a Python REST API (Flask) and a document-oriented database (MongoDB).

The project follows a **separation of concerns** architecture — the frontend handles presentation and user interaction, the backend handles business logic and data access, and MongoDB stores all user and financial data.

Key design decisions include:
- **Two-collection MongoDB design** — authentication data is separated from financial data, linked via a `finance_id` reference
- **JWT-based stateless authentication** — tokens are issued on login, validated on every request, and blacklisted on logout
- **HTTP Interceptor pattern** — the Angular frontend automatically attaches JWT tokens to all outgoing requests without requiring manual header management in every service call
- **Blueprint-based Flask architecture** — the backend is modularised into separate blueprints per resource (auth, users, expenses, budgets, alerts, categories, admin)
- **Avatar system** — users choose an avatar style at registration; avatars are generated on-demand via the DiceBear API and displayed throughout the app including the admin dashboard

---

## Features

- **User Authentication** — Register, login, and logout with JWT token-based security
- **Avatar Picker** — Choose from 6 avatar styles at registration (Cartoon, Robot, Pixel, Minimal, Adventure, Sketch), powered by DiceBear
- **User Profile** — View and update profile details and avatar style
- **Role-Based Access Control** — Admin and regular user roles with different levels of access
- **Expense Management** — Full CRUD (Create, Read, Update, Delete) for expenses with pagination support
- **Budget Management** — Set monthly budgets per spending category
- **Spending Alerts** — Configure threshold-based alerts per category
- **Category Management** — Custom income and expense categories per user
- **Interactive Dashboard** — Chart.js doughnut chart for spending summaries by category
- **Admin Dashboard** — View platform-wide stats, all user expenses, and manage users
- **Admin User List** — Browse all registered users with avatars, search by name or email, and drill into individual profiles
- **Token Expiry Handling** — Frontend automatically detects expired JWT tokens and redirects to login

---

## Setup & Installation

### Prerequisites
- Node.js & npm
- Python 3.8+
- MongoDB (running locally on port 27017)
- Angular CLI (`npm install -g @angular/cli`)

### 1. Clone the repository
```bash
git clone <repository-url>
cd finance-tracker
```

### 2. Backend Setup
```bash
cd backend
pip install flask flask-cors pymongo pyjwt bcrypt
python app.py
```
The Flask server will start at `http://127.0.0.1:5001`

### 3. Frontend Setup
```bash
cd frontend
npm install
ng serve
```
The Angular app will start at `http://localhost:4200`

### 4. MongoDB
Ensure MongoDB is running locally:
```bash
mongod
```
The app connects to `mongodb://localhost:27017/` and uses the `finance_DB` database. Collections are created automatically on first use.

> **Note:** The `SECRET_KEY` in `globals.py` should be changed to a strong secret before any deployment.

---

## Screenshots

<img width="1855" height="932" alt="image" src="https://github.com/user-attachments/assets/27c13a7d-00c5-4907-8710-fc7b53b9367b" />
<img width="834" height="742" alt="image" src="https://github.com/user-attachments/assets/b00064ba-c241-4213-88c3-9dabfc3374cb" />
<img width="1861" height="934" alt="image" src="https://github.com/user-attachments/assets/fe5dbaa0-ebb3-4697-b559-aee987dbde32" />
<img width="1860" height="937" alt="image" src="https://github.com/user-attachments/assets/d4e463d7-f286-4bb0-a142-e39e0305e1d7" />
<img width="1854" height="938" alt="image" src="https://github.com/user-attachments/assets/69a5c883-4fa4-45ff-a12b-87e8d8a35762" />

---

## Notes

- All financial data is embedded within the `finance_data` document as arrays (expenses, budgets, alerts, categories). This is a **document-oriented design** suited to MongoDB, where a user's complete financial profile is retrieved in a single database query.
- The `finance_id` stored in the `users` collection acts as a foreign key reference to the corresponding `finance_data` document, keeping authentication data cleanly separated from financial data.
- New users are automatically provisioned with 8 default categories (Food, Transport, Shopping, Bills, Health, Entertainment, Salary, Freelance) on registration.
- Avatar styles are stored in the `users` (auth) collection and joined into the `/users` response at query time using a bulk email lookup — keeping the `finance_data` collection free of auth concerns.
- The `avatar_style` field drives the [DiceBear API](https://www.dicebear.com/) URL used throughout the frontend (`https://api.dicebear.com/7.x/{style}/svg?seed={name}`). The user's name is used as the seed so the avatar is consistent across sessions without storing an image.
