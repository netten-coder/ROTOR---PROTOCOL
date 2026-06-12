/**
 * @file fee-ledger.ts
 * @description ROTOR Protocol — Leg 2: Fee Ledger
 * 
 * Append-only record of fee obligations. The platform never touches
 * account funds — it records what is owed, verified by on-chain 
 * transaction hash. Independent verification against XRPL is always
 * possible via the stored txHash.
 * 
 * Design principle: records are never mutated after creation.
 * Status transitions are new records, not updates.
 */

export type FeeStatus = 'PENDING' | 'CLEARED' | 'WAIVED'

export interface FeeRecord {
  /** Unique identifier for this fee obligation. */
  id:          string
  /** On-chain transaction hash — independently verifiable on XRPL. */
  txHash:      string
  /** The account that owes the fee (merchant/seller wallet address). */
  accountId:   string
  /** Gross payment amount received. */
  grossAmount: string
  /** Currency of the payment (e.g. 'XRP', 'RLUSD', 'USDC'). */
  currency:    string
  /** Calculated fee amount. */
  feeAmount:   string
  /** Fee rate applied (e.g. 0.01 for 1%). */
  feeRate:     number
  /** Current settlement status. */
  status:      FeeStatus
  /** ISO timestamp when obligation was recorded. */
  createdAt:   string
  /** ISO timestamp of last status change. */
  updatedAt:   string
}

/**
 * Calculates the fee amount for a given payment.
 * 
 * @param grossAmount - Payment amount as string (preserves precision).
 * @param feeRate     - Fee as decimal (e.g. 0.01 = 1%).
 * @returns           - Fee amount as string, 6 decimal places.
 */
export function calculateFee(
  grossAmount: string,
  feeRate:     number,
): string {
  return (parseFloat(grossAmount) * feeRate).toFixed(6)
}

/**
 * Creates a new fee obligation record from a verified payment.
 * 
 * In a production implementation, persist this to your database
 * with the txHash as a unique constraint to ensure idempotency —
 * the same transaction can never generate two fee records.
 */
export function createFeeRecord(params: {
  txHash:      string
  accountId:   string
  grossAmount: string
  currency:    string
  feeRate:     number
}): FeeRecord {
  const feeAmount = calculateFee(params.grossAmount, params.feeRate)
  const now       = new Date().toISOString()

  return {
    id:          `fee_${params.txHash.slice(0, 16)}_${Date.now()}`,
    txHash:      params.txHash,
    accountId:   params.accountId,
    grossAmount: params.grossAmount,
    currency:    params.currency,
    feeAmount,
    feeRate:     params.feeRate,
    status:      'PENDING',
    createdAt:   now,
    updatedAt:   now,
  }
}
