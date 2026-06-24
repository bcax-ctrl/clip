# NeuroMaxTrader — Base chain contract

A personal, owner-gated trade-execution contract. The owner funds it with tokens,
then calls `swap()`, which routes through Uniswap V3 on Base with on-chain
slippage protection (`minAmountOut`) and a `deadline`.

## Safety design
- **`onlyOwner`** on every state-changing function — only your wallet can trade.
- **Slippage protection** — `swap()` reverts if output `< minAmountOut`.
- **Deadline** — reverts after the supplied timestamp.
- **Pause switch** — `setPaused(true)` halts trading instantly.
- **Emergency `withdraw()`** — pull any token (or ETH) back to the owner; funds
  are never trapped.
- Swap proceeds are sent **directly to the owner wallet**, not held in the contract.

> ⚠️ This contract moves real funds. Test on **Base Sepolia** first, start with
> tiny amounts, and keep `auto_trade_enabled=false` in the backend until you've
> verified behaviour end-to-end.

## Compile
```bash
npm install
npm run compile          # solcjs → build/
```
Verified compiling with solc 0.8.24 (≈11.6KB bytecode).

## Deploy to Base
Uniswap V3 `SwapRouter02` on Base mainnet: `0x2626664c2603336E57B271c5C0b26F421741e481`
(Base Sepolia testnet has its own router — check the Uniswap docs).

```bash
BASE_RPC=https://mainnet.base.org \
WALLET_PRIVATE_KEY=0xYOUR_KEY \
ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481 \
npm run deploy
```
Copy the printed address into `backend/.env` as `SMART_CONTRACT_ADDRESS`.

## Funding & trading
1. Transfer the token you want to sell (e.g. USDC) to the deployed contract, or
   approve the contract and call `depositFrom(token, amount)`.
2. The backend's `TradeExecutor` builds the `swap()` call with a `minAmountOut`
   derived from your `max_slippage_bps`, and either returns the prepared tx
   (default) or sends it when `auto_trade_enabled=true`.
