# Test Case Document (Updated Post-Sprint 2)

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
**Document Version**: 2.0 (Updated from Deliverable 4 based on Sprint 1 & 2 implementation)

---

## 1. Document Overview

This document presents the updated test case suite for the Vehicle Parking System, superseding the preliminary test planning from Deliverable 4. During Sprint 1 and Sprint 2, the test cases were refined, expanded, and automated using Jest, Supertest, and MongoMemoryServer.

### Summary of Sprints Updates:
1. **UT-01 (Fee Calculation)**: Expanded from a single test scenario (2 hours @ ₹30/hr) into a comprehensive 7-scenario boundary test suite testing zero duration, sub-hour rounding, exact 60-minute thresholds, multi-hour durations, negative duration rejection, and invalid hourly rate checks.
2. **UT-04 (User Input Validation)**: Expanded from a single missing vehicle registration check into an 18-scenario authentication suite validating name presence, email syntax normalization, password minimum length (6 characters), password hashing (bcrypt salt 10), and duplicate registration rejection (409 Conflict).
3. **Vehicle Management Suite (UT-06, UT-07, UT-08)**: Added 18 automated unit and integration tests covering vehicle registration (`POST /api/vehicles`), duplicate license plate rejection, uppercase normalization, vehicle category enforcement (2-wheeler vs 4-wheeler), and per-customer vehicle query isolation (`GET /api/vehicles`).
4. **JWT Security Suite (SEC-001 to SEC-004)**: Added 13 automated tests in `tests/authMiddleware.test.js` validating Bearer token extraction, invalid/forged signature rejection, token expiration (`TokenExpiredError`), account persistence checks, and role-based access control (RBAC) across customer, staff, and admin tiers.
5. **Session & Payment Integration Flow (IT-03, IT-04, ST-01, ST-05)**: Automated full end-to-end flow in `tests/paymentFlow.test.js` integrating slot check-in, duration calculation, mock payment processing, session completion, slot release, and customer history retrieval.

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
| **UT-02** | Parking Slot | Reject reservation of occupied slot | Slot exists with status `OCCUPIED` | Attempt reservation on occupied slot | `slotId = 'A-01'`, status `OCCUPIED` | Reservation rejected; slot remains `OCCUPIED` | Rejected with error | **Passed** |
| **UT-03** | Parking Slot | Check status of available slot | Slot exists with status `AVAILABLE` | Query slot availability | `slotId = 'A-01'` | Slot reports status `AVAILABLE` | Reports `AVAILABLE` | **Passed** |
| **UT-04a** | User Auth | Valid registration with primary vehicle | Registration endpoint available | `POST /api/auth/register` with valid payload | Name: "John", Email: "john@test.com", Pass: "pass123", Phone: "9876543210", Vehicle: "KA01AB1234" | HTTP 201 Created; returns sanitized user object and JWT | HTTP 201 Created; JWT returned | **Passed** |
| **UT-04b** | User Auth | Reject missing required fields | Registration endpoint available | `POST /api/auth/register` with missing email/phone | `{ name: "John", password: "123" }` | HTTP 400 Bad Request; validation errors array returned | HTTP 400 Bad Request; validation errors returned | **Passed** |
| **UT-04c** | User Auth | Reject invalid email syntax | Registration endpoint available | `POST /api/auth/register` with malformed email | `email = "not-an-email"` | HTTP 400 Bad Request; email validation message | HTTP 400 Bad Request; rejected | **Passed** |
| **UT-04d** | User Auth | Reject duplicate user email | User already exists in database | `POST /api/auth/register` with existing email | `email = "payment@example.com"` | HTTP 409 Conflict; account already exists message | HTTP 409 Conflict; message returned | **Passed** |
| **UT-05** | Parking Slot | Reserve available slot | Slot exists with status `AVAILABLE` | Request slot reservation | `slotId = 'A-01'` | Slot status changes from `AVAILABLE` to `OCCUPIED` | Status updated to `OCCUPIED` | **Passed** |
| **UT-06** | Vehicle Service | Register new vehicle | Customer authenticated with JWT | `POST /api/vehicles` with vehicle details | Vehicle: `KA05EF9999`, Type: `4-wheeler`, Model: `Hyundai i20` | HTTP 201 Created; vehicle stored and linked to user ID | HTTP 201 Created; vehicle created | **Passed** |
| **UT-07** | Vehicle Service | Reject duplicate vehicle registration | Vehicle already registered in system | `POST /api/vehicles` with existing registration number | `vehicleNumber = 'KA05EF9999'` | HTTP 409 Conflict; duplicate registration rejected | HTTP 409 Conflict; duplicate rejected | **Passed** |
| **UT-08** | Vehicle Service | Customer vehicle query isolation | Multiple users with registered vehicles | `GET /api/vehicles` with Customer A token | Customer A Bearer token | HTTP 200 OK; returns only Customer A vehicles (zero leakage of Customer B data) | HTTP 200 OK; strictly isolated | **Passed** |

---

### 2.2 Integration Tests (IT)

| Test Case ID | Module / Service | Description | Precondition | Execution Steps | Test Data | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IT-01** | QR & Reservation | Generate unique token for reservation | User authenticated; slot reserved | `POST /api/qr/generate` or session initiation | Valid reservation ID and vehicle ID | Unique signed QR payload generated with expiration timestamp | Token generated | **Passed** |
| **IT-02** | QR & Entry Validation | Reject invalid or expired QR code | Entry gate scanning active | `POST /api/entry/validate` with malformed token | Malformed string `invalid-qr-token` | HTTP 401 Unauthorized; entry denied; no session created | HTTP 401; entry denied | **Passed** |
| **IT-03** | Payment & Session | Process mock payment for parking fee | Session exists with calculated exit fee | `POST /api/payments` with session ID and amount | `sessionId = '...'`, `outcome = 'success'` | HTTP 201 Created; payment status recorded as `SUCCESS`; card numbers never stored | HTTP 201 Created; status `SUCCESS` | **Passed** |
| **IT-04** | Parking Session | Record vehicle entry and occupy slot | Valid user and available slot | `POST /api/sessions/entry` | `slotId = 'A-01'` | HTTP 201 Created; active session created; slot status set to `OCCUPIED` | HTTP 201 Created; slot occupied | **Passed** |

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

---

## 4. Requirements Traceability Matrix (Post-Sprint 2)

| Requirement ID | Specification Description | Source Code Location | Automated Test Suite | Test Execution Result |
| :--- | :--- | :--- | :--- | :--- |
| **FR-001** | User registration and login | `backend/src/controllers/authController.js` | `backend/tests/auth.test.js` | **Passed (18/18)** |
| **FR-002** | View available parking slots | `backend/src/models/ParkingSlot.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-006** | Slot occupancy on entry | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-007** | Record vehicle entry timestamp | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-009** | Dynamic fee calculation | `backend/src/services/feeCalculation.js` | `backend/tests/feeCalculation.test.js` | **Passed (7/7)** |
| **FR-010** | Mock payment processing | `backend/src/controllers/paymentController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-011** | Complete session and free slot | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **FR-013** | Customer parking history | `backend/src/controllers/sessionController.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **SEC-001** | bcrypt password hashing | `backend/src/models/User.js` | `backend/tests/auth.test.js` | **Passed** |
| **SEC-002** | Role-based access control (RBAC) | `backend/src/middleware/auth.js` | `backend/tests/authMiddleware.test.js` | **Passed (13/13)** |
| **SEC-003** | Input validation & sanitization | `backend/src/middleware/validators.js` | `backend/tests/auth.test.js`<br>`backend/tests/vehicle.test.js` | **Passed** |
| **SEC-004** | Token expiration enforcement | `backend/src/middleware/auth.js` | `backend/tests/authMiddleware.test.js` | **Passed** |
| **SEC-005** | Sensitive payment data protection | `backend/src/models/Payment.js` | `backend/tests/paymentFlow.test.js` | **Passed** |
| **B-010/B-011** | Vehicle registration & retrieval | `backend/src/controllers/vehicleController.js` | `backend/tests/vehicle.test.js` | **Passed (18/18)** |
