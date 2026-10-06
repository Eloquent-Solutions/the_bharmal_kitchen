# PROJECT PLAN & ROADMAP
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. Vision & Strategy
Deliver a high-speed, multi-device, offline-resilient restaurant management system specifically tailored for **The Bharmals Kitchen**, handling fine dining, takeaway, delivery dispatch, KOT station routing, inventory BOM deduction, and staff payroll.

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
