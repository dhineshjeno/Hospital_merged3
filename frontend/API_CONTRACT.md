# API Contract — Hospital Management System

Living document. Add new endpoints here as features are built. Both frontend
and backend must match these shapes exactly — if something needs to change,
update this file first, then tell the team.

## Conventions

* All request/response bodies are JSON.
* All fields are camelCase (e.g. `hospitalId`, not `hospital_id`).
* Auth token is sent as a header: `Authorization: Bearer <token>`
* Error format (any failed request):
  `{ "message": "Human-readable error description" }`

---

## Auth

### POST /api/auth/login

Request:

```json
{
  "email": "doctor@hospital.com",
  "password": "test123"
}
```

Response (200):

```json
{
  "token": "string",
  "user": {
    "id": 1,
    "name": "Dr. Asha Mehta",
    "email": "doctor@hospital.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```
Note: `user.patientId` is present only for accounts with role "patient" and links the login to a patient record.

Response (401):

```json
{
  "message": "Invalid credentials"
}
```

### GET /api/auth/me

Headers:

```
Authorization: Bearer <token>
```

Response (200):

```json
{
  "user": {
    "id": 1,
    "name": "Dr. Asha Mehta",
    "email": "doctor@hospital.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```

### POST /api/auth/logout

Response (200):

```json
{
  "message": "Logged out"
}
```

---

## Patients

### GET /api/patients

Response (200)

```json
{
  "patients": [
    {
      "id": 1,
      "name": "Ravi Kumar",
      "age": 45,
      "gender": "male",
      "phone": "9876543210",
      "bloodGroup": "O+",
      "address": "Chennai",
      "status": "admitted",
      "hospitalId": 1
    }
  ]
}
```

### GET /api/patients/:id

Response (200)

```json
{
  "patient": {
    "id": 1,
    "name": "Ravi Kumar",
    "age": 45,
    "gender": "male",
    "phone": "9876543210",
    "bloodGroup": "O+",
    "address": "Chennai",
    "status": "admitted",
    "hospitalId": 1
  }
}
```

Response (404)

```json
{
  "message": "Patient not found"
}
```

### POST /api/patients

Request

```json
{
  "name": "string",
  "age": 0,
  "gender": "male|female|other",
  "phone": "string",
  "bloodGroup": "string",
  "address": "string",
  "status": "admitted|discharged|outpatient"
}
```

Response (201)

```json
{
  "patient": {
    "id": 3,
    "name": "string",
    "age": 0,
    "gender": "male|female|other",
    "phone": "string",
    "bloodGroup": "string",
    "address": "string",
    "status": "admitted|discharged|outpatient",
    "hospitalId": 1
  }
}
```

### PUT /api/patients/:id

Request: same shape as POST

Response (200)

```json
{
  "patient": {
    "...updated patient object"
  }
}
```

Response (404)

```json
{
  "message": "Patient not found"
}
```

### DELETE /api/patients/:id

Response (200)

```json
{
  "message": "Patient deleted"
}
```

Response (404)

```json
{
  "message": "Patient not found"
}
```
Patient now includes:

isActive: boolean (default true)

DELETE /api/patients/:id performs a soft delete by setting isActive = false.

Patients are never permanently removed.

A patient can be reactivated by:

PUT /api/patients/:id

{
  "isActive": true
}

---

## Doctors

### GET /api/doctors

Response (200)

```json
{
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Asha Mehta",
      "specialty": "Cardiology",
      "phone": "9876512345",
      "email": "asha.mehta@hospital.com",
      "experience": 12,
      "status": "available",
      "hospitalId": 1
    }
  ]
}
```

### GET /api/doctors/:id

Response (200)

```json
{
  "doctor": {
    "...same shape"
  }
}
```

Response (404)

```json
{
  "message": "Doctor not found"
}
```

### POST /api/doctors

Request

```json
{
  "name": "string",
  "specialty": "string",
  "phone": "string",
  "email": "string",
  "experience": 0,
  "status": "available|on-leave|in-surgery"
}
```

Response (201)

```json
{
  "doctor": {
    "...same shape with generated id"
  }
}
```

### PUT /api/doctors/:id

Request: same shape as POST

Response (200)

```json
{
  "doctor": {
    "...updated doctor object"
  }
}
```

Response (404)

```json
{
  "message": "Doctor not found"
}
```

### DELETE /api/doctors/:id

Response (200)

```json
{
  "message": "Doctor deleted"
}
```

Response (404)

```json
{
  "message": "Doctor not found"
}
```

---

## Appointments

### GET /api/appointments

Response (200)

```json
{
  "appointments": [
    {
      "id": 1,
      "patientId": 1,
      "patientName": "Ravi Kumar",
      "doctorId": 1,
      "doctorName": "Dr. Asha Mehta",
      "date": "2026-06-25",
      "time": "10:30",
      "reason": "Chest pain follow-up",
      "status": "scheduled",
      "hospitalId": 1
    }
  ]
}
```

### GET /api/appointments/:id

Response (200)

```json
{
  "appointment": {
    "...same shape"
  }
}
```

Response (404)

```json
{
  "message": "Appointment not found"
}
```

### POST /api/appointments

Request

```json
{
  "patientId": 0,
  "doctorId": 0,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "reason": "string",
  "status": "scheduled|completed|cancelled"
}
```

Response (201)

```json
{
  "appointment": {
    "...same shape with generated id"
  }
}
```

### PUT /api/appointments/:id

Request: same shape as POST

Response (200)

```json
{
  "appointment": {
    "...updated appointment object"
  }
}
```

Response (404)

```json
{
  "message": "Appointment not found"
}
```

### DELETE /api/appointments/:id

Response (200)

```json
{
  "message": "Appointment deleted"
}
```
## Queue

### GET /api/queue
Response (200):
{ "queue": [ { "id": 1, "tokenNumber": 1, "patientName": "Lakshmi Narayan", "priority": "normal", "status": "waiting", "checkedInAt": "2026-06-23T09:12:00.000Z", "hospitalId": 1 } ] }

### POST /api/queue
Request: { "patientName": "string", "priority": "normal|emergency" }
Response (201): { "entry": { ...same shape, with generated id, tokenNumber, status "waiting" } }

### PUT /api/queue/:id
Request: { "status": "waiting|called|completed" }
Response (200): { "entry": { ...updated } }
Response (404): { "message": "Queue entry not found" }

## Hospitals
### GET /api/hospitals
Response (200): { "hospitals": [ { "id": 1, "name": "City General Hospital" } ] }

## Auth (additions)
### POST /api/auth/register
Request: { "name", "email", "password", "phone", "age", "gender", "bloodGroup", "address" }
Response (201): { "token", "user" } — same shape as login, role always "patient"

### POST /api/auth/forgot-password
Request: { "email" } → Response (200): { "message": "OTP sent" }

### POST /api/auth/verify-otp
Request: { "email", "otp" } → Response (200/401)

### POST /api/auth/reset-password
Request: { "email", "otp", "newPassword" } → Response (200/401)

### Appointment (additions — sent via partial PUT)
chiefComplaint?: string
diagnosis?: string
vitals?: { bp, temperature, weight, oxygen }
prescriptions?: [{ medicine, dosage, frequency }]

Note: PUT /api/appointments/:id is a partial merge — sending only the changed
fields preserves everything else already stored. The real backend should
match this behavior (PATCH semantics), not require the full object every time.

## Lab Results
### GET /api/lab-results
Optional query: ?patientId=1
Response (200): { "labResults": [ { id, patientId, patientName, doctorName, testName, date, status, value, unit, referenceRange, isAbnormal, hospitalId } ] }

### GET /api/lab-results/:id
Response (200): { "labResult": {...} }
Response (404): { "message": "Lab result not found" }

## Pharmacy
### GET /api/pharmacy-stock
Response (200): { "stock": [ { id, medicineName, category, quantity, unit, reorderLevel, status, hospitalId } ] }

## Billing
### GET /api/invoices
Optional query: ?patientId=1
Response (200): { "invoices": [ { id, patientId, patientName, appointmentId, date, items: [{description, amount}], totalAmount, status, hospitalId } ] }

### GET /api/invoices/:id
Response (200): { "invoice": {...} }
Response (404): { "message": "Invoice not found" }

## Admin
### PUT /api/hospitals/:id — update name/timings
### GET /api/users, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id — staff accounts
### GET /api/roles, POST /api/roles — custom roles (storage only; enforcement is backend RBAC work, P2-06)
### GET /api/audit-logs — currently logs login events only; full coverage needs P2-09 middleware

Response (404)

```json
{
  "message": "Appointment not found"
}
```

---

## Coming soon (add as we build)

* /api/patients
* /api/doctors
* /api/appointments
