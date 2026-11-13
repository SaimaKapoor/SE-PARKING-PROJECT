# Test Case Document (Updated Post-Sprint 3)

**PES University, Bangalore**  
**Department of Computer Science and Engineering**  
**Course**: UE24CS341A - Software Engineering (Level 3 Mini-Project)  
**Project**: Vehicle Parking System  
**Group Number**: 10  
**Authors**:
- Roshan (PES1UG24CS387)
- S Mayur (PES1UG24CS391)
- Saima Kapoor (PES1UG24CS403)
- Rohan Jadar (PES1UG24CS379)

**Date**: November 2026  
**Document Version**: 3.0 (Post-Sprint 3 Update - 17 Test Suites, 113 Tests)

---

## 1. Document Overview

This document presents the finalized, post-Sprint 3 test case suite for the Vehicle Parking System, superseding the preliminary test planning from Deliverable 4 and post-Sprint 2 documentation. Across Sprint 1, Sprint 2, and Sprint 3 (2nd Nov to 6th Nov 2026), all test cases were refined, expanded, and automated using Jest (v29), Supertest, and MongoMemoryServer, achieving **100% pass rate across all 17 test suites and 113 automated tests**.

### Summary of Sprints Updates:
1. **UT-01 (Fee Calculation - 7 Tests)**: Comprehensive boundary test suite testing zero duration, sub-hour rounding, exact 60-minute thresholds, multi-hour durations, negative duration rejection, and invalid hourly rate checks (`backend/tests/feeCalculation.test.js`).
2. **UT-04 (User Authentication & Input Validation - 24 Tests)**: Comprehensive authentication suite validating name presence, email syntax normalization, password minimum length (6 characters), bcrypt hashing (salt rounds = 10), case-insensitive logins, NoSQL injection resistance, and duplicate registration rejection (409 Conflict) (`backend/tests/auth.test.js`).
3. **Vehicle Management Suite (UT-06, UT-07, UT-08 - 12 Tests)**: Automated unit and integration tests covering vehicle registration (`POST /api/vehicles`), duplicate license plate rejection, uppercase normalization, vehicle category enforcement (2-wheeler vs 4-wheeler), and per-customer vehicle query isolation (`backend/tests/vehicle.test.js`).
4. **JWT Security & RBAC Suite (SEC-001 to SEC-004 - 13 Tests)**: Automated tests in `backend/tests/authMiddleware.test.js` validating Bearer token extraction, invalid/forged signature rejection, token expiration (`TokenExpiredError`), account persistence checks, and role-based access control (RBAC) across customer, staff, and admin tiers.
5. **Parking Slots Management (UT-02, UT-03, UT-05 - 13 Tests)**: Added in Sprint 3 (`backend/tests/slot.test.js`), validating slot querying, filtering by status (`AVAILABLE`, `OCCUPIED`, `RESERVED`), type (`2-wheeler`, `4-wheeler`), floor, slot status updates, and boundary validations.
6. **Slot Reservation Subsystem (10 Tests)**: Added in Sprint 3 (`backend/tests/reservation.test.js`), covering active reservation creation, vehicle fallback, reservation cancellation and slot freeing, and collision prevention on already occupied/reserved slots.
7. **QR Code Security & Expiration (SEC-007 / NFR-004 - 3 Tests)**: Added in Sprint 3 (`backend/tests/qrToken.test.js`), verifying distinct UUID token generation, future expiration validation (15-minute validity window), rejection of expired tokens, and unique database constraint enforcement.
8. **High Availability & Database Resilience (NFR-002 - 5 Tests)**: Added in Sprint 3 (`backend/tests/health.test.js`, `backend/tests/dbConnection.test.js`), testing `/health` liveness/readiness reporting, exponential backoff retries on transient connection failures, and bounded retry termination.
9. **Persistent Security Event Logging (SEC-006 - 5 Tests)**: Added in Sprint 3 (`backend/tests/securityEvent.test.js`), verifying tamper-resistant audit logging in MongoDB for failed logins, unauthenticated requests, RBAC denials, and ownership violations without leaking sensitive credentials.
10. **Session & Payment Integration Flow (IT-03, IT-04, ST-01, ST-05 - 1 Integration Suite)**: Automated full end-to-end flow in `backend/tests/paymentFlow.test.js` integrating slot check-in, duration calculation, mock payment processing, session completion, slot release, and customer history retrieval.

---

## 2. Updated Test Case Matrix

### 2.1 Unit Tests (UT)

| Test Case ID | Module / Service | Description | Precondition | Execution Steps | Test Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01a** | Fee Calculation | Zero duration fee calculation | Fee calculation service loaded | Call `calculateParkingFee(0, 30)` | `duration = 0`, `rate = 30` | Returns `0` | Returns `0` | **Passed** |
| **UT-01b** | Fee Calculation | Sub-hour parking duration | Fee calculation service loaded | Call `calculateParkingFee(1, 30)` | `duration = 1 min`, `rate = 30` | Charged 1 full hour (`30`) | Returns `30` | **Passed** |
| **UT-01c** | Fee Calculation | Exact 60-minute duration | Fee calculation service loaded | Call `calculateParkingFee(60, 30)` | `duration = 60 mins`, `rate = 30` | Charged 1 hour (`30`) | Returns `30` | **Passed** |
| **UT-01d** | Fee Calculation | Round-up over one hour | Fee calculation service loaded | Call `calculateParkingFee(61, 30)` | `duration = 61 mins`, `rate = 30` | Rounds up to 2 hours (`60`) | Returns `60` | **Passed** |
| **UT-01e** | Fee Calculation | Multi-hour duration rounding | Fee calculation service loaded | Call `calculateParkingFee(181, 25)` | `duration = 181 mins`, `rate = 25` | Rounds up to 4 hours (`100`) | Returns `100` | **Passed** |
| **UT-01f** | Fee Calculation | Negative duration rejection | Fee calculation service loaded | Call `calculateParkingFee(-1, 30)` | `duration = -1`, `rate = 30` | Throws validation error | Throws error | **Passed** |
| **UT-01g** | Fee Calculation | Negative rate rejection | Fee calculation service loaded | Call `calculateParkingFee(60, -1)` | `duration = 60`, `rate = -1` | Throws validation error | Throws error | **Passed** |
| **UT-02a** | Parking Slot | Reject reservation of occupied slot | Slot exists with status `OCCUPIED` | Attempt reservation on occupied slot | `slotId = 'A-01'`, status `OCCUPIED` | HTTP 409 Conflict; slot remains `OCCUPIED` | HTTP 409 Conflict returned | **Passed** |
| **UT-02b** | Parking Slot | Reject reservation of reserved slot | Slot exists with status `RESERVED` | Attempt reservation on reserved slot | `slotId = 'A-01'`, status `RESERVED` | HTTP 409 Conflict | HTTP 409 Conflict returned | **Passed** |
| **UT-03a** | Parking Slot | Query available slots | Slots exist in database | Query `GET /api/slots?status=AVAILABLE` | Filter: `status=AVAILABLE` | Returns only slots with status `AVAILABLE` | Returns matching slots | **Passed** |
| **UT-03b** | Parking Slot | Filter slots by vehicle type & floor | Slots seeded across floors | Query `GET /api/slots?type=4-wheeler&floor=1` | Filter: `type=4-wheeler`, `floor=1` | Returns slots on Floor 1 for 4-wheelers | Returns matching slots | **Passed** |
| **UT-04a** | User Auth | Valid registration with primary vehicle | Registration endpoint available | `POST /api/auth/register` with valid payload | Name: "John", Email: "john@test.com", Pass: "pass123", Phone: "9876543210", Vehicle: "KA01AB1234" | HTTP 201 Created; returns sanitized user object and JWT | HTTP 201 Created; JWT returned | **Passed** |
| **UT-04b** | User Auth | Reject missing required fields | Registration endpoint available | `POST /api/auth/register` with missing email/phone | `{ name: "John", password: "123" }` | HTTP 400 Bad Request; validation errors array returned | HTTP 400 Bad Request; validation errors returned | **Passed** |
| **UT-04c** | User Auth | Reject invalid email syntax | Registration endpoint available | `POST /api/auth/register` with malformed email | `email = "not-an-email"` | HTTP 400 Bad Request; email validation message | HTTP 400 Bad Request; rejected | **Passed** |
| **UT-04d** | User Auth | Reject duplicate user email | User already exists in database | `POST /api/auth/register` with existing email | `email = "payment@example.com"` | HTTP 409 Conflict; account already exists message | HTTP 409 Conflict; message returned | **Passed** |
| **UT-04e** | User Auth | Case-insensitive email authentication | User registered | `POST /api/auth/login` with mixed-case email | `email = "JOHN@Test.COM"` | HTTP 200 OK; JWT returned | HTTP 200 OK | **Passed** |
| **UT-05a** | Parking Slot | Reserve available slot | Slot exists with status `AVAILABLE` | `POST /api/reservations` | `slotId = 'A-01'` | HTTP 201 Created; slot status becomes `RESERVED` | Status updated to `RESERVED` | **Passed** |
| **UT-05b** | Parking Slot | Cancel active reservation | Reservation is active | `DELETE /api/reservations/:id` | Valid reservation ID | HTTP 200 OK; slot status reverts to `AVAILABLE` | Status updated to `AVAILABLE` | **Passed** |
| **UT-06** | Vehicle Service | Register new vehicle | Customer authenticated with JWT | `POST /api/vehicles` with vehicle details | Vehicle: `KA05EF9999`, Type: `4-wheeler`, Model: `Hyundai i20` | HTTP 201 Created; vehicle stored and linked to user ID | HTTP 201 Created; vehicle created | **Passed** |
| **UT-07** | Vehicle Service | Reject duplicate vehicle registration | Vehicle already registered in system | `POST /api/vehicles` with existing registration number | `vehicleNumber = 'KA05EF9999'` | HTTP 409 Conflict; duplicate registration rejected | HTTP 409 Conflict; duplicate rejected | **Passed** |
| **UT-08** | Vehicle Service | Customer vehicle query isolation | Multiple users with registered vehicles | `GET /api/vehicles` with Customer A token | Customer A Bearer token | HTTP 200 OK; returns only Customer A vehicles (zero leakage of Customer B data) | HTTP 200 OK; strictly isolated | **Passed** |

---

### 2.2 Integration Tests (IT)

| Test Case ID | Module / Service | Description | Precondition | Execution Steps | Test Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-01** | QR & Reservation | Generate unique token for reservation | User authenticated; slot reserved | `POST /api/reservations` | Valid reservation ID and vehicle ID | Unique UUID QR payload generated with expiration timestamp | Token generated | **Passed** |
| **IT-02** | QR Validation | Reject invalid or expired QR code | Entry gate scanning active | Verify token validity via `validUntil` threshold | Expired timestamp (`validUntil < now`) | Token flagged as invalid; access denied | Rejected | **Passed** |
| **IT-03** | Payment & Session | Process mock payment for parking fee | Session exists with calculated exit fee | `POST /api/payments` with session ID and amount | `sessionId = '...'`, `outcome = 'success'` | HTTP 201 Created; payment status recorded as `SUCCESS`; card numbers never stored | HTTP 201 Created; status `SUCCESS` | **Passed** |
| **IT-04** | Parking Session | Record vehicle entry and occupy slot | Valid user and available slot | `POST /api/sessions/entry` | `slotId = 'A-01'` | HTTP 201 Created; active session created; slot status set to `OCCUPIED` | HTTP 201 Created; slot occupied | **Passed** |
| **IT-05** | Health & Readiness | Backend reports service liveness | Express server running | `GET /health` | Unauthenticated GET request | HTTP 200 OK with `status: ok` and database connection status | HTTP 200 OK; uptime returned | **Passed** |
| **IT-06** | DB Resiliency | Retry initial database connection | MongoDB temporarily offline | Invoke `connectDB()` with transient failures | 2 simulated transient network drops | Retries with exponential backoff; connects successfully on recovery | Connects after 2 retries | **Passed** |

---

### 2.3 System & Security Tests (ST & SEC)

| Test Case ID | Category | Description | Precondition | Execution Steps | Test Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ST-01** | End-to-End System | Complete end-to-end customer parking lifecycle | Database initialized; user logged in | 1. Enter slot A-01<br>2. Simulate elapsed duration (61 min)<br>3. Process exit & fee<br>4. Process payment<br>5. Complete session | User: `payment@example.com`<br>Slot: `A-01`<br>Simulated duration: 61 mins | Entry recorded, exit fee calculated (>0), payment succeeds, session status `COMPLETED`, slot reverted to `AVAILABLE` | Full lifecycle executed and verified in `paymentFlow.test.js` | **Passed** |
| **ST-02** | Role Authorization | Prevent customer from accessing admin endpoints | User logged in with `customer` role | Send request to admin/staff restricted endpoint with customer JWT | Endpoint with `authorize('admin')`<br>Customer Bearer token | HTTP 403 Forbidden; "You do not have permission to perform this action" | HTTP 403 Forbidden returned | **Passed** |
| **ST-05** | Data Isolation | Customer views personal parking history | Completed parking sessions exist | `GET /api/history` with customer token | Authenticated Bearer token | HTTP 200 OK; returns only sessions and payments belonging to caller | HTTP 200 OK; returns isolated records | **Passed** |
| **SEC-001** | Security | Password hashing with bcrypt | New user registration | Register user and inspect database record | `password = "password123"` | Password stored as bcrypt hash (`$2a$10$...`); plain text never logged or stored | Hashed with salt rounds 10 | **Passed** |
| **SEC-002** | Security | Enforce role-based access control | Server running with RBAC middleware | Send requests across customer, staff, and admin routes | Customer, Staff, Admin tokens | Role restrictions strictly enforced; unauthorized roles return 403 Forbidden | Verified across 13 RBAC test cases | **Passed** |
| **SEC-003** | Security | Input validation and sanitization | Server running | Submit malformed inputs, SQL/NoSQL injection tokens, invalid email formats | Special characters and malformed emails | express-validator rejects input with 400 Bad Request; sanitizes valid strings | 400 Bad Request returned | **Passed** |
| **SEC-004** | Security | Rejection of expired JWT tokens | Expired JWT token | Request protected endpoint (`/api/auth/me`) with expired token | Token signed with `expiresIn: '0s'` | HTTP 401 Unauthorized; "Token has expired" error response | HTTP 401 Unauthorized; message verified | **Passed** |
| **SEC-005** | Security | Sensitive payment data protection | Payment processing | Submit payment transaction | Payment mock payload | Database schema validation confirming only transaction reference and amount saved; zero card details | Verified in `paymentFlow.test.js` | **Passed** |
| **SEC-006** | Security | Persistent security event logging | Invalid login or unauthorized request occurs | Send invalid login / forbidden request; inspect `security_events` collection | Invalid credentials / forbidden role access | Event persisted with event type, severity, IP address, and timestamp without sensitive credentials | Verified across 5 tests in `securityEvent.test.js` | **Passed** |
| **SEC-007** | Security / NFR-004 | Unique expiring QR tokens | QR token generated for session | Generate multiple QR tokens and check uniqueness & expiration | Multiple reservation requests | Distinct UUIDs generated; `validUntil` set to exactly 15 minutes; expired tokens rejected | Verified across 3 tests in `qrToken.test.js` | **Passed** |

---

## 3. Test Data Matrix

| Parameter | Valid Input | Invalid / Edge Cases | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **Customer Name** | `"Jane Doe"` | `""`, `"A"` (< 2 chars) | Reject with validation message |
| **Email Address** | `"jane@example.com"` | `"jane"`, `"jane@.com"`, `"jane@domain"` | Reject with email format message |
| **Password** | `"Password123"` (>= 6 chars) | `"12345"` (< 6 chars), `""` | Reject with password length requirement |
| **Phone Number** | `"9876543210"` (7-15 digits) | `"123"`, `"abcdefghij"` | Reject with phone length requirement |
| **Vehicle Number** | `"KA01AB1234"` | `""`, `"K"` (< 2 chars) | Upper-cased automatically; rejected if empty |
| **Vehicle Type** | `"2-wheeler"`, `"4-wheeler"` | `"truck"`, `""` | Reject invalid enum values |
| **Parking Duration** | `60` mins, `120` mins | `-1` mins, non-numeric | Positive integer; throws error on negative |
| **Parking Rate** | `30.00`, `50.00` | `-1.00`, non-numeric | Positive float; throws error on negative |
| **Payment Outcome** | `"success"` | `"failure"`, `"timeout"` | Sets payment status `SUCCESS` or `FAILED` |
| **Slot Status** | `"AVAILABLE"`, `"RESERVED"`, `"OCCUPIED"` | `"MAINTENANCE"`, `""` | Validated enum values; rejects unknown statuses |
| **QR Expiry** | Date in future (`+15 mins`) | Date in past (`-1 min`) | Active token accepted; past token rejected |

---

## 4. Requirements Traceability Matrix (Post-Sprint 3)

| Requirement ID | Specification Description | Source Code Location | Automated Test Suite | Test Execution Result |
| :--- | :--- | :--- | :--- | :--- |
| **FR-001** | User registration and login | `backend/src/controllers/authController.js` | `backend/tests/auth.test.js` | **Passed (24/24)** |
| **FR-002** | View available parking slots | `backend/src/models/ParkingSlot.js` | `backend/tests/slot.test.js`<br>`backend/tests/paymentFlow.test.js` | **Passed (14/14)** |
| **FR-003** | Slot reservation creation | `backend/src/controllers/reservationController.js` | `backend/tests/reservation.test.js` | **Passed (10/10)** |
| **FR-004** | Slot reservation cancellation | `backend/src/controllers/reservationController.js` | `backend/tests/reservation.test.js` | **Passed** |
| **FR-006** | Slot occupancy on entry | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-007** | Record vehicle entry timestamp | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-009** | Dynamic fee calculation | `backend/src/services/feeCalculation.js` | `backend/tests/feeCalculation.test.js` | **Passed (7/7)** |
| **FR-010** | Mock payment processing | `backend/src/controllers/paymentController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-011** | Complete session and free slot | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-013** | Customer parking history | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **SEC-001** | bcrypt password hashing (salt 10) | `backend/src/models/User.js` | `backend/tests/auth.test.js` | **Passed** |
| **SEC-002** | Role-based access control (RBAC) | `backend/src/middleware/auth.js` | `backend/tests/authMiddleware.test.js` | **Passed (13/13)** |
| **SEC-003** | Input validation & sanitization | `backend/src/middleware/validators.js` | `backend/tests/auth.test.js`<br>`backend/tests/vehicle.test.js` | **Passed** |
| **SEC-004** | Token expiration enforcement | `backend/src/middleware/auth.js` | `backend/tests/authMiddleware.test.js` | **Passed** |
| **SEC-005** | Sensitive payment data protection | `backend/src/models/Payment.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **SEC-006** | Persistent security event logging | `backend/src/services/securityEventLogger.js` | `backend/tests/securityEvent.test.js` | **Passed (5/5)** |
| **NFR-002** | Backend availability & connection retry | `backend/src/config/db.js`<br>`backend/src/app.js` | `backend/tests/health.test.js`<br>`backend/tests/dbConnection.test.js` | **Passed (5/5)** |
| **NFR-004** | QR token uniqueness & 15m expiration | `backend/src/models/ParkingSession.js` | `backend/tests/qrToken.test.js` | **Passed (3/3)** |
| **B-010/B-011** | Vehicle registration & retrieval | `backend/src/controllers/vehicleController.js` | `backend/tests/vehicle.test.js` | **Passed (12/12)** |
| **NFR-001** | Performance: slot availability response < 2s for 95% requests (PERF-01) | `backend/src/models/ParkingSlot.js`<br>`backend/src/controllers/slotController.js` | Load test under development (Issue #45 / #57) | **Pending Execution** |
| **Overall** | **17 Test Suites Automated** | **All Backend Modules** | **Jest Test Engine** | **113/113 Passed (100%)** |
| **FR-008** | Staff entry/exit dashboard & active sessions | `backend/src/controllers/sessionController.js` | `backend/tests/staffDashboard.test.js` | **Passed (4/4)** |
| **NFR-003** | Usability: Registration to QR in under 3 minutes | `frontend/src/components/Register.jsx` | `backend/tests/customerJourneyTiming.test.js` | **Passed (566ms)** |
| **NFR-005** | Reliability: 99% transaction data integrity | `backend/src/services/mongoTransaction.js` | `backend/tests/transactionIntegrity.test.js` | **Passed (100/100)** |
| **FR-012** | Admin slot & rate management | `backend/src/controllers/slotController.js` | `backend/tests/adminSlots.test.js` | **Passed (4/4)** |
| **FR-014** | Admin transaction records & stats | `backend/src/controllers/adminController.js` | `backend/tests/adminTransactions.test.js` | **Passed (3/3)** |
| **IT-01/IT-02** | QR token generate & gate validation | `backend/src/controllers/qrController.js` | `backend/tests/qrWorkflow.test.js` | **Passed (6/6)** |
