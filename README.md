# 💰 Finance Tracker — Full Stack Web Application

A full-stack personal finance management web application built as a university module project. The system allows users to track expenses, manage budgets, set spending alerts, and view financial summaries through an interactive dashboard — all backed by a RESTful API and a NoSQL database.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [Screenshots](#screenshots)

---

## Project Overview

This application was developed as part of a university module focused on full-stack web development. It demonstrates the integration of a modern frontend framework (Angular 17+) with a Python REST API (Flask) and a document-oriented database (MongoDB).

The project follows a **separation of concerns** architecture — the frontend handles presentation and user interaction, the backend handles business logic and data access, and MongoDB stores all user and financial data.

Key design decisions include:
- **Two-collection MongoDB design** — authentication data is separated from financial data, linked via a `finance_id` reference
- **JWT-based stateless authentication** — tokens are issued on login, validated on every request, and blacklisted on logout
- **HTTP Interceptor pattern** — the Angular frontend automatically attaches JWT tokens to all outgoing requests without requiring manual header management in every service call
- **Blueprint-based Flask architecture** — the backend is modularised into separate blueprints per resource (auth, users, expenses, budgets, alerts, categories)

---

## Features

- **User Authentication** — Register, login, and logout with JWT token-based security
- **Role-Based Access Control** — Admin and regular user roles with different levels of access
- **Expense Management** — Full CRUD (Create, Read, Update, Delete) for expenses with pagination support
- **Budget Management** — Set monthly budgets per spending category
- **Spending Alerts** — Configure threshold-based alerts per category
- **Category Management** — Custom income and expense categories per user
- **Interactive Dashboard** — Chart.js visualisations for spending summaries and trends
- **Admin Dashboard** — Admin users can view and manage data across all users
- **Token Expiry Handling** — Frontend automatically detects expired JWT tokens and redirects to login

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular 17+ (Standalone) | Frontend framework |
| TypeScript | Language |
| Chart.js | Data visualisations |
| Angular Router | Client-side routing |
| Angular HttpClient | HTTP requests to Flask API |
| JWT (decoded client-side) | Token expiry checking |

### Backend
| Technology | Purpose |
|---|---|
| Python 3 | Language |
| Flask | Web framework / REST API |
| Flask-CORS | Cross-origin request handling |
| PyMongo | MongoDB driver |
| PyJWT | JWT token generation and validation |
| bcrypt | Password hashing |

### Database
| Technology | Purpose |
|---|---|
| MongoDB | NoSQL document database |
| pymongo | Python MongoDB client |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ANGULAR FRONTEND                    │
│                   (http://localhost:4200)                │
│                                                         │
│  Components → Services → HTTP Interceptor               │
│       ↓            ↓            ↓                       │
│  expenses     auth.service  Attaches JWT                │
│  budgets      finance.service  Bearer token             │
│  alerts       to every request                          │
└─────────────────────┬───────────────────────────────────┘
                       │ HTTP Requests
                       │ (with Authorization: Bearer <token>)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     FLASK BACKEND                       │
│                  (http://127.0.0.1:5001)                │
│                                                         │
│  app.py                                                 │
│   ├── blueprints/auth        /login, /register, /logout │
│   ├── blueprints/users       /users                     │
│   ├── blueprints/expenses    /users/:id/expenses        │
│   ├── blueprints/budgets     /users/:id/budgets         │
│   ├── blueprints/alerts      /users/:id/alerts          │
│   └── blueprints/categories  /users/:id/categories      │
│                                                         │
│  decorators.py → jwt_required middleware                │
│  globals.py    → MongoDB connection + SECRET_KEY        │
└─────────────────────┬───────────────────────────────────┘
                       │ PyMongo queries
                       ▼
┌─────────────────────────────────────────────────────────┐
│                      MONGODB                            │
│                   finance_DB                            │
│                                                         │
│   users collection          finance_data collection     │
│   ─────────────────         ─────────────────────────   │
│   _id                       _id (= finance_id)          │
│   name                      user_id                     │
│   email                     name / email                │
│   password_hash             categories []               │
│   finance_id ──────────────▶expenses []                 │
│   admin                     monthly_budgets []          │
│   created_at                alerts []                   │
│                             created_at                  │
│                                                         │
│   blacklist collection                                  │
│   ──────────────────                                    │
│   token (invalidated JWTs)                              │
└─────────────────────────────────────────────────────────┘
```

---

## Database Design

MongoDB is used with **three collections** inside the `finance_DB` database:

### `users` — Authentication Collection
Stores login credentials and links to financial data.

```json
{
  "_id": "ObjectId",
  "name": "John Smith",
  "email": "john@example.com",
  "password_hash": "<bcrypt hash>",
  "finance_id": "<ObjectId of finance_data document>",
  "admin": false,
  "created_at": "2024-01-01"
}
```

### `finance_data` — Financial Data Collection
Stores all financial records for a user as embedded arrays.

```json
{
  "_id": "ObjectId",
  "user_id": 1,
  "name": "John Smith",
  "email": "john@example.com",
  "created_at": "2024-01-01",
  "categories": [
    { "category_id": 1, "name": "Food", "type": "expense" },
    { "category_id": 7, "name": "Salary", "type": "income" }
  ],
  "expenses": [
    {
      "expense_id": 1,
      "category_id": 1,
      "amount": 12.50,
      "date": "2024-03-15",
      "merchant": "Tesco",
      "note": "Weekly shop",
      "payment_method": "card"
    }
  ],
  "monthly_budgets": [
    { "budget_id": 1, "category_id": 1, "budget_amount": 200.00, "month": "2024-03" }
  ],
  "alerts": [
    { "alert_id": 1, "category_id": 1, "threshold_percent": 80, "enabled": true }
  ]
}
```

### `blacklist` — Token Blacklist Collection
Stores invalidated JWT tokens after logout.

```json
{ "token": "<JWT string>" }
```

---

## API Endpoints

Base URL: `http://127.0.0.1:5001`

### Auth
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/login` | Login with email & password, returns JWT | No |
| POST | `/register` | Register new user, creates finance_data doc | No |
| POST | `/logout` | Blacklists the current JWT token | Yes |

### Users
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/users` | Get all users (paginated) | No |
| GET | `/users/:id` | Get one user with all finance data | No |
| POST | `/users` | Create a user directly | No |
| PUT | `/users/:id` | Update user details | No |
| DELETE | `/users/:id` | Delete a user | No |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/expenses?pn=1&ps=10` | Get expenses (paginated) |
| GET | `/users/:id/expenses/:expense_id` | Get one expense |
| POST | `/users/:id/expenses` | Add new expense |
| PUT | `/users/:id/expenses/:expense_id` | Update expense |
| DELETE | `/users/:id/expenses/:expense_id` | Delete expense |

### Budgets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/budgets` | Get all budgets |
| GET | `/users/:id/budgets/:budget_id` | Get one budget |
| POST | `/users/:id/budgets` | Add new budget |
| PUT | `/users/:id/budgets/:budget_id` | Update budget |
| DELETE | `/users/:id/budgets/:budget_id` | Delete budget |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/alerts` | Get all alerts |
| GET | `/users/:id/alerts/:alert_id` | Get one alert |
| POST | `/users/:id/alerts` | Add new alert |
| PUT | `/users/:id/alerts/:alert_id` | Update alert |
| DELETE | `/users/:id/alerts/:alert_id` | Delete alert |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/categories` | Get all categories |
| GET | `/users/:id/categories/:category_id` | Get one category |
| POST | `/users/:id/categories` | Add new category |
| PUT | `/users/:id/categories/:category_id` | Update category |
| DELETE | `/users/:id/categories/:category_id` | Delete category |

> **Note:** POST and PUT requests use `multipart/form-data` or `application/x-www-form-urlencoded` — not JSON.

---

## Authentication Flow

```
1. User submits login form (email + password)
         ↓
2. Angular AuthService POSTs to /login
         ↓
3. Flask checks credentials against users collection
   - Validates bcrypt password hash
         ↓
4. Flask returns JWT token containing:
   - user_id, finance_id, name, admin, exp (30 min expiry)
         ↓
5. Angular stores token, finance_id, name, admin in localStorage
         ↓
6. Angular HTTP Interceptor automatically attaches
   "Authorization: Bearer <token>" header to every request
         ↓
7. Flask decorators.py jwt_required() validates token on
   protected routes and checks it against the blacklist
         ↓
8. On logout: token is POSTed to /logout → added to blacklist
   → localStorage cleared → redirect to /login
```

Token expiry is also checked **client-side** in `isLoggedIn()` by decoding the JWT payload and comparing the `exp` field against the current timestamp — preventing unnecessary API calls with expired tokens.

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

## Project Structure

```
finance-tracker/
├── backend/
│   ├── blueprints/
│   │   ├── auth/
│   │   │   └── auth.py          # Login, register, logout
│   │   ├── users/
│   │   │   └── users.py         # User CRUD
│   │   ├── expenses/
│   │   │   └── expenses.py      # Expense CRUD + pagination
│   │   ├── budgets/
│   │   │   └── budgets.py       # Budget CRUD
│   │   ├── alerts/
│   │   │   └── alerts.py        # Alert CRUD
│   │   └── categories/
│   │       └── categories.py    # Category CRUD
│   ├── app.py                   # Flask app entry point, blueprint registration
│   ├── globals.py               # MongoDB connection, SECRET_KEY
│   └── decorators.py            # jwt_required middleware
│
└── frontend/
    └── src/
        └── app/
            ├── expense-form/    # Expense form component
            ├── expenses/        # Expenses list component
            ├── guards/          # Route guards (auth protection)
            ├── home/            # Dashboard / home component
            ├── interceptors/
            │   └── auth.interceptor.ts   # JWT header injection
            ├── login/           # Login component
            ├── navigation/      # Nav component
            ├── register/        # Register component
            └── services/
                ├── auth.service.ts       # Auth, JWT, localStorage
                └── finance.service.ts    # Expenses, budgets, alerts API calls
```

---

## Screenshots

# 💰 Finance Tracker — Full Stack Web Application

A full-stack personal finance management web application built as a university module project. The system allows users to track expenses, manage budgets, set spending alerts, and view financial summaries through an interactive dashboard — all backed by a RESTful API and a NoSQL database.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [Screenshots](#screenshots)

---

## Project Overview

This application was developed as part of a university module focused on full-stack web development. It demonstrates the integration of a modern frontend framework (Angular 17+) with a Python REST API (Flask) and a document-oriented database (MongoDB).

The project follows a **separation of concerns** architecture — the frontend handles presentation and user interaction, the backend handles business logic and data access, and MongoDB stores all user and financial data.

Key design decisions include:
- **Two-collection MongoDB design** — authentication data is separated from financial data, linked via a `finance_id` reference
- **JWT-based stateless authentication** — tokens are issued on login, validated on every request, and blacklisted on logout
- **HTTP Interceptor pattern** — the Angular frontend automatically attaches JWT tokens to all outgoing requests without requiring manual header management in every service call
- **Blueprint-based Flask architecture** — the backend is modularised into separate blueprints per resource (auth, users, expenses, budgets, alerts, categories)

---

## Features

- **User Authentication** — Register, login, and logout with JWT token-based security
- **Role-Based Access Control** — Admin and regular user roles with different levels of access
- **Expense Management** — Full CRUD (Create, Read, Update, Delete) for expenses with pagination support
- **Budget Management** — Set monthly budgets per spending category
- **Spending Alerts** — Configure threshold-based alerts per category
- **Category Management** — Custom income and expense categories per user
- **Interactive Dashboard** — Chart.js visualisations for spending summaries and trends
- **Admin Dashboard** — Admin users can view and manage data across all users
- **Token Expiry Handling** — Frontend automatically detects expired JWT tokens and redirects to login

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular 17+ (Standalone) | Frontend framework |
| TypeScript | Language |
| Chart.js | Data visualisations |
| Angular Router | Client-side routing |
| Angular HttpClient | HTTP requests to Flask API |
| JWT (decoded client-side) | Token expiry checking |

### Backend
| Technology | Purpose |
|---|---|
| Python 3 | Language |
| Flask | Web framework / REST API |
| Flask-CORS | Cross-origin request handling |
| PyMongo | MongoDB driver |
| PyJWT | JWT token generation and validation |
| bcrypt | Password hashing |

### Database
| Technology | Purpose |
|---|---|
| MongoDB | NoSQL document database |
| pymongo | Python MongoDB client |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ANGULAR FRONTEND                    │
│                   (http://localhost:4200)                │
│                                                         │
│  Components → Services → HTTP Interceptor               │
│       ↓            ↓            ↓                       │
│  expenses     auth.service  Attaches JWT                │
│  budgets      finance.service  Bearer token             │
│  alerts       to every request                          │
└─────────────────────┬───────────────────────────────────┘
                       │ HTTP Requests
                       │ (with Authorization: Bearer <token>)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     FLASK BACKEND                       │
│                  (http://127.0.0.1:5001)                │
│                                                         │
│  app.py                                                 │
│   ├── blueprints/auth        /login, /register, /logout │
│   ├── blueprints/users       /users                     │
│   ├── blueprints/expenses    /users/:id/expenses        │
│   ├── blueprints/budgets     /users/:id/budgets         │
│   ├── blueprints/alerts      /users/:id/alerts          │
│   └── blueprints/categories  /users/:id/categories      │
│                                                         │
│  decorators.py → jwt_required middleware                │
│  globals.py    → MongoDB connection + SECRET_KEY        │
└─────────────────────┬───────────────────────────────────┘
                       │ PyMongo queries
                       ▼
┌─────────────────────────────────────────────────────────┐
│                      MONGODB                            │
│                   finance_DB                            │
│                                                         │
│   users collection          finance_data collection     │
│   ─────────────────         ─────────────────────────   │
│   _id                       _id (= finance_id)          │
│   name                      user_id                     │
│   email                     name / email                │
│   password_hash             categories []               │
│   finance_id ──────────────▶expenses []                 │
│   admin                     monthly_budgets []          │
│   created_at                alerts []                   │
│                             created_at                  │
│                                                         │
│   blacklist collection                                  │
│   ──────────────────                                    │
│   token (invalidated JWTs)                              │
└─────────────────────────────────────────────────────────┘
```

---

## Database Design

MongoDB is used with **three collections** inside the `finance_DB` database:

### `users` — Authentication Collection
Stores login credentials and links to financial data.

```json
{
  "_id": "ObjectId",
  "name": "John Smith",
  "email": "john@example.com",
  "password_hash": "<bcrypt hash>",
  "finance_id": "<ObjectId of finance_data document>",
  "admin": false,
  "created_at": "2024-01-01"
}
```

### `finance_data` — Financial Data Collection
Stores all financial records for a user as embedded arrays.

```json
{
  "_id": "ObjectId",
  "user_id": 1,
  "name": "John Smith",
  "email": "john@example.com",
  "created_at": "2024-01-01",
  "categories": [
    { "category_id": 1, "name": "Food", "type": "expense" },
    { "category_id": 7, "name": "Salary", "type": "income" }
  ],
  "expenses": [
    {
      "expense_id": 1,
      "category_id": 1,
      "amount": 12.50,
      "date": "2024-03-15",
      "merchant": "Tesco",
      "note": "Weekly shop",
      "payment_method": "card"
    }
  ],
  "monthly_budgets": [
    { "budget_id": 1, "category_id": 1, "budget_amount": 200.00, "month": "2024-03" }
  ],
  "alerts": [
    { "alert_id": 1, "category_id": 1, "threshold_percent": 80, "enabled": true }
  ]
}
```

### `blacklist` — Token Blacklist Collection
Stores invalidated JWT tokens after logout.

```json
{ "token": "<JWT string>" }
```

---

## API Endpoints

Base URL: `http://127.0.0.1:5001`

### Auth
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/login` | Login with email & password, returns JWT | No |
| POST | `/register` | Register new user, creates finance_data doc | No |
| POST | `/logout` | Blacklists the current JWT token | Yes |

### Users
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/users` | Get all users (paginated) | No |
| GET | `/users/:id` | Get one user with all finance data | No |
| POST | `/users` | Create a user directly | No |
| PUT | `/users/:id` | Update user details | No |
| DELETE | `/users/:id` | Delete a user | No |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/expenses?pn=1&ps=10` | Get expenses (paginated) |
| GET | `/users/:id/expenses/:expense_id` | Get one expense |
| POST | `/users/:id/expenses` | Add new expense |
| PUT | `/users/:id/expenses/:expense_id` | Update expense |
| DELETE | `/users/:id/expenses/:expense_id` | Delete expense |

### Budgets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/budgets` | Get all budgets |
| GET | `/users/:id/budgets/:budget_id` | Get one budget |
| POST | `/users/:id/budgets` | Add new budget |
| PUT | `/users/:id/budgets/:budget_id` | Update budget |
| DELETE | `/users/:id/budgets/:budget_id` | Delete budget |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/alerts` | Get all alerts |
| GET | `/users/:id/alerts/:alert_id` | Get one alert |
| POST | `/users/:id/alerts` | Add new alert |
| PUT | `/users/:id/alerts/:alert_id` | Update alert |
| DELETE | `/users/:id/alerts/:alert_id` | Delete alert |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id/categories` | Get all categories |
| GET | `/users/:id/categories/:category_id` | Get one category |
| POST | `/users/:id/categories` | Add new category |
| PUT | `/users/:id/categories/:category_id` | Update category |
| DELETE | `/users/:id/categories/:category_id` | Delete category |

> **Note:** POST and PUT requests use `multipart/form-data` or `application/x-www-form-urlencoded` — not JSON.

---

## Authentication Flow

```
1. User submits login form (email + password)
         ↓
2. Angular AuthService POSTs to /login
         ↓
3. Flask checks credentials against users collection
   - Validates bcrypt password hash
         ↓
4. Flask returns JWT token containing:
   - user_id, finance_id, name, admin, exp (30 min expiry)
         ↓
5. Angular stores token, finance_id, name, admin in localStorage
         ↓
6. Angular HTTP Interceptor automatically attaches
   "Authorization: Bearer <token>" header to every request
         ↓
7. Flask decorators.py jwt_required() validates token on
   protected routes and checks it against the blacklist
         ↓
8. On logout: token is POSTed to /logout → added to blacklist
   → localStorage cleared → redirect to /login
```

Token expiry is also checked **client-side** in `isLoggedIn()` by decoding the JWT payload and comparing the `exp` field against the current timestamp — preventing unnecessary API calls with expired tokens.

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

## Project Structure

```
finance-tracker/
├── backend/
│   ├── blueprints/
│   │   ├── auth/
│   │   │   └── auth.py          # Login, register, logout
│   │   ├── users/
│   │   │   └── users.py         # User CRUD
│   │   ├── expenses/
│   │   │   └── expenses.py      # Expense CRUD + pagination
│   │   ├── budgets/
│   │   │   └── budgets.py       # Budget CRUD
│   │   ├── alerts/
│   │   │   └── alerts.py        # Alert CRUD
│   │   └── categories/
│   │       └── categories.py    # Category CRUD
│   ├── app.py                   # Flask app entry point, blueprint registration
│   ├── globals.py               # MongoDB connection, SECRET_KEY
│   └── decorators.py            # jwt_required middleware
│
└── frontend/
    └── src/
        └── app/
            ├── expense-form/    # Expense form component
            ├── expenses/        # Expenses list component
            ├── guards/          # Route guards (auth protection)
            ├── home/            # Dashboard / home component
            ├── interceptors/
            │   └── auth.interceptor.ts   # JWT header injection
            ├── login/           # Login component
            ├── navigation/      # Nav component
            ├── register/        # Register component
            └── services/
                ├── auth.service.ts       # Auth, JWT, localStorage
                └── finance.service.ts    # Expenses, budgets, alerts API calls
```

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


---

## Notes

- All financial data is embedded within the `finance_data` document as arrays (expenses, budgets, alerts, categories). This is a **document-oriented design** suited to MongoDB, where a user's complete financial profile is retrieved in a single database query.
- The `finance_id` stored in the `users` collection acts as a foreign key reference to the corresponding `finance_data` document, keeping authentication data cleanly separated from financial data.
- New users are automatically provisioned with 8 default categories (Food, Transport, Shopping, Bills, Health, Entertainment, Salary, Freelance) on registration.
