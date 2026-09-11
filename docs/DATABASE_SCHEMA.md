# Vidhyut Saathi — MongoDB Database Schema

**Database**: `vidhyut_saathi` (MongoDB Atlas)  
**ORM**: Mongoose

---

## 1. Implemented Phase 1 Collections

### `users` Collection
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Auto-generated |
| `fullName` | String | Required, Trim | Name of user / admin |
| `mobileNumber` | String | Unique, Indexed, Match `^[6-9]\d{9}$` | Primary identifier for OTP login |
| `email` | String | Sparse, Unique, Lowercase | Optional for partners, required for Admin |
| `passwordHash` | String | Hidden (`select: false`) | Bcrypt hash (Super Admin only) |
| `role` | String | Enum: `SUPER_ADMIN`, `FRANCHISE_PARTNER`, `SUB_FRANCHISE_PARTNER` | RBAC role |
| `status` | String | Enum: `ACTIVE`, `INACTIVE`, `SUSPENDED` | Account active state |
| `lastLoginAt` | Date | Optional | Timestamp of last session |

### `franchisepartners` Collection
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Auto-generated |
| `userId` | ObjectId | Ref `User`, Unique, Indexed | Linked User auth record |
| `franchiseId` | String | Unique, Indexed, Uppercase | e.g. `VS-DT-MH-MUM-0104` |
| `franchiseType` | String | Enum: `STATE_FRANCHISE`, `DISTRICT_FRANCHISE` | Franchise Level |
| `fullName` | String | Required | Full name of partner |
| `mobileNumber` | String | Unique, Indexed | Registered contact number |
| `email` | String | Optional | Contact email |
| `state` | String | Required, Indexed | Authorized State |
| `district` | String | Required, Indexed | Authorized District |
| `authorizedDistricts`| [String]| Default `[]` | Multi-district list for State Franchise |
| `city` | String | Required | Base operating city |
| `addressLine1` | String | Required | Registered address line 1 |
| `addressLine2` | String | Optional | Registered address line 2 |
| `pinCode` | String | Required, 6 digits | Area postal code |
| `joiningDate` | Date | Default `Date.now` | Agreement / onboarding date |
| `accountStatus` | String | Enum: `ACTIVE`, `INACTIVE` | Current operating status |
| `notes` | String | Optional | Internal administrator notes |
| `createdBy` | ObjectId | Ref `User` | Super Admin creator |

### `otps` Collection
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Auto-generated |
| `mobileNumber` | String | Indexed | Destination mobile number |
| `otpHash` | String | Required | Salted bcrypt hash of 6-digit OTP |
| `purpose` | String | Enum: `PARTNER_LOGIN`, `RESET_PASSWORD` | Purpose of OTP |
| `attempts` | Number | Default `0` (Max 5) | Failed attempt counter |
| `isUsed` | Boolean | Default `false` | Invalidation flag |
| `expiresAt` | Date | TTL Index `{ expires: 0 }` | Auto-purged by MongoDB after 5 minutes |
