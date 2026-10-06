# System Architecture & Technical Specifications
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. High-Level Architecture

The system is designed as a modular Single Page Application (SPA) backed by cloud services and an offline-resilient local cache layer:

```
[ Client Application (React 19 + Vite 6 + React Router 7) ]
        │
        ├── UI Design Tokens & Theme Engine (Vanilla CSS)
        ├── Role-Based Access Control (RBAC Module)
        ├── State Layer (useAuth, Local Reactive State)
        │
        ▼
[ Firestore Service Abstraction Layer ]
   ├── Firebase 11 SDK (Live Cloud Firestore + Auth)
   └── Resilient In-Memory & Offline Local Fallback
```

---

### 2. Multi-Organization & Multi-Branch Data Hierarchy

The architecture supports multi-tenant expansion from a single restaurant to multiple kitchen branches or cloud-kitchen outlets:

```
/organizations/{orgId}
      ├── /branches/{branchId}
      │       ├── /orders/{orderId}
      │       ├── /kots/{kotId}
      │       ├── /tables/{tableId}
      │       ├── /inventory/{materialId}
      │       ├── /expenses/{voucherId}
      │       └── /shifts/{shiftId}
      │
      ├── /menu_items/{itemId}
      ├── /categories/{catId}
      ├── /recipes/{recipeId}
      └── /users/{userId}
```

---

### 3. Role-Based Access Control (RBAC) Matrix

| Module / Screen | Owner / Admin | General Manager | Head Chef | Cashier | Waiter | Delivery Rider |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Executive Dashboard** | Full | View Only | — | — | — | — |
| **POS Billing Terminal** | Full | Full | View Only | Full | Order Only | — |
| **Active Live Orders** | Full | Full | Read/Update | Full | Full | View Assigned |
| **Kitchen Display (KDS)** | Full | Full | Full (Bump) | Read Only | Read Only | — |
| **Floor Plan & Tables** | Full | Full | — | Full | Update Status | — |
| **Menu & Pricing** | Full | Edit Only | — | Read Only | Read Only | Read Only |
| **Inventory & BOM** | Full | Full | Full | — | — | — |
| **Customer CRM** | Full | Full | — | View/Add | — | — |
| **Staff & Attendance** | Full | Full | — | Clock In | Clock In | Clock In |
| **Finances & Expenses** | Full | Manage Petty | — | Cash In/Out | — | — |
| **Reports & Analytics** | Full | View Ops | View Food Cost | Shift Close | — | — |
| **Settings & RBAC** | Full | — | — | — | — | — |

---

### 4. Resilient Service Abstraction

The data access layer (`src/services/firestore.js`) implements graceful degradation:
- When Firebase environment variables are configured and active, all queries and real-time listeners communicate directly with Google Cloud Firestore.
- If credentials are unset or the network is temporarily offline, requests seamlessly route through the local state engine, ensuring zero downtime for frontline cashiers and line cooks.
