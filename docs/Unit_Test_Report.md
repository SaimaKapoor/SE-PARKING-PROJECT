# Unit Test Report

**PES University, Bangalore**  
**Department of Computer Science and Engineering**  
**Course**: UE24CS341A - Software Engineering (Level 3 Mini-Project)  
**Project**: Vehicle Parking System  
**Group Number**: 10  
**Test Framework**: Jest (v29) with Supertest & MongoDB In-Memory Server  
**Execution Environment**: Node.js v20.x, Windows / Ubuntu (CI)  
**Date of Execution**: November 2026 (Updated post PRs #73, #74)  

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Test Suites** | 18 passed, 18 total (100%) |
| **Total Tests** | 115 passed, 115 total (100%) |
| **Failed Tests** | 0 |
| **Skipped Tests** | 0 |
| **Execution Duration** | 46.33 seconds (in-band run) |
| **Pass Rate** | **100%** |

---

## 2. Test Suite Breakdown

### Suite 1: User Authentication API (`backend/tests/auth.test.js`)
**Scope**: Registration (`POST /api/auth/register`), Login (`POST /api/auth/login`), input validation rules, duplicate email handling, and password encryption.  
**Result**: 18 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Register with valid details and primary vehicle | `POST /api/auth/register` | Returns HTTP 201; returns sanitized user object and JWT token | Passed |
| 2 | Reject registration with missing full name | `POST /api/auth/register` | Returns HTTP 400; message includes name required | Passed |
| 3 | Reject registration with short full name (< 2 chars) | `POST /api/auth/register` | Returns HTTP 400; message includes minimum length | Passed |
| 4 | Reject registration with missing email address | `POST /api/auth/register` | Returns HTTP 400; message includes email required | Passed |
| 5 | Reject registration with invalid email format | `POST /api/auth/register` | Returns HTTP 400; message includes invalid email | Passed |
| 6 | Reject registration with short password (< 6 chars) | `POST /api/auth/register` | Returns HTTP 400; message includes password length | Passed |
| 7 | Reject registration with missing phone number | `POST /api/auth/register` | Returns HTTP 400; message includes phone required | Passed |
| 8 | Reject registration with missing vehicle number | `POST /api/auth/register` | Returns HTTP 400; message includes vehicle required | Passed |
| 9 | Reject duplicate email address registration | `POST /api/auth/register` | Returns HTTP 409 Conflict; message includes already exists | Passed |
| 10 | Normalize email to lowercase before persistence | `POST /api/auth/register` | Saved user in database has lowercase email | Passed |
| 11 | Hash user password with bcrypt prior to saving | `POST /api/auth/register` | Stored password starts with `$2a$10$` salt signature | Passed |
| 12 | Login with valid customer credentials | `POST /api/auth/login` | Returns HTTP 200; returns valid signed JWT token | Passed |
| 13 | Reject login with incorrect password | `POST /api/auth/login` | Returns HTTP 401; returns generic invalid credentials message | Passed |
| 14 | Reject login with non-existent email | `POST /api/auth/login` | Returns HTTP 401; returns generic invalid credentials message | Passed |
| 15 | Reject login with missing email field | `POST /api/auth/login` | Returns HTTP 400; validation error returned | Passed |
| 16 | Reject login with missing password field | `POST /api/auth/login` | Returns HTTP 400; validation error returned | Passed |
| 17 | Ensure login response does not expose password hash | `POST /api/auth/login` | `response.body.data.user.password` is undefined | Passed |
| 18 | Case-insensitive email authentication | `POST /api/auth/login` | Authenticates successfully regardless of email casing | Passed |

---

### Suite 2: Role-Based Access Control & Auth Middleware (`backend/tests/authMiddleware.test.js`)
**Scope**: Token extraction, signature verification, token expiration, user account validation, and role restrictions (`customer`, `staff`, `admin`).  
**Result**: 13 passed, 0 failed.

| # | Test Name | Middleware | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Block request when Authorization header is absent | `protect` | Returns HTTP 401; "Authentication token required" | Passed |
| 2 | Block request when Authorization format is not Bearer | `protect` | Returns HTTP 401; "Authentication token required" | Passed |
| 3 | Block request with forged or invalid JWT token | `protect` | Returns HTTP 401; "Invalid authentication token" | Passed |
| 4 | Block request with expired JWT token | `protect` | Returns HTTP 401; "Token has expired" (SEC-004) | Passed |
| 5 | Block request if user was deleted after token issue | `protect` | Returns HTTP 401; "User belonging to token no longer exists" | Passed |
| 6 | Attach sanitized user object to req.user on valid token | `protect` | Calls `next()`; `req.user._id` matches token subject | Passed |
| 7 | Allow user with permitted role through authorize | `authorize` | Calls `next()` when user role is in allowed roles list | Passed |
| 8 | Reject user with unpermitted role through authorize | `authorize` | Returns HTTP 403 Forbidden; insufficient permission message | Passed |
| 9 | Permit staff access to attendant gate routes | `authorize` | Calls `next()` for `staff` user | Passed |
| 10 | Block customer access to attendant gate routes | `authorize` | Returns HTTP 403 Forbidden for `customer` user | Passed |
| 11 | Permit admin access to rate/slot configuration | `authorize` | Calls `next()` for `admin` user | Passed |
| 12 | Backward compatibility wrapper requireAuth works | `requireAuth` | Invokes `protect` correctly; calls `next()` | Passed |
| 13 | Verify GET /api/auth/me returns active caller profile | `GET /me` | Returns HTTP 200 with sanitized caller details | Passed |

---

### Suite 3: Customer Vehicle Management (`backend/tests/vehicle.test.js`)
**Scope**: Vehicle registration (`POST /api/vehicles`), duplicate license plate prevention, vehicle query (`GET /api/vehicles`), and customer isolation.  
**Result**: 18 passed, 0 failed.

| # | Test Name | Target Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Register vehicle with valid 4-wheeler details | `POST /api/vehicles` | Returns HTTP 201; vehicle record created | Passed |
| 2 | Register vehicle with valid 2-wheeler details | `POST /api/vehicles` | Returns HTTP 201; vehicle record created | Passed |
| 3 | Uppercase vehicle registration number automatically | `POST /api/vehicles` | Saved `vehicleNumber` is uppercase (`KA01AB1234`) | Passed |
| 4 | Reject vehicle registration without token | `POST /api/vehicles` | Returns HTTP 401 Unauthorized | Passed |
| 5 | Reject vehicle with missing registration number | `POST /api/vehicles` | Returns HTTP 400 Bad Request | Passed |
| 6 | Reject vehicle with short registration number (< 2 chars) | `POST /api/vehicles` | Returns HTTP 400 Bad Request | Passed |
| 7 | Reject vehicle with invalid vehicle type | `POST /api/vehicles` | Returns HTTP 400 Bad Request; invalid enum | Passed |
| 8 | Reject duplicate vehicle registration for same number | `POST /api/vehicles` | Returns HTTP 409 Conflict | Passed |
| 9 | Reject duplicate vehicle even if case differs in input | `POST /api/vehicles` | Returns HTTP 409 Conflict | Passed |
| 10 | Allow optional model description in registration | `POST /api/vehicles` | Returns HTTP 201; model is saved | Passed |
| 11 | Default vehicle type to 4-wheeler if unspecified | `POST /api/vehicles` | Default value set correctly | Passed |
| 12 | Retrieve empty vehicle list for new customer | `GET /api/vehicles` | Returns HTTP 200; `data.vehicles = []` | Passed |
| 13 | Retrieve all vehicles owned by authenticated customer | `GET /api/vehicles` | Returns HTTP 200; array contains customer's vehicles | Passed |
| 14 | Prevent Customer A from viewing Customer B vehicles | `GET /api/vehicles` | Customer A token receives only Customer A records | Passed |
| 15 | Block unauthenticated GET /api/vehicles request | `GET /api/vehicles` | Returns HTTP 401 Unauthorized | Passed |
| 16 | Vehicle records include createdAt timestamp | `GET /api/vehicles` | ISO date string present on records | Passed |
| 17 | Customer can register multiple distinct vehicles | `POST /api/vehicles` | Both vehicles linked to same user ID | Passed |
| 18 | Vehicle record links to caller user ObjectId | `POST /api/vehicles` | `vehicle.user.toString() === caller._id.toString()` | Passed |

---

### Suite 4: Fee Calculation Service (`backend/tests/feeCalculation.test.js`)
**Scope**: Unit test for business calculation rule (UT-01) covering durations, hourly rate computation, ceiling rounding, and input error checking.  
**Result**: 7 passed, 0 failed.

| # | Test Name | Input Duration | Hourly Rate | Expected Output | Actual Output | Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Zero minutes costs zero | `0` mins | ₹30.00 | ₹0.00 | ₹0.00 | Passed |
| 2 | Positive duration under 1 hr costs 1 hourly rate | `1` min | ₹30.00 | ₹30.00 | ₹30.00 | Passed |
| 3 | Exactly 1 hour costs 1 hourly rate | `60` mins | ₹30.00 | ₹30.00 | ₹30.00 | Passed |
| 4 | One minute over an hour rounds up to 2 hours | `61` mins | ₹30.00 | ₹60.00 | ₹60.00 | Passed |
| 5 | Three hours and 1 minute rounds up to 4 hours | `181` mins | ₹25.00 | ₹100.00 | ₹100.00 | Passed |
| 6 | Rejection of negative duration | `-1` min | ₹30.00 | Throws validation error | Error thrown | Passed |
| 7 | Rejection of invalid / negative hourly rate | `60` mins | `-1.00` | Throws validation error | Error thrown | Passed |

---

### Suite 5: Payment & Session Lifecycle Integration (`backend/tests/paymentFlow.test.js`)
**Scope**: Integration testing across entry, exit, payment, session completion, and history retrieval (IT-03, IT-04, ST-01, ST-05).  
**Result**: 1 passed, 0 failed.

| # | Workflow Step | API Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Record entry and occupy slot | `POST /api/sessions/entry` | HTTP 201; slot status becomes `OCCUPIED` | Passed |
| 2 | Calculate fee upon exit | `POST /api/sessions/exit` | HTTP 200; calculated fee > ₹0 based on elapsed time | Passed |
| 3 | Process mock payment | `POST /api/payments` | HTTP 201; payment status `SUCCESS`; no card data stored | Passed |
| 4 | Complete session and free slot | `POST /api/sessions/:id/complete` | HTTP 200; session `COMPLETED`; slot status `AVAILABLE` | Passed |
| 5 | Verify customer history isolation | `GET /api/history` | HTTP 200; history contains completed session and payment | Passed |

---

### Suite 6: Parking Slot Service (`backend/tests/slot.test.js`)
**Scope**: Slot queries, filtering by floor/type/status, slot status transitions (`AVAILABLE` $\leftrightarrow$ `RESERVED` $\leftrightarrow$ `OCCUPIED`), and UT-02/UT-03.  
**Result**: 11 passed, 0 failed.

| # | Test Name | Target Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Fetch all parking slots | `GET /api/slots` | Returns HTTP 200 with list of slots | Passed |
| 2 | Filter slots by status (AVAILABLE) | `GET /api/slots?status=AVAILABLE` | Returns only available slots (UT-03) | Passed |
| 3 | Filter slots by floor level | `GET /api/slots?floor=1` | Returns slots on floor 1 | Passed |
| 4 | Filter slots by vehicle type | `GET /api/slots?type=4-wheeler` | Returns only 4-wheeler slots | Passed |
| 5 | Retrieve single slot by ID | `GET /api/slots/:id` | Returns single slot details | Passed |
| 6 | Retrieve single slot by slot number | `GET /api/slots/S01` | Returns slot details matching slotNumber | Passed |
| 7 | Update slot status to RESERVED | `PUT /api/slots/:id/status` | Status successfully updated to `RESERVED` | Passed |
| 8 | Update slot status to OCCUPIED | `PUT /api/slots/:id/status` | Status successfully updated to `OCCUPIED` | Passed |
| 9 | Free slot back to AVAILABLE | `PUT /api/slots/:id/status` | Status reverts to `AVAILABLE`; cleans references | Passed |
| 10 | Reject invalid status transition | `PUT /api/slots/:id/status` | Returns HTTP 400 Bad Request on invalid status enum | Passed |
| 11 | Handle non-existent slot lookup | `GET /api/slots/INVALID-SLOT` | Returns HTTP 404 Not Found | Passed |

---

### Suite 7: Parking Reservation Service (`backend/tests/reservation.test.js`)
**Scope**: Creating reservations, occupied slot conflict rejection, customer cancellation, and admin lookup (UT-02, UT-05, FR-003).  
**Result**: 12 passed, 0 failed.

| # | Test Name | Target Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Create reservation for available slot | `POST /api/reservations` | Returns HTTP 201; slot becomes `RESERVED` (UT-05) | Passed |
| 2 | Reject reservation on occupied slot | `POST /api/reservations` | Returns HTTP 409 Conflict; slot already taken (UT-02) | Passed |
| 3 | Reject reservation on already reserved slot | `POST /api/reservations` | Returns HTTP 409 Conflict | Passed |
| 4 | Fetch caller reservations | `GET /api/reservations` | Returns only caller's reservations | Passed |
| 5 | Customer cancels active reservation | `PUT /api/reservations/:id/cancel` | Reservation `CANCELLED`; slot freed to `AVAILABLE` | Passed |
| 6 | Prevent customer from cancelling another user's reservation | `PUT /api/reservations/:id/cancel` | Returns HTTP 403 Forbidden | Passed |
| 7 | Allow admin to cancel any reservation | `PUT /api/reservations/:id/cancel` | Admin token cancels successfully | Passed |
| 8 | Reject reservation creation without vehicleId | `POST /api/reservations` | Returns HTTP 400 Bad Request | Passed |
| 9 | Unique reservation ID generation (RES-...) | `POST /api/reservations` | `reservationId` format matches `^RES-[0-9A-Z]+$` | Passed |
| 10 | Retrieve single reservation details | `GET /api/reservations/:id` | Returns populated slot and user references | Passed |
| 11 | Prevent customer from viewing another user's reservation | `GET /api/reservations/:id` | Returns HTTP 403 Forbidden | Passed |
| 12 | Staff retrieves all facility reservations | `GET /api/reservations` | Staff role receives complete facility reservations | Passed |

---

### Suite 8: QR Token Lifecycle & Uniqueness (`backend/tests/qrToken.test.js`)
**Scope**: Unique UUID token generation, 15-minute expiration, and database uniqueness constraint (NFR-004, B-047).  
**Result**: 3 passed, 0 failed.

| # | Test Name | Assertion Verified | Status |
| :- | :--- | :--- | :--- |
| 1 | Distinct UUID token and future expiry for each session | Generates unique 36-char UUID; `expiresAt > Date.now()` | Passed |
| 2 | Expired tokens treated as invalid | `hasValidQrToken()` returns `false`; lookup returns `null` | Passed |
| 3 | Rejection of duplicate tokens at database level | Throws MongoDB duplicate key error (`E11000`) | Passed |

---

### Suite 9: Security Event Audit Logging (`backend/tests/securityEvent.test.js`)
**Scope**: Persistent audit logging for failed login attempts, unauthorized access, and RBAC denials (SEC-006, B-043).  
**Result**: 6 passed, 0 failed.

| # | Test Name | Assertion Verified | Status |
| :- | :--- | :--- | :--- |
| 1 | Log failed login attempt with wrong password | Records `FAILED_LOGIN` event with IP and caller email | Passed |
| 2 | Log failed login attempt with unknown email | Records `FAILED_LOGIN` event; no password stored | Passed |
| 3 | Log unauthorized access attempt with missing token | Records `UNAUTHORIZED_ACCESS` event on protected route | Passed |
| 4 | Log unauthorized access attempt with expired token | Records `UNAUTHORIZED_ACCESS` with token expired flag | Passed |
| 5 | Log forbidden access attempt on role mismatch | Records `FORBIDDEN_ACCESS` when customer accesses admin route | Passed |
| 6 | Log unauthorized reservation cancellation attempt | Records `UNAUTHORIZED_ACCESS` when user attempts cross-tenant delete | Passed |

---

### Suite 10: Database Connection Resiliency (`backend/tests/dbConnection.test.js`)
**Scope**: Bounded retry with exponential backoff on MongoDB connection (NFR-002, B-045).  
**Result**: 3 passed, 0 failed.

| # | Test Name | Assertion Verified | Status |
| :- | :--- | :--- | :--- |
| 1 | Successfully connect on first attempt | Connects cleanly without retries | Passed |
| 2 | Retry and recover after transient connection failures | Retries with backoff and succeeds on attempt 3 | Passed |
| 3 | Throw error after exceeding maximum connection attempts | Fails cleanly after 5 attempts and logs error | Passed |

---

### Suite 11: Health Probe & Readiness (`backend/tests/health.test.js`)
**Scope**: Service liveness and database readiness probe (`GET /api/health`).  
**Result**: 3 passed, 0 failed.

| # | Test Name | Assertion Verified | Status |
| :- | :--- | :--- | :--- |
| 1 | Return 200 OK when backend and database are healthy | Returns `status: 'UP'`, `backend: 'connected'`, `database: 'connected'` | Passed |
| 2 | Return 503 Service Unavailable when database disconnects | Returns HTTP 503 with `status: 'DOWN'`, `database: 'disconnected'` | Passed |
| 3 | Response includes ISO timestamp | Response payload contains valid ISO date string | Passed |

---

## 3. Test Execution Command

To execute all 11 test suites locally or in CI:
```bash
cd backend
npm test
```
All 11 suites execute in-band against isolated in-memory MongoDB databases with 100% test pass rate.


---

### Suite 12: Admin Slot Management (`backend/tests/adminSlots.test.js`)
**Scope**: Slot CRUD, hourly rate updates, validation, and admin RBAC authorization.  
**Result**: 4 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Create new parking slot as admin | `POST /api/slots` | Returns HTTP 201; slot created with configured type and hourly rate | Passed |
| 2 | Reject slot creation by non-admin user | `POST /api/slots` | Returns HTTP 403 Forbidden | Passed |
| 3 | Update slot details and hourly rate | `PUT /api/slots/:id` | Returns HTTP 200; updated hourly rate persisted | Passed |
| 4 | Delete parking slot as admin | `DELETE /api/slots/:id` | Returns HTTP 200; slot removed from database | Passed |

---

### Suite 13: Admin Transaction Records (`backend/tests/adminTransactions.test.js`)
**Scope**: Transaction records query, revenue statistics, date/status filtering, and pagination.  
**Result**: 3 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Retrieve paginated transactions as admin | `GET /api/admin/transactions` | Returns HTTP 200; list of payment transactions and pagination metadata | Passed |
| 2 | Filter transactions by status and date | `GET /api/admin/transactions?status=SUCCESS` | Returns HTTP 200; filtered results matching criteria | Passed |
| 3 | Reject customer access to admin transactions | `GET /api/admin/transactions` | Returns HTTP 403 Forbidden | Passed |

---

### Suite 14: QR Workflow & Gate Check-in (`backend/tests/qrWorkflow.test.js`)
**Scope**: QR generation, 15-minute expiration, staff validation, atomic single-use check-in, and security logging.  
**Result**: 6 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Generate unique QR token for reservation | `POST /api/qr/generate` | Returns HTTP 200; signed payload with 15-minute expiry | Passed |
| 2 | Validate QR token and check-in vehicle | `POST /api/qr/validate` | Returns HTTP 200; session created, slot marked OCCUPIED | Passed |
| 3 | Reject expired QR code | `POST /api/qr/validate` | Returns HTTP 400; "QR code has expired" | Passed |
| 4 | Reject already validated single-use token | `POST /api/qr/validate` | Returns HTTP 400; "QR code has already been used" | Passed |
| 5 | Reject non-staff user from validating QR | `POST /api/qr/validate` | Returns HTTP 403 Forbidden | Passed |
| 6 | Log security event on failed QR validation | `POST /api/qr/validate` | Persists security event into `security_events` collection | Passed |


---

### Suite 15: Staff Entry/Exit Dashboard (`backend/tests/staffDashboard.test.js`)
**Scope**: Active session listing, manual entry/exit triggers, and staff authorization enforcement.  
**Result**: 4 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Retrieve active parking sessions as staff | `GET /api/sessions/active` | Returns HTTP 200; list of active sessions with populated slot details | Passed |
| 2 | Reject customer access to active sessions endpoint | `GET /api/sessions/active` | Returns HTTP 403 Forbidden | Passed |
| 3 | Process vehicle entry gate check-in | `POST /api/sessions/entry` | Returns HTTP 201; slot occupied and session created | Passed |
| 4 | Process vehicle exit gate check-out with calculated fee | `POST /api/sessions/exit` | Returns HTTP 200; exit timestamp and parking fee returned | Passed |

---

### Suite 16: Usability & Customer Journey Timing (`backend/tests/customerJourneyTiming.test.js`)
**Scope**: Verification of NFR-003 (registration to QR token generation in under 3 minutes).  
**Result**: 1 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Complete customer registration to QR code generation under 3 minutes | Multi-step integration flow | Total elapsed time < 180,000 ms (measured at 566 ms in automated test) | Passed |

---

### Suite 17: Transaction Data Integrity & Concurrency (`backend/tests/transactionIntegrity.test.js`)
**Scope**: Verification of NFR-005 (99% transaction data integrity, atomic session abort/rollback).  
**Result**: 3 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Execute atomic multi-document transaction with automated rollback | `mongoTransaction.runInTransaction` | Rolls back state on injected error; zero orphaned records created | Passed |
| 2 | Maintain 100% data consistency across 100 concurrent/sequential operations | Multi-document booking | 100/100 simulated operations preserve data integrity without state drift | Passed |
| 3 | Graceful fallback when standalone MongoDB instance has no replica set | `runInTransaction` | Executes work function safely without throwing replica set exceptions | Passed |

---

### Suite 18: Performance & Load Testing (`backend/tests/performance.test.js`)
**Scope**: Verification of NFR-001 / PERF-01 (slot availability responds in under 2 seconds for >= 95% of concurrent requests).  
**Result**: 2 passed, 0 failed.

| # | Test Name | Target Function / Route | Assertion Verified | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Responds within 2 seconds for at least 95% of concurrent availability requests (PERF-01) | `GET /api/slots?status=AVAILABLE` | 50 concurrent requests; 100% complete in < 215ms (average 191.6ms) | Passed |
| 2 | Responds within 2 seconds under concurrent filtered queries (floor and type) | `GET /api/slots?status=AVAILABLE&type=...&floor=...` | 30 concurrent filtered queries complete in < 120ms | Passed |
