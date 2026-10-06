# Architecture Decision Records (ADR)
## The Bharmals Kitchen — Restaurant Management System (RMS)

### ADR-001: Technology Stack Selection
- **Context:** Need a lightning-fast, reactive, scalable web platform for multi-device operations (Desktop, Tablet, KDS, Mobile).
- **Decision:** React 19 + Vite 6 + React Router v7 with Vanilla CSS Design Tokens.
- **Rationale:** React 19 provides modern state handling; Vite offers near-instant HMR; Vanilla CSS with tokens ensures complete design freedom for dark glassmorphism without bloated framework overrides.

### ADR-002: Offline-First & Resilient Service Architecture
- **Context:** Restaurant checkout counters cannot stop functioning during brief internet dropouts.
- **Decision:** Build a unified service abstraction (`src/services/firestore.js`) with an automatic memory/local fallback layer that mirrors Firestore's collection and query semantics.
- **Rationale:** Ensures that the app is immediately testable and functional out of the box, with seamless sync to Cloud Firestore when connected.

### ADR-003: Multi-Station KOT Routing
- **Context:** Bohra cuisine involves distinct preparation stations (Tandoor, Handi Biryani/Curries, Beverages).
- **Decision:** Every menu item and category declares its default kitchen station. The order engine splits tickets automatically into station-specific KOT streams.
- **Rationale:** Prevents kitchen bottlenecks and ensures cooks only receive tickets relevant to their station.
