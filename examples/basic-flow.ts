/**
 * @file basic-flow.ts
 * @description ROTOR Protocol — End-to-end example
 * 
 * Demonstrates all three legs working together:
 *   1. Subscribe to an account address on XRPL
 *   2. Verify incoming payments and record fee obligations
 *   3. Monitor for merchant-initiated fee settlement
 */

import { Client, Wallet } from 'xrpl'
import {
  verifyIncomingPayment,
  createFeeRecord,
  sendFeeSettlement,
} from '../src/index'

const PLATFORM_FEE_RATE       = 0.01   // 1%
const PLATFORM_WALLET_ADDRESS = 'rPlatformCollectionAddressHere'

async function main() {
  // ── Connect to XRPL ──────────────────────────────────────────────
  const client = new Client('wss://s.altnet.rippletest.net:51233')
  await client.connect()
  console.log('[rotor] Connected to XRPL')

  // ── Platform wallet (fee recipient) ──────────────────────────────
  // In production: load from environment variable, never hardcode
  const platformWallet = Wallet.fromSeed(process.env.PLATFORM_WALLET_SEED ?? '')

  // ── Account to monitor ───────────────────────────────────────────
  const accountAddress = 'rMerchantWalletAddressHere'

  await client.request({
    command:  'subscribe',
    accounts: [accountAddress],
  })
  console.log(`[rotor] Subscribed to ${accountAddress}`)

  // ── LEG 1 — Verify incoming payments ─────────────────────────────
  client.on('transaction', async (tx: any) => {
    const verified = verifyIncomingPayment(tx, accountAddress)

    if (!verified) {
      // Not a valid incoming payment — skip silently
      return
    }

    console.log(`[rotor] ✓ Payment verified — ${verified.value} ${verified.currency}`)
    console.log(`[rotor]   txHash: ${verified.txHash}`)

    // ── LEG 2 — Record fee obligation ───────────────────────────────
    const feeRecord = createFeeRecord({
      txHash:      verified.txHash,
      accountId:   accountAddress,
      grossAmount: verified.value,
      currency:    verified.currency,
      feeRate:     PLATFORM_FEE_RATE,
    })

    console.log(`[rotor] Fee obligation recorded — ${feeRecord.feeAmount} ${verified.currency}`)
    console.log(`[rotor] Status: ${feeRecord.status} — awaiting merchant clearance`)

    // ── LEG 3 — Merchant initiates settlement ───────────────────────
    // In production: merchant triggers this via your platform UI
    // The platform monitors and confirms — it never initiates a pull
    //
    // Example of what the merchant-initiated settlement looks like
    // when the merchant clears their fee obligation:
    //
    // const settlement = await sendFeeSettlement(client, merchantWallet, {
    //   destination:    PLATFORM_WALLET_ADDRESS,
    //   amount:         feeRecord.feeAmount,
    //   currencyConfig: 'XRP',
    //   memo:           `ROTOR:${feeRecord.txHash.slice(0, 16)}`,
    // })
    //
    // console.log(`[rotor] Fee cleared — ${settlement.txHash}`)
  })

  console.log('[rotor] ROTOR Protocol active — monitoring for payments')
  console.log('[rotor] Press Ctrl+C to stop')

  // Keep alive
  await new Promise(() => {})
}

main().catch(console.error)
