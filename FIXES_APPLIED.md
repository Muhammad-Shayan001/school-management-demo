# Fixes Applied — 19-20 July 2026

This build fixes the security and functional issues found during audit,
excluding WhatsApp/SMS integration (left as-is per request).

## Security

1. **Password hashing** — All passwords (admin, staff, student) are now
   hashed with bcrypt (`bcryptjs`). No plain-text passwords are stored or
   compared anywhere. New accounts get a random password, hashed on
   creation and returned exactly once in the creation API response.

2. **Real authentication** — Every `/api/*` route (except `/api/login`)
   now requires a valid session. Login creates a random session token,
   stored server-side and mirrored to an `httpOnly` cookie. No frontend
   changes were needed since the app is same-origin (cookies attach
   automatically). Sessions expire after 12 hours of inactivity.
   `/api/logout` invalidates the session.

3. `App.tsx` now re-fetches the database after a successful login (it
   previously only fetched once on page load, before authentication
   existed, which would have left the app blank post-login). It also
   detects an expired/invalid session (401) and returns the user to the
   login screen instead of showing a blank app.

## Functional Bugs

4. **Overpayment bug** — `/api/payments` now rejects any amount greater
   than the student's actual pending dues, with a clear error message.
   Previously the full amount was accepted and posted to the ledger even
   when it exceeded what was owed, silently inflating recorded revenue.

5. **Exam grading had no "Fail" tier** — grade formula updated to
   `80%+ A+, 70%+ A, 60%+ B, 40%+ C, below 40% Fail`. Fail is highlighted
   in red on the report view.

6. **No marks validation** — `/api/exam-results` now rejects negative
   marks and marks exceeding the total. The Marks Entry UI also caps the
   input fields and shows a toast if invalid values are submitted.

7. **Fee calculation was hardcoded/fragile** — previously a regex checked
   for "5" or "8" anywhere in the class name; every other class silently
   fell back to a flat Rs. 2,500. Replaced with a proper
   **Class Billing Rules** system (Settings → Class Billing Rules):
   admins can now set a real monthly fee per class. Resolution order is
   Student manual override → Class rule → Rs. 2,500 default. The same
   logic is now shared between new-student admission and bulk billing
   (previously they used two different, inconsistent formulas).

8. **Bulk Monthly Billing only worked for the current month** — the
   endpoint ignored any date passed to it. `/api/generate-bills` now
   accepts `month`/`year` and the Fee Management UI has a month/year
   selector, so bills can be generated for a specific past or future
   period.

9. Fixed a hardcoded date bug where every newly admitted student's first
   fee always said "April 2026" / "March 2026" regardless of the actual
   admission date — now uses the real current period.

## Dead / Non-functional UI (now wired up)

10. **Settings → "Launch Setup Wizard"** — previously did nothing. Now
    navigates to the first setup step (Classes tab).

11. **Settings → Class Billing Rules → "Add Custom Rule"** — previously
    had no handler at all. Now opens a real form (class + monthly fee),
    saves it via the new `/api/class-fee-overrides` endpoint, and lists /
    deletes existing rules.

12. **Utilities → PDF Generator (4 cards)** — Students List, Staff
    Directory, Fee Defaulters, and Financial Summary "Generate" buttons
    previously did nothing. All four now generate and download real PDFs
    built from live data.

## Explicitly Out of Scope (per request)

- WhatsApp / SMS sending remains simulated — no gateway (Twilio / Meta)
  is connected.
- Data still lives in memory and resets on server restart. The
  PostgreSQL/Supabase schema (`sql/schema.postgres.sql`) and Supabase
  push/pull tools in Settings are ready to use if you want persistent
  storage — this was not part of the agreed fix list.

## How to Run

```
npm install
npm run dev
```

Demo login (unchanged): `rana@school.com` / `admin123`
