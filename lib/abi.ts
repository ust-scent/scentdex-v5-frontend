/**
 * Minimal ABI fragments for the on-chain reads/writes the UI needs.
 *
 * Phase 3.2: ERC20 allowance + approve, MockERC20 mint (faucet).
 * Phase 3.3+: ScentDexV5 fillOrder, cancelOrder, getOrderInfo (added later).
 */

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * Uniswap Permit2 — minimal AllowanceTransfer fragment used by the trade UI.
 *
 * V5 settles via `permit2.transferFrom(maker, taker, amount, token)` (see
 * ScentDexV5.sol:1024), which draws against the maker's per-spender allowance
 * inside Permit2. So a maker actually needs TWO approvals before any of their
 * signed orders can be filled:
 *
 *   1. `ERC20.approve(Permit2, MaxUint256)` — wallet → Permit2 (one-time per token)
 *   2. `Permit2.approve(token, ScentDexV5, amount, expiration)` — Permit2 → DEX
 *
 * The `allowance(owner, token, spender)` getter returns the packed
 * (uint160 amount, uint48 expiration, uint48 nonce) tuple for the second hop.
 */
export const PERMIT2_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

/**
 * MockERC20 deployed on Sepolia. Adds public `mint(to, amount)` for faucet use.
 * NOT present on mainnet (production tokens are real ERC-20s without mint).
 */
export const MOCK_ERC20_ABI = [
  ...ERC20_ABI,
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
