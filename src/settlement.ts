/**
 * @file settlement.ts  
 * @description ROTOR Protocol — Leg 3: Merchant-Initiated Settlement
 * 
 * The account holder initiates fee payment directly to the platform
 * collection address. The platform monitors and confirms — it never
 * pulls funds.
 * 
 * This is the core non-custodial design decision of ROTOR:
 * the platform cannot extract fees without the account holder's
 * active participation. There is no sweep mechanism. No backdoor.
 * 
 * This design intentionally requires merchant action. That friction
 * is the trust signal — the platform earns its fee, it cannot take it.
 * 
 * When XRPL batch transactions reach mainnet, this settlement leg
 * maps directly onto atomic batch execution. The fee ledger becomes
 * the input to a single atomic transaction: payment + fee in one.
 * No architectural redesign required — only a settlement layer swap.
 */

import { Client, Wallet, convertStringToHex } from 'xrpl'

export interface IssuedCurrencyConfig {
  /** Hex-encoded currency code or 3-letter ISO code. */
  currency: string
  /** Issuer wallet address for the token. */
  issuer:   string
}

export interface SendFeeParams {
  /** Recipient address for the fee payment. */
  destination:    string
  /** Amount to send. */
  amount:         string
  /** Either 'XRP' for native, or an IssuedCurrencyConfig for tokens. */
  currencyConfig: 'XRP' | IssuedCurrencyConfig
  /** Optional memo to attach — useful for reconciliation. */
  memo?:          string
}

/**
 * Sends a fee settlement payment from the platform collection wallet.
 * 
 * In ROTOR's model this is called when the account holder clears their
 * outstanding fee obligation. The platform wallet receives — it never
 * initiates a pull from the merchant's wallet.
 * 
 * @param client  - Connected XRPL client instance.
 * @param wallet  - Platform wallet (the fee recipient, not the sender).
 * @param params  - Destination, amount, currency configuration.
 * @returns       - Validated on-ledger transaction hash.
 */
export async function sendFeeSettlement(
  client: Client,
  wallet: Wallet,
  params: SendFeeParams,
): Promise<{ txHash: string }> {
  if (!client.isConnected()) {
    throw new Error('[rotor] Client not connected — call client.connect() first')
  }

  const amount = params.currencyConfig === 'XRP'
    ? String(Math.floor(parseFloat(params.amount) * 1_000_000)) // Convert to drops
    : {
        currency: params.currencyConfig.currency,
        value:    params.amount,
        issuer:   params.currencyConfig.issuer,
      }

  const payment = {
    TransactionType: 'Payment' as const,
    Account:         wallet.address,
    Destination:     params.destination,
    Amount:          amount,
    ...(params.memo && {
      Memos: [{ Memo: { MemoData: convertStringToHex(params.memo) } }],
    }),
  }

  const result = await client.submitAndWait(payment, { wallet })

  if (!result.result.validated) {
    throw new Error('[rotor] Transaction submitted but not validated')
  }

  const meta     = result.result.meta
  const txResult = typeof meta === 'string' ? null : meta?.TransactionResult

  if (txResult !== 'tesSUCCESS') {
    throw new Error(
      `[rotor] Transaction failed on-ledger — TransactionResult=${txResult ?? 'unknown'}`
    )
  }

  return { txHash: result.result.hash }
}
