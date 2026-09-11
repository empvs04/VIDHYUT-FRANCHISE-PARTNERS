# Vidhyut Saathi — Territory Architecture & Enforcement Rules

## 1. Core Business Principles
1. **Zero Out-of-Territory Operations**: A partner registered for a district (e.g. `Mumbai`) cannot create sub-franchises, assign cards, or install energy savers outside their designated district.
2. **Backend Enforcement**: Territory boundaries are validated at the Express middleware layer (`territory.middleware.js`). Frontend UI validation is purely a user convenience layer.
3. **Hierarchy Options**:
   - **Direct Model**: Super Admin $\to$ District Franchise Partner $\to$ Sub-Franchise $\to$ Customer.
   - **State Model**: Super Admin $\to$ State Franchise Partner $\to$ Multiple District Partners $\to$ Sub-Franchise $\to$ Customer.

---

## 2. GPS Live Verification Architecture (Phase 4 Integration)

```text
[Technician / Partner on Android App]
                   │
                   │ (1) Sends Card Installation Request
                   │     - Serial Number
                   │     - MCB / ELCB Photo
                   │     - Live Device GPS: { latitude, longitude }
                   ▼
[Express Backend - Territory Service]
                   │
                   │ (2) Reverse Geocoding / GeoJSON Polygon Query
                   │     Matches (lat, lng) -> Detected District
                   ▼
      Is Detected District == Partner.AuthorizedDistrict?
             ├── YES -> Approve Installation & Save Record
             └── NO  -> REJECT with 403: "GPS Location mismatch with authorized territory"
```
