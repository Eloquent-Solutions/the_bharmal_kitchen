# PROJECT PLAN & ROADMAP
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. Vision & Strategy
Deliver a high-speed, multi-device, offline-resilient restaurant management system specifically tailored for **The Bharmals Kitchen**, handling fine dining, takeaway, delivery dispatch, KOT station routing, inventory BOM deduction, and staff payroll.

### Current release priorities — 28 October 2026

The current business focus is takeaway and pickup. Keep table service, the floor plan, reservations, and waitlist hidden until the final release stage. Revisit these together when dine-in becomes a priority.

Customer Google sign-in, pickup requests, staff confirmation, phone takeaway billing, kitchen status, and pay at pickup are part of the current release. Customer ordering is no longer a pending module.

Menu modifiers and combos still need integration with the released checkout, recipe deductions, kitchen tickets, and receipts. Purchase orders are already included in the current staff release routes; itemized ordering, partial receiving through supplier bills, and cancelling outstanding quantities are implemented. Confirm the actual supplier workflow before treating purchase orders as accepted by the business.

Finance and reporting implementation is prepared on `codex/finance-reports` for development review: operating expenses, register cash movements, cashier register shifts, reconciliation, saved day closes, sales, orders, food cost, estimated operating profit, and recorded sales tax. Enable `VITE_FINANCE_ENABLED=true` only with the matching Firestore rules. This implementation has not been released to production.

Staff attendance, employee scheduling, leave, payroll, and staff reports are deferred to the final phase alongside table service. Register shifts in Finance track till opening and handover; they do not manage employee schedules. Most restaurant and printer settings remain separate review work. User access management, billing settings, and inventory valuation are already included in the release.

The historical implementation table below describes screen coverage, not production acceptance.

---

### 2. Phased Implementation Timeline

| Phase | Module / Focus Area | Deliverables & Scope | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation & Design System** | React 19 + Vite 6 scaffold, CSS design tokens, Glassmorphism theme, Responsive App Shell, TopBar (`⌘K` search), Sidebar. | ✅ Completed |
| **Phase 2** | **Security & RBAC Architecture** | Firebase Auth hooks, Login/Signup/Reset, 10 System Roles, Permission-Gated Routes, Security rules specification. | ✅ Completed |
| **Phase 3** | **Core Operational POS & Orders** | POS billing terminal with instant search, Cart calculations (CGST/SGST, roundoff), Active Orders live feed, Order History & Audit. | ✅ Completed |
| **Phase 4** | **Kitchen & Table Management** | KDS kitchen display with live timers and station routing, Interactive Floor Plan, Table status workflow, Reservations manager. | ✅ Completed |
| **Phase 5** | **Menu, Inventory & Recipe BOM** | Dish catalog with 86 live toggle, Category organizer, Raw materials ledger, Portion Recipe Bill of Materials (BOM) & cost tracking. | ✅ Completed |
| **Phase 6** | **Staff, CRM & Finances** | Staff roster, Daily shift attendance, Guest CRM with loyalty tiers, Operating expenses & Petty cash ledger, Analytics & Reports. | ✅ Completed |
| **Phase 7** | **Hardware, Printing & Digital Ordering** | Thermal printer ESC/POS receipt generation, KOT network routing, QR digital ordering menu, and shift day-close workflows. | 🔄 Next |
| **Phase 8** | **Production Hardening** | PWA offline caching with IndexedDB, multi-branch syncing, performance tuning, and Vercel cloud deployment. | 📋 Planned |

### 30 October 2026 — Development review

Dashboard connected to finance reporting; Wi-Fi/LAN ESC/POS print queue and Windows bridge prepared; receipt rendering and owner settings connected; estimated recipe drafting and acceptance workflow added. See `MODULE_REVIEW.md` for scope and deferred capabilities. Physical printer test deferred until its model and network address are available. No release or Git publication performed as part of this work.
