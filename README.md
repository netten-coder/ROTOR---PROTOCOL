# ROTOR-PROTOCOL
**Non-custodial fee routing for XRPL merchant applications**  A symmetric three-component protocol for collecting platform fees  from merchant transactions on the XRP Ledger — without custody,  without a middleman, and without batch transactions.
# ROTOR Protocol

**Non-custodial fee routing for XRPL merchant applications**

A symmetric three-component protocol for collecting platform fees 
from merchant transactions on the XRP Ledger — without custody, 
without a middleman, and without batch transactions.

> ROTOR is a palindrome. By design.

---

## The Problem

Building a fee-collecting merchant payment platform on XRPL 
presents a structural challenge: how do you take a platform fee 
from each transaction while remaining truly non-custodial?

The naive approach — routing funds through a platform wallet 
before forwarding to the merchant — creates custodial risk. 
The platform holds funds, even briefly. That's not acceptable.

Batch transactions (when live on mainnet) will eventually solve 
this cleanly. ROTOR is the solution that works today, before 
batch transactions are available.

---

## How It Works

ROTOR splits fee collection across three coordinated components:

**Leg 1 — Payment Verification**
Monitors the XRPL for incoming payments to the merchant's wallet.
Verifies transaction validity via tesSUCCESS and confirms correct
issuer, amount, and trust line status. The ledger is the only 
source of truth.

**Leg 2 — Fee Ledger**
Records the fee obligation against each verified transaction. 
The platform never touches the merchant's funds. Instead, it 
maintains an append-only ledger of what is owed, verified by 
on-chain transaction hash. No custody. No holding period.

**Leg 3 — Merchant-Initiated Settlement**
The merchant clears the fee from their own wallet directly to 
the platform collection address. This is the key design decision: 
the merchant initiates, the platform never pulls. 

This is intentional — it keeps the protocol truly non-custodial 
and creates a trust signal between merchant and platform rather 
than a mechanism that could be exploited.

---

## Why Merchant-Initiated?

This is the most common question about ROTOR's design.

Requiring the merchant to clear fees feels like friction. In 
practice it is a feature: the platform cannot take funds without 
the merchant's active participation. There is no backdoor. 
There is no sweep mechanism. The merchant retains full control 
of their wallet at all times.

For merchants evaluating a payment platform, this is a 
meaningful trust signal. The platform earns its fee — it cannot 
extract it.

---

## Design Principles

- **Non-custodial from line 1** — the platform never holds 
  merchant funds at any point in the flow
- **Ledger as source of truth** — every fee obligation traces 
  to an on-chain transaction hash, independently verifiable
- **Merchant control** — settlement is initiated by the merchant,
  never pulled by the platform
- **Batch-ready** — when XRPL batch transactions reach mainnet,
  ROTOR's fee ledger maps directly onto atomic batch settlement,
  making the migration path straightforward

---

## Implementation

```typescript
// Leg 1 — Verify incoming payment on XRPL
async function verifyPayment(txHash: string): Promise<VerifiedPayment> {
  // Confirm tesSUCCESS, correct issuer, correct amount
  // Returns verified payment object or throws
}

// Leg 2 — Record fee obligation
async function recordFeeObligation(
  payment: VerifiedPayment, 
  feeRate: number
): Promise<FeeRecord> {
  // Append-only. Never mutated.
  // Tied to on-chain txHash for independent verification
}

// Leg 3 — Merchant initiates fee settlement
async function merchantClearsFee(
  feeRecord: FeeRecord,
  merchantWallet: string
): Promise<void> {
  // Merchant signs and submits directly
  // Platform monitors, never initiates
}
