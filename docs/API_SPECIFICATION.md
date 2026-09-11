# Vidhyut Saathi — REST API Specification (`/api/v1`)

All API responses follow the standardized payload structure:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success message",
  "success": true
}
```

---

## 1. System Health
- **`GET /api/v1/health`**
  - Public endpoint.
  - Returns service uptime and MongoDB connection state (`readyState: 1 = Connected`).

---

## 2. Authentication

### Super Admin Password Login
- **`POST /api/v1/auth/admin/login`**
  - **Body**: `{ "email": "admin@vidhyutsaathi.com", "password": "..." }`
  - **Response**: `{ "token": "JWT_TOKEN", "user": { "fullName", "email", "role": "SUPER_ADMIN" } }`

### Franchise Partner Request OTP
- **`POST /api/v1/auth/partner/request-otp`**
  - **Body**: `{ "mobileNumber": "9876543210" }`
  - **Rules**: Mobile must belong to an active Franchise Partner. 60-second cooldown between requests.
  - **Response**: `{ "mobileNumber", "expiresInMinutes": 5, "cooldownSeconds": 60 }`

### Franchise Partner Verify OTP
- **`POST /api/v1/auth/partner/verify-otp`**
  - **Body**: `{ "mobileNumber": "9876543210", "otp": "123456" }`
  - **Response**: `{ "token": "JWT_TOKEN", "partner": { "franchiseId", "fullName", "state", "district", ... } }`

### Franchise Partner Resend OTP
- **`POST /api/v1/auth/partner/resend-otp`**
  - **Body**: `{ "mobileNumber": "9876543210" }`

### Current User Profile
- **`GET /api/v1/auth/me`**
  - **Headers**: `Authorization: Bearer <TOKEN>`

---

## 3. Franchise Partner Management (Super Admin)

### List Franchise Partners
- **`GET /api/v1/partners`**
  - **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
  - **Query Params**:
    - `page`: Page number (default: 1)
    - `limit`: Records per page (default: 10)
    - `search`: Name, Mobile, Email, Franchise ID
    - `franchiseType`: `STATE_FRANCHISE` | `DISTRICT_FRANCHISE`
    - `accountStatus`: `ACTIVE` | `INACTIVE`
    - `state`: Filter by state

### Create Franchise Partner
- **`POST /api/v1/partners`**
  - **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
  - **Body**:
    ```json
    {
      "fullName": "Abhishek Deshmukh",
      "mobileNumber": "9820123456",
      "email": "abhishek@vidhyut.com",
      "franchiseType": "DISTRICT_FRANCHISE",
      "state": "Maharashtra",
      "district": "Mumbai",
      "city": "Andheri East",
      "addressLine1": "Office 402, Trade Hub",
      "pinCode": "400069",
      "notes": "Verified partner agreement"
    }
    ```

### Get Partner Profile by ID
- **`GET /api/v1/partners/:id`**

### Update Partner Details
- **`PUT /api/v1/partners/:id`**

### Activate / Deactivate Partner
- **`PATCH /api/v1/partners/:id/status`**
  - **Body**: `{ "status": "INACTIVE" }` (or `"ACTIVE"`)

---

## 4. Dashboard Metrics
- **`GET /api/v1/dashboard/admin-metrics`** (Admin only)
- **`GET /api/v1/dashboard/partner-summary`** (Partner only)
