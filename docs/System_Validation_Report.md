# System Validation Report

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
**Document Version**: 1.0  

---

## 1. System Validation Overview

This System Validation Report details the end-to-end verification of the QR-Based Vehicle Parking System across its integrated functional, non-functional, and security requirements. Testing was performed using automated integration suites, API contract validation, and full-stack operational scenarios in a containerized environment.

---

## 2. End-to-End Workflow Validation (ST-01)

The complete customer parking journey from account onboarding to parking session finalization was verified as an integrated workflow:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    actor Attendant as Staff / Gate
    participant Gateway as Express API
    participant Auth as Auth / RBAC
    participant Session as Session Service
    participant Fee as Fee Engine
    participant Payment as Payment Gateway
    participant DB as MongoDB

    Note over Customer,DB: Step 1: User Onboarding & Vehicle Registration
    Customer->>Gateway: POST /api/auth/register (Name, Email, Pass, Phone, Vehicle)
    Gateway->>DB: Store hashed password (bcrypt) & primary vehicle
    Gateway-->>Customer: HTTP 201 Created (JWT Token + User Profile)

    Note over Customer,DB: Step 2: Slot Allocation & Gate Entry
    Attendant->>Gateway: POST /api/sessions/entry (Bearer Token, Slot: A-01)
    Gateway->>Session: Record entry timestamp & occupy slot
    Session->>DB: Update Slot A-01 status = OCCUPIED
    Gateway-->>Attendant: HTTP 201 Created (Active Session #671...)

    Note over Customer,DB: Step 3: Vehicle Exit & Fee Calculation
    Attendant->>Gateway: POST /api/sessions/exit (Session ID)
    Gateway->>Fee: Compute duration & apply rate rules
    Fee-->>Gateway: Fee calculated (₹60 for 61 mins)
    Gateway-->>Attendant: HTTP 200 OK (Exit summary with calculated fee)

    Note over Customer,DB: Step 4: Payment Processing & Session Finalization
    Customer->>Gateway: POST /api/payments (Session ID, Outcome: success)
    Gateway->>Payment: Validate amount & generate transaction reference
    Payment->>DB: Record Payment (Status: SUCCESS; zero card data saved)
    Gateway->>Session: Complete session & release slot
    Session->>DB: Set Session = COMPLETED; Slot A-01 = AVAILABLE
    Gateway-->>Customer: HTTP 200 OK (Payment confirmation & released slot)

    Note over Customer,DB: Step 5: Audit & Parking History
    Customer->>Gateway: GET /api/history (Bearer Token)
    Gateway->>DB: Query customer sessions & payments
    Gateway-->>Customer: HTTP 200 OK (Isolated personal parking history)
```

### Validation Evidence Table

| Step | Operation | Request Endpoint | Input Parameters | Verification Assertion | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Registration | `POST /api/auth/register` | Name, Email, Password, Phone, Vehicle | User record created; password hashed; JWT token generated | **Passed** |
| **2** | Vehicle Registration | `POST /api/vehicles` | Vehicle number, type, model | Vehicle saved and linked to caller; duplicate plates rejected | **Passed** |
| **3** | Vehicle Check-in | `POST /api/sessions/entry` | `slotId: 'A-01'` | Session created with active status; slot marked `OCCUPIED` | **Passed** |
| **4** | Vehicle Check-out | `POST /api/sessions/exit` | `sessionId: '...'` | Exit timestamp recorded; parking fee computed accurately | **Passed** |
| **5** | Payment Processing | `POST /api/payments` | `sessionId`, `outcome: 'success'` | Payment recorded as `SUCCESS`; no plain card details stored | **Passed** |
| **6** | Session Completion | `POST /api/sessions/:id/complete`| `sessionId` | Session status becomes `COMPLETED`; slot reverts to `AVAILABLE` | **Passed** |
| **7** | History Retrieval | `GET /api/history` | Authenticated Bearer token | Returns only caller's completed sessions and payment receipts | **Passed** |

---

## 3. Security Validation & Access Control (ST-02, SEC-001 - SEC-006)

### 3.1 Role-Based Access Control (RBAC) Isolation
- **Customer Role**: Restricted to registering personal vehicles, creating personal reservations, querying personal vehicle lists, and viewing personal history. Requests to administrative endpoints (such as rate updates or system logs) return **HTTP 403 Forbidden**.
- **Staff Role**: Permitted to validate check-in and check-out at gate terminals (`POST /api/sessions/entry`, `POST /api/sessions/exit`).
- **Admin Role**: Full system configuration access including rate adjustments, slot management, and operational transaction auditing.

### 3.2 Security Validation Results

| Security Control | Specification | Implementation | Validation Method | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Password Hashing | `bcryptjs` with salt factor 10 | Direct database record inspection; raw password comparison test | **Passed** |
| **SEC-002** | Role Enforcement | JWT role payload verified via `authorize(...roles)` | Automated negative test requesting admin routes with customer token (HTTP 403) | **Passed** |
| **SEC-003** | Input Sanitization | `express-validator` middleware rules | Negative testing with malformed emails, SQL/NoSQL tokens, and invalid types | **Passed** |
| **SEC-004** | Token Expiry | JWT signed with `JWT_EXPIRES_IN` | Injected expired JWT token into protected route; intercepted with HTTP 401 | **Passed** |
| **SEC-005** | Sensitive Payment Data | Zero PCI data stored | Database schema validation confirming only transaction reference and amount saved | **Passed** |
| **SEC-006** | Security Event Logging | Persistent collection `security_events` | Automated test verifying failed logins and RBAC denials logged without passwords | **Passed** |
| **SEC-007** | QR Token Security | Cryptographic UUIDs & 15m expiration | Unique index validation & expiration boundary checks in `qrToken.test.js` | **Passed** |

---

## 4. Non-Functional Requirements (NFR) Validation

### NFR-001: Performance & Response Time
- **Criterion**: Key endpoints respond within 2 seconds under normal test load.
- **Result**: Automated test execution across all 11 test suites (92 tests) completed in **28.39 seconds** total (average response time under **80ms** per REST API call).

### NFR-002: System Availability & Liveness
- **Criterion**: System maintains operational uptime and reports health status.
- **Result**: Verified via `health.test.js` and `dbConnection.test.js`. Health endpoint (`GET /health`) returns liveness status and connection state. Database layer implements exponential backoff retry logic (up to 5 attempts) to recover from transient disconnections.

### NFR-004: QR Code Integrity & Expiration
- **Criterion**: QR tokens must be globally unique and expire within 15 minutes of generation.
- **Result**: Verified in `qrToken.test.js`. Each session generates a distinct cryptographic UUID with `validUntil` timestamp set to 15 minutes in the future; expired or duplicate tokens are rejected.

### NFR-006: Maintainability & Architectural Modularity
- **Criterion**: Decoupled components capable of independent modification.
- **Result**: Presentation (React 19 Vite), API Controllers, Services (Fee Calculation, JWT Auth), and Storage (Mongoose Models) are decoupled into distinct layers. Changes to UI styling or controller logic do not impact underlying domain models.

---

## 5. Conclusion

The Vehicle Parking System satisfies all functional requirements (FR-001, FR-002, FR-006, FR-007, FR-009, FR-010, FR-011, FR-013) and security criteria (SEC-001 to SEC-005) established in Deliverable 2 and Deliverable 3. All automated system verification tests passed with 100% compliance.
