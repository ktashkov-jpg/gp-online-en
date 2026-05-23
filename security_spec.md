# Security Specification

## Data Invariants
1. A Doctor profile must be owned by the authenticated user with matching UID.
2. A Patient profile must be owned by the authenticated user with matching UID.
3. Appointments can only be created by Patients.
4. Appointments must have a valid doctorId and patientId.
5. Only the patient or the doctor of an appointment can read it.
6. Only the doctor can confirm/cancel an appointment.
7. Only the patient can book or cancel their own appointment.

## The Dirty Dozen Payloads

1. **Identity Spoofing (Doctor)**: Create a doctor profile with `uid` matching another user.
2. **Identity Spoofing (Patient)**: Create a patient profile with `uid` matching another user.
3. **Ghost Field Injection**: Add `isAdmin: true` to a patient profile.
4. **State Shortcutting**: Create an appointment with `status: 'confirmed'`.
5. **Privilege Escalation**: Update an appointment's status as a patient.
6. **Orphaned Appointment**: Create an appointment with a non-existent `doctorId`.
7. **Resource Poisoning**: Inject a 1MB string into the `reason` field.
8. **Unauthorized Read**: Read another patient's profile.
9. **Unauthorized List**: List all appointments in the system.
10. **ID Poisoning**: Use a 2KB string as a document ID for an appointment.
11. **PII Leak**: Read a patient's PII without being their assigned doctor.
12. **Temporal Attack**: Set `createdAt` to a future date in the past.

## Test Runner
(See firestore.rules.test.ts for implementation)
