# Order-completion reward credit — implementation plan

Give the brand a fixed reward credit (default ₹50) every time an order completes
successfully. The reward is **spendable at checkout but never refundable**, so it
needs its own bucket inside the existing Credits wallet rather than a new wallet.

Status: **implemented**. This document is the design record; the sections below
describe what shipped. Trigger point (`ACCEPTED`) and the free-order exclusion
were confirmed before coding.

---

## 1. Requirements (as agreed)

| # | Requirement | How it is met |
|---|---|---|
| 1 | ₹50 to the brand on successful order completion | New `ORDER_COMPLETION_CREDIT` wallet movement, written when the order moves to `ACCEPTED` |
| 2 | Env-configurable — can be switched off any time | `ORDER_COMPLETION_CREDIT_ENABLED` |
| 3 | Amount changeable any time | `ORDER_COMPLETION_CREDIT_PAISE` (paise, default `5000`) |
| 4 | No backfill for existing orders | Award happens only in the accept path, going forward. No backfill script. |
| 5 | Brand can spend it, cannot refund it | New non-withdrawable `promoPaise` sub-bucket of the wallet balance |
| 6 | Shown separately in the brand Credits section, alongside the total | Balance API returns `promoPaise` / `refundablePaise`; hero card + ledger show the split |
| 7 | Admin tracks the ₹50 on each completed order | New line on the admin order detail, new column in the admin Credits list, new ledger row type |

---

## 2. Money model — why a sub-bucket, not a second wallet

Today `BrandWallet` has:

- `balancePaise` — total credit, always equal to the sum of the `WalletTransaction` ledger
- `heldPaise` — portion locked by a pending withdrawal request
- spendable at checkout = `balance − held`

A reward credit is spendable exactly like ordinary credit, so it belongs in
`balancePaise`. The only difference is that it may not leave as money. That is
one more number, not one more wallet:

```
promoPaise       = non-refundable portion of balancePaise   (NEW)
spendable        = balancePaise − heldPaise                  (unchanged)
refundable       = balancePaise − heldPaise − promoPaise     (NEW — caps withdrawals)
invariant        : heldPaise + promoPaise <= balancePaise
```

A second wallet would mean splitting every checkout debit, every reversal and
every admin screen across two balances — far more surface for a money bug.

### Spend order: promo first

A checkout debit consumes `promoPaise` before refundable credit. Two reasons:
the brand's refundable money stays refundable for as long as possible, and the
platform's liability drains first. Formally, for a debit of `A`:

```
promo' = max(0, promo − A)
balance' = balance − A        (after the usual spendable check)
```

Both invariants survive this (proof is trivial in each of the two branches, and
the DB CHECK constraints below are the backstop).

### Returning credit that was spent from the promo bucket

If ₹50 of promo credit pays for an order and that order is later reversed
(`CHECKOUT_REVERSAL_CREDIT` on abandon / payment failure) or cancelled
(`ORDER_CANCELLATION_CREDIT`), the money must come back **as promo**. Otherwise
there is a trivial cash-out loop: spend the reward, cancel the order, withdraw
the proceeds.

So `WalletTransaction` gets a signed `promoPaise` column (the row's effect on
the promo bucket), and the return paths compute:

```
promoToRestore = min(net promo spent on this order, amountBeingCredited)
```

where "promo spent on this order" sums the order's promo deltas **excluding the
reward grant itself**. That exclusion is load-bearing: the reward an order earns
on completion carries that same `orderId` and a positive promo delta, so counting
it would cancel out the promo the order spent at checkout and the return would
hand the money back as refundable cash — the very loophole this closes. One order
really can hold both rows, because a dispute may be opened after acceptance, so an
admin reject can credit an order that was already rewarded.

The ledger stays the single source of truth for both numbers.

---

## 3. Server changes

### 3.1 Schema + migration

`prisma/schema.prisma`:

```prisma
enum WalletTransactionType {
  ...
  /// Reward credit granted when an order completed successfully. Spendable at
  /// checkout, never withdrawable.
  ORDER_COMPLETION_CREDIT
}

model BrandWallet {
  ...
  /// Portion of balancePaise that is reward credit: spendable at checkout but
  /// never withdrawable. Refundable = balancePaise - heldPaise - promoPaise.
  promoPaise Int @default(0)
}

model WalletTransaction {
  ...
  /// This row's signed effect on the wallet's non-withdrawable promo bucket.
  /// 0 for ordinary movements.
  promoPaise Int @default(0)
}
```

**Two** migrations, and the split is required rather than cosmetic.

`20261008120000_wallet_promo_credit`:

```sql
ALTER TYPE "WalletTransactionType" ADD VALUE 'ORDER_COMPLETION_CREDIT';
ALTER TABLE "BrandWallet"       ADD COLUMN "promoPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WalletTransaction" ADD COLUMN "promoPaise" INTEGER NOT NULL DEFAULT 0;

-- Same defence-in-depth as heldPaise (see 20260924120000_wallet_hold_model).
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_promoPaise_nonnegative"
  CHECK ("promoPaise" >= 0);
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_held_plus_promo_not_exceed_balance"
  CHECK ("heldPaise" + "promoPaise" <= "balancePaise");
```

`20261008130000_wallet_promo_credit_index`:

```sql
-- One completion credit per order, enforced by the database, so a retry or a
-- double accept can never pay twice. Partial index: other types repeat per order.
CREATE UNIQUE INDEX "WalletTransaction_one_completion_credit_per_order"
  ON "WalletTransaction" ("orderId")
  WHERE "type" = 'ORDER_COMPLETION_CREDIT';
```

Postgres refuses to USE a new enum value in the transaction that added it
(`55P04: unsafe use of new value ... New enum values must be committed before they
can be used`), and the index's `WHERE` clause uses it. Prisma runs each migration
file in its own transaction, so the index must live in a later file. Shipping
both in one migration fails on apply.

No backfill script — requirement 4.

### 3.2 `WalletService` (`src/wallet/wallet.service.ts`)

- `WalletAmounts` becomes `{ balancePaise, heldPaise, promoPaise }`; `applyWalletMutation` carries and compare-and-sets the third field too, and rejects any result violating `held + promo <= balance`.
- `CREDIT_TYPES` gains `ORDER_COMPLETION_CREDIT`.
- `credit()` takes an optional `promo?: boolean`; when set, `promo += amount` and the ledger row records `promoPaise = +amount`.
- `debit()` drains promo first (`promo' = max(0, promo − amount)`) and records `promoPaise = −(promo − promo')` on the row.
- `creditOrderCompletion({ brandId, agencyId, orderId, amountPaise })` — thin helper, `promo: true`.
- `releaseCheckoutReservation()` and `creditOrderCancellation()` restore the promo portion: read `SUM(promoPaise)` over the order's rows, restore `min(−thatSum, amountPaise)` as promo.
- `requestWithdrawal()` checks against **refundable**, not spendable, with a clear message: `"₹X of your credits are reward credits and can't be refunded."`
- `getBalance()` returns `promoPaise` and `refundablePaise` alongside the existing fields (nothing removed — existing callers keep working).
- `listBrandCreditsForAdmin()` raw SQL: select `COALESCE(w."promoPaise", 0)` and add it to the totals query.
- `adminAdjust()` stays refundable-only (an admin top-up is real credit); a later "grant reward credit" admin action can reuse `credit({ promo: true })` if wanted.

### 3.3 Awarding the credit (`src/orders/orders.service.ts`)

In `acceptDelivery()` — the single transition to `ACCEPTED`, and already the
point where `order-completed-for-brand` fires — wrap the status update and the
award in one transaction so the credit can never be lost after the order flips:

```ts
await this.prisma.$transaction(async (tx) => {
  await this.updateOrder(
    { where: { id: order.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } },
    tx,
  );
  await this.completionCredit.awardIfEligible(order, tx); // no-op when disabled
});
```

Eligibility (all must hold):

1. `ORDER_COMPLETION_CREDIT_ENABLED === 'true'`
2. configured amount > 0
3. the order has a brand or agency owner
4. `expectedAmountPaise > 0` and `isFreeOrder === false` — a ₹0 promo order should
   not mint ₹50 of credit *(decision point — see §7)*

The DB unique index makes a double award impossible; `acceptDelivery` already
early-returns when `acceptedAt` is set, so this is belt and braces.

`updateOrder` is already `(args, tx?)`-shaped (see the cancellation path), so no
signature changes are needed.

### 3.4 Config (`src/config/env.validation.ts`)

```ts
/** Reward credit granted to the brand when an order completes. */
ORDER_COMPLETION_CREDIT_ENABLED: Joi.string().valid('true', 'false').optional().default('false'),
/** Reward amount in paise. 5000 = ₹50. */
ORDER_COMPLETION_CREDIT_PAISE: Joi.number().integer().min(0).optional().default(5000),
```

Read through `ConfigService` at award time (same pattern as
`PHONE_OTP_ENABLED` in `phone-verification.service.ts`), so flipping the flag or
the amount is an env change + restart — no deploy, no code change. Default is
`false` so the feature is switched on deliberately; set
`ORDER_COMPLETION_CREDIT_ENABLED=true` in the deployed environment to turn it on.
Document both in `server/README.md` and the root `README.md` env tables.

### 3.5 DTOs

- `WalletBalanceDto`: `+ promoPaise`, `+ refundablePaise`.
- `WalletTransactionDto`: `+ promoPaise` (lets the UI tag a row "non-refundable").
- `AdminBrandCreditDto` / `AdminBrandCreditsPageDto`: `+ promoPaise`, `+ refundablePaise`, `+ totalPromoPaise`.
- `src/orders/dto/order-details-admin.dto.ts`: `+ completionCredit: { amountPaise, creditedAt } | null`, resolved in the admin order-details read from the order's `ORDER_COMPLETION_CREDIT` wallet transaction.

---

## 4. Brand-facing UI (`client/app/brand/(dashboard)/credits/page.tsx`)

The agency page re-exports this one, so both get it from a single change.

- **Hero card** — keep "Available credits" as the headline (what they can spend),
  and add the split underneath the existing chips:
  - `₹X reward credits · not refundable` (Gift icon)
  - `₹Y refundable` (Landmark icon)
- **Withdraw / refund form** — max becomes `refundablePaise`, not `availablePaise`:
  label, `max`, the "Refund the full amount" switch, the over-limit error and the
  client-side `canSubmit` guard all read the refundable number, with one line of
  copy: *"Reward credits earned on completed orders can be spent on new orders but
  cannot be refunded."* The button is disabled when `refundablePaise <= 0` even if
  the brand holds reward credit.
- **Ledger rows** — `walletTransactionLabel()` gains
  `ORDER_COMPLETION_CREDIT → "Order completed — reward credit"`, `txnVisual()`
  gives it the Gift icon as a credit, and any row with `promoPaise > 0` renders a
  small "Non-refundable" tag.
- **Types** (`client/features/wallet/types.ts`) — add the new union member and the
  new balance/transaction fields; add `AdminBrandCredit.promoPaise` /
  `refundablePaise`.
- The "credited all-time" chip keeps counting cancellation + admin credits and
  gains completion credits.

---

## 5. Admin-facing tracking

1. **Order detail** (`client/app/admin/orderManagement/[id]/page.tsx`) — in the
   pricing/settlement card, a row under the existing credit lines:
   `Completion reward credited to brand — ₹50 · <date>`, rendered only when the
   new `completionCredit` field is present. This is the per-order proof the ₹50
   went out.
2. **Credits list** (`client/app/admin/refunds/page.tsx`) — a "Reward (non-refundable)"
   column between *Held* and *Available*, and the footer totals gain
   `totalPromoPaise`, so an admin can see platform-wide reward liability at a
   glance. *Available* keeps its meaning (spendable) and gets a
   `refundable ₹Y` sub-line.
3. **Per-brand ledger drawer** — already lists `WalletTransaction` rows, so the new
   type shows up as soon as the label/icon mapping lands; each reward row links to
   its order via the existing `orderId`.
4. **Admin order list** (`client/components/admin/OrderRow.tsx`) — no change; the
   detail page is the right depth for this.

---

## 6. Tests

- `src/wallet/wallet.service.spec.ts`
  - a completion credit raises both `balancePaise` and `promoPaise`
  - a checkout debit drains promo before refundable credit, and records the split on the ledger row
  - `requestWithdrawal` rejects an amount above `refundable` even when it is below `spendable`
  - checkout reversal and order cancellation restore the promo portion as promo
  - `held + promo <= balance` holds across a concurrent-mutation retry
- `src/orders/orders.completion-credit.spec.ts` (new)
  - accept → ₹50 credited, one ledger row, correct type
  - flag `false` → no credit; amount `0` → no credit; custom amount honoured
  - accepting twice credits once
  - free / ₹0 order → no credit
- `src/wallet/admin-brand-credits.spec.ts` — the new columns and totals.
- Full `pnpm test` + `pnpm lint` + `pnpm build` on the server, `pnpm lint`/`build` on the client.

---

## 7. Decisions

Settled before coding:

1. **Trigger point** — the reward is awarded at `ACCEPTED` (brand accepts the
   delivery; where `order-completed-for-brand` already fires), not at
   `CREATOR_PAYMENT_DONE`. **Confirmed.**
2. **Free / ₹0 orders** — excluded, so a free order cannot mint credit.
   **Confirmed.**

Deliberately left out, easy to add later:

3. **Fully credit-funded orders** — an order paid entirely from credits still earns
   the reward. That is a slow bleed only if a brand loops reward credit into new
   orders, and each loop still consumes real value.
4. **Per-brand cap** — none. If one is wanted later (e.g. max ₹N of reward credit
   per brand per month), it is a third env var and a count query in
   `resolveOrderCompletionCreditPaise`.
5. **Expiry** — reward credits never expire. Adding expiry means dated promo lots,
   a materially bigger change.
6. **Notification** — brands are not emailed about the reward; it appears in
   Credits. The existing `order-completed-for-brand` template could mention it.

---

## 8. Rollout

1. Merge with `ORDER_COMPLETION_CREDIT_ENABLED` unset (feature dormant, schema live).
2. Run the migration.
3. Set `ORDER_COMPLETION_CREDIT_ENABLED=true` and `ORDER_COMPLETION_CREDIT_PAISE=5000`, restart.
4. Accept one test order and check: the ledger row, the brand's reward split, the
   capped withdrawal, and the admin order line.
5. To switch off: set the flag to `false` and restart. Credits already granted stay
   in the brands' wallets and remain spendable — turning the flag off stops new
   grants, it does not claw back old ones.
