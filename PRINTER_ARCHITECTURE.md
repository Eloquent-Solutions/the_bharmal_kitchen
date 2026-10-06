# Printer Management & Routing Architecture
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. Connection Topologies
The system accommodates diverse printer hardware setups across restaurant stations:

1. **Network / LAN Thermal Printers (Ethernet / Wi-Fi)**
   - Direct TCP/IP socket printing (e.g. `192.168.1.200:9100`).
   - Ideal for kitchen stations located away from billing counters (e.g., Tandoor section, Main Bawarchi kitchen).

2. **USB / Local Serial Printers**
   - Connected directly to POS desktop or laptop via WebUSB / Native Browser Print API.
   - Ideal for Cashier Receipt & Bill generation.

3. **Bluetooth Thermal Printers**
   - Paired to Steward Tablets or Captain phones for table-side receipt / bill printing.

---

### 2. Station-Based Automatic Print Routing

```
                    [ POS Terminal / Waiter Tablet ]
                                   │
                     (Order Submitted / KOT Fired)
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
          [ Router / LAN ]   [ Router / LAN ]   [ Cashier USB ]
                 │                 │                 │
                 ▼                 ▼                 ▼
          Tandoor Printer    Curry / Biryani     Billing Counter
            (Station A)        (Station B)        (Bill & Tax)
```

- When an order contains items across multiple stations (e.g., *Mutton Seekh Kebab* + *Chicken Biryani*), the routing engine automatically splits the order into dedicated KOT tickets and dispatches each to its respective station printer.
