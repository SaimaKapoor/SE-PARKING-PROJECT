# Unit Test Report

**PES University, Bangalore**  
**Department of Computer Science and Engineering**  
**Course**: UE24CS341A - Software Engineering (Level 3 Mini-Project)  
**Project**: Vehicle Parking System  
**Group Number**: 10  
**Test Framework**: Jest (v29) with Supertest & MongoDB In-Memory Server  
**Execution Environment**: Node.js v20.x, Windows / Ubuntu (CI)  
**Date of Execution**: November 2026  

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Test Suites** | 5 passed, 5 total (100%) |
| **Total Tests** | 57 passed, 57 total (100%) |
| **Failed Tests** | 0 |
| **Skipped Tests** | 0 |
| **Execution Duration** | 14.97 seconds (in-band run) |
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

## 3. Test Execution Command

To reproduce this unit test execution locally or in CI:
```bash
cd backend
npm test
```
Outputs in-band Jest execution logs with zero configuration dependencies.
