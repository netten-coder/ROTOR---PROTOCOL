/**
 * @file index.ts
 * @description ROTOR Protocol — Public API
 * 
 * Three-leg non-custodial fee routing for XRPL merchant applications.
 * 
 *   Leg 1 — Verify incoming payment (tesSUCCESS + destination guard)
 *   Leg 2 — Record fee obligation (append-only, txHash-anchored)
 *   Leg 3 — Merchant-initiated settlement (platform monitors, never pulls)
 */

export { verifyIncomingPayment, lookupTransaction } from './verification'
export { createFeeRecord, calculateFee }            from './fee-ledger'
export { sendFeeSettlement }                        from './settlement'
export type { VerifiedPayment }                     from './verification'
export type { FeeRecord, FeeStatus }                from './fee-ledger'
export type { SendFeeParams, IssuedCurrencyConfig } from './settlement'
