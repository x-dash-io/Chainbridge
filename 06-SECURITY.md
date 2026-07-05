# Chainbridge Ecosystem — Security Requirements

Point the `security-review` skill at this document plus the API contracts
doc before every merge that touches auth, payments, or role checks.

## 1. Authentication
- Passwords hashed via Supabase Auth (never store/roll your own hashing)
- Session tokens httpOnly, not accessible to client JS
- Role stored server-side; never trust a role value sent from the client

## 2. Authorization
- Every server action re-checks the actor's role/ownership server-side,
  even if the UI already hides the action for other roles (see
  04-API-CONTRACTS.md §3 for the full matrix)
- `transitionLeg` must verify `actorUserId === orderLegs.assignedUserId`
  OR actor is admin — check this inside the action, not just at the route
  layer

## 3. M-Pesa Integration (highest-risk surface)
- `/api/mpesa/callback` must verify the request is genuinely from Daraja
  before trusting `ResultCode` — validate against your registered
  callback validation mechanism, do not process on payload shape alone
- Never trust `CallbackMetadata` amount blindly — cross-check against the
  `orders.total_amount` you initiated the STK push for; mismatch = flag,
  don't auto-complete
- Daraja consumer key/secret live in server env vars only, never in a
  client bundle or committed to the repo
- Idempotency: a replayed/duplicate callback must not create duplicate
  `payouts` rows — key the write on `CheckoutRequestID`

## 4. Data Protection
- No PII (phone numbers, ID numbers if collected) returned in any
  API/action response to a user who isn't the owner or admin
- Product images: validate MIME type server-side on upload, not just file
  extension (this exact gap was found and patched on TrustBridge EA —
  don't reintroduce it)

## 5. Rate Limiting
- STK push initiation: limit per user (e.g. 5/hour) to prevent abuse of
  the sandbox and spam SMS-like prompts to a real phone number
- Login attempts: standard lockout/backoff

## 6. Pre-Defense Security Checklist
- [ ] No `.env` or secrets committed to git history
- [ ] `security-review` skill run against `/api/mpesa/*` and all
      `lib/orders/*` server actions
- [ ] Role-check present in every mutating server action (audit against
      04-API-CONTRACTS.md §3 table)
- [ ] Callback idempotency verified with a manual duplicate-request test
