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
 * SCENTDEX V5 — fragments used by the trade UI:
 *   - OrderFilled event (Stats + Recent Trades)
 *   - pairConfig(a, b) getter (maker-fee tile + pair-config aware signing)
 *   - fillOrder() / cancelOrder() (taker fill + maker on-chain cancel)
 *
 * The Order tuple and PermitSingle tuple here must match the Solidity
 * struct layouts byte-for-byte. See ScentDexV5.sol lines 116-127 + 283.
 */

const ORDER_TUPLE = {
  type: "tuple",
  name: "order",
  components: [
    { name: "maker", type: "address" },
    { name: "makerToken", type: "address" },
    { name: "takerToken", type: "address" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiry", type: "uint64" },
    { name: "nonce", type: "uint256" },
    { name: "salt", type: "bytes32" },
    { name: "feeSide", type: "address" },
    { name: "feeBps", type: "uint16" },
  ],
} as const;

const PERMIT_SINGLE_TUPLE_TAKER = {
  type: "tuple",
  name: "takerPermit",
  components: [
    {
      type: "tuple",
      name: "details",
      components: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" },
      ],
    },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
} as const;

const PERMIT_SINGLE_TUPLE_MAKER = {
  type: "tuple",
  name: "makerPermit",
  components: PERMIT_SINGLE_TUPLE_TAKER.components,
} as const;

export const SCENTDEX_V5_ABI = [
  {
    type: "event",
    name: "OrderFilled",
    inputs: [
      { name: "orderHash", type: "bytes32", indexed: true },
      { name: "maker", type: "address", indexed: true },
      { name: "taker", type: "address", indexed: true },
      { name: "makerToken", type: "address", indexed: false },
      { name: "takerToken", type: "address", indexed: false },
      { name: "fillMakerAmount", type: "uint256", indexed: false },
      { name: "fillTakerAmount", type: "uint256", indexed: false },
      { name: "protocolFeeAmount", type: "uint256", indexed: false },
      { name: "feeToken", type: "address", indexed: false },
    ],
  },
  {
    type: "function",
    name: "pairConfig",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "enabled", type: "bool" },
          { name: "feeSide", type: "address" },
          { name: "feeBps", type: "uint16" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "fillOrder",
    stateMutability: "nonpayable",
    inputs: [
      ORDER_TUPLE,
      { name: "signature", type: "bytes" },
      { name: "fillMakerAmount", type: "uint256" },
      PERMIT_SINGLE_TUPLE_TAKER,
      { name: "takerPermitSignature", type: "bytes" },
      PERMIT_SINGLE_TUPLE_MAKER,
      { name: "makerPermitSignature", type: "bytes" },
    ],
    outputs: [
      { name: "actualMakerFilled", type: "uint256" },
      { name: "actualTakerPaid", type: "uint256" },
      { name: "feePaid", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "cancelOrder",
    stateMutability: "nonpayable",
    inputs: [ORDER_TUPLE],
    outputs: [],
  },
  {
    type: "function",
    name: "filledMakerAmount",
    stateMutability: "view",
    inputs: [{ name: "orderHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
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
