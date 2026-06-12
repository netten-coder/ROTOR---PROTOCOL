/**
 * @file verification.ts
 * @description ROTOR Protocol — Leg 1: Payment Verification
 * 
 * Verifies incoming XRPL transactions meet all settlement criteria
 * before a fee obligation is recorded. The ledger is the only 
 * source of truth.
 */

import { Client } from 'xrpl'

const DROPS_PER_XRP = 1_000_000

export interface VerifiedPayment {
  txHash:      string
  destination: string
  currency:    string
  value:       string
  raw:         any
}

/**
 * Filters a raw XRPL transaction event against three criteria:
 *   1. TransactionType must be Payment
 *   2. Destination must match the subscribed address
 *   3. TransactionResult must be tesSUCCESS
 * 
 * Returns null if any criterion fails — caller skips fee recording.
 */
export function verifyIncomingPayment(
  tx:                  any,
  expectedDestination: string,
): VerifiedPayment | null {
  if (tx.transaction?.TransactionType !== 'Payment')           return null
  if (tx.transaction?.Destination     !== expectedDestination) return null
  if (tx.meta?.TransactionResult      !== 'tesSUCCESS')        return null

  const raw      = tx.transaction.Amount
  const isXRP    = typeof raw === 'string'
  const currency = isXRP ? 'XRP' : (raw as any).currency
  const value    = isXRP
    ? (parseInt(raw, 10) / DROPS_PER_XRP).toFixed(6)
    : (raw as any).value
  const txHash   = tx.transaction.hash as string

  return { txHash, destination: expectedDestination, currency, value, raw }
}

/**
 * Looks up a transaction on-ledger by hash.
 * Defense-in-depth verification — confirms the tx landed 
 * independently of the WebSocket event stream.
 */
export async function lookupTransaction(
  client:  Client,
  txHash:  string,
): Promise<any> {
  const response = await client.request({
    command:     'tx',
    transaction: txHash,
  })
  return response.result
}
