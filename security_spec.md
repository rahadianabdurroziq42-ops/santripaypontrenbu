# Security Specification for SantriPay Syariah Firestore

## 1. Data Invariants
- **Santri**: Document ID must be a valid alphanumeric ID (`^[a-zA-Z0-9_-]+$`, max 128 chars). Required fields: `id`, `nisn`, `accountNumber`, `name`, `balance`, `status`. Balance must be a non-negative number (`balance >= 0`).
- **Transaction**: Document ID must be a valid ID. Required fields: `id`, `transactionNo`, `date`, `santriId`, `type`, `amount`, `balanceAfter`. Transactions cannot be deleted or mutated after creation (immutable financial audit trail). Amount must be positive (`amount > 0`).
- **PesantrenProfile**: Stored under `/settings/profile` or `/settings/{settingId}`. Required fields: `name`, `formalName`. Only authenticated users can update settings.
- **Global Invariant**: Default deny catch-all `match /{document=**} { allow read, write: if false; }`. Writes require authentication with verified email.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/santri/{santriId}`.
2. Unauthenticated write to `/transactions/{transactionId}`.
3. Update or deletion of an existing transaction in `/transactions/{transactionId}` (financial audit trail is append-only).
4. Creation of a transaction with negative or zero amount (`amount <= 0`).
5. Creation of a santri with negative balance (`balance < 0`).
6. Creation of a santri with an ID injection attack (> 128 characters or special forbidden chars).
7. Creation of a santri with extra unauthorized ghost fields (violating strict keys).
8. Modification of a santri with arbitrary untrusted keys (violating `affectedKeys().hasOnly(...)`).
9. Unauthenticated write to `/settings/{settingId}`.
10. Anonymous unverified user trying to mutate data without `request.auth.token.email_verified == true`.
11. Creation of a transaction with mismatched balance arithmetic or missing required audit keys.
12. Attempt to bypass master gate default-deny on undefined paths like `/admin_secrets/{id}`.

## 3. Security Test Runner (Reference Specification)
- Test 1: Deny unauthenticated read/write to `/santri/santri-1`
- Test 2: Deny unauthenticated write to `/transactions/trx-1`
- Test 3: Deny `delete` on `/transactions/trx-1`
- Test 4: Deny `update` on `/transactions/trx-1`
- Test 5: Deny transaction with amount = -5000
- Test 6: Deny santri with balance = -10000
- Test 7: Deny document ID containing path traversal `../../evil`
- Test 8: Deny document creation with injection ghost field `__admin_override`
- Test 9: Deny setting write without auth
- Test 10: Deny write when email_verified is false
- Test 11: Deny unauthorized collection creation
- Test 12: Deny arbitrary field update on santri without valid keys
