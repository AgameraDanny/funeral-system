    
# ⚰️ Boikanyo's Funeral Admin System

A comprehensive Spring Boot application for managing Burial Society members, monthly premium payments, and funeral arrangement invoices.

## 🚀 Features

### 1. Member Management
- **Directory:** View all members with status (Active, Deceased, Lapsed).
- **Search:** Instant search by Name or ID Number.
- **Status Automation:** Nightly job checks for outstanding dues. If a member owes > 3 months, status automatically changes to **LAPSED**.

### 2. Finance & Premiums
- **Payments:** Record monthly cash payments at satellite branches.
- **Receipts:** Generate and print professional thermal receipts instantly.
- **Arrears Calculation:** Automatic calculation of outstanding dues based on joining date and plan cost.

### 3. Funeral Arrangement (Invoicing)
- **Budgeting:** Automatically pulls the member's Society Plan coverage (e.g., R20,000).
- **Waiting Period Check:** Automatically reduces budget to R0.00 if member joined < 6 months ago.
- **Arrears Deduction:** Automatically deducts outstanding premiums from the funeral payout.
- **Invoicing:** Generate A4 printable Funeral Quotes/Invoices for families to sign.

### 4. Access Control
- **Admin (Head Office):** Can manage plans, delete members, change statuses, and edit prices.
- **Satellite User:** Can only view members and record payments (Restricted access).

---

## 🛠️ Tech Stack
- **Backend:** Java 21, Spring Boot 3
- **Database:** MySQL
- **Frontend:** HTML5, JavaScript (Single Page View), CSS
- **Security:** Spring Security (Role-Based)

---

## ⚙️ How to Run

1. **Database Setup**
Ensure you have MySQL installed and create a database:
```
CREATE DATABASE funeraldb;
```

Configuration
Check src/main/resources/application.properties and update your MySQL username/password:
Properties
spring.datasource.username=root
spring.datasource.password=yourpassword

Run the App
```
./mvnw spring-boot:run
```

Access
Open browser to: http://localhost:8080

🔐 Default Login Credentials
Role    Username    Password    Access
Head Office admin   admin123    Full Access (Create Members, Edit Plans)
Satellite Branch    satellite   branch123   Restricted (Payments Only)
Owner   owner   owner123    Full Access
Member Portal   ID Number   ID Number   Read-only (Personal Finance)

Developed for Boikanyo's Funeral Home
