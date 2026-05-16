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
  // V6 r1+ (ADR-0007 sym_fee_005). Reports the protocol fee that a hypothetical
  // fill of `fillMakerAmount` would route to the treasury, plus the token in
  // which that fee is denominated. The V6 contract returns (0, address(0))
  // for any non-fillable order (paused, expired, cancelled, sized wrong),
  // so the frontend can treat a non-zero (feeAmount, feeToken) as the
  // authoritative net-receive disclosure for the taker. Older V5 contracts
  // do not expose this function — callers must guard with try/catch when
  // running against a chain where SCENTDEX_V5_ADDRESS resolves to V5.
  {
    type: "function",
    name: "previewFee",
    stateMutability: "view",
    inputs: [ORDER_TUPLE, { name: "fillMakerAmount", type: "uint256" }],
    outputs: [
      { name: "feeAmount", type: "uint256" },
      { name: "feeToken", type: "address" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  // Auto-generated getters for public mappings on ScentDexV6 — required
  // by the keeper-bot's fillability rescan.
  {
    type: "function",
    name: "filledMakerAmount",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "cancelled",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // Custom errors — required so viem's decodeErrorResult / re-simulated
  // revert paths can map a raw 4-byte selector back to a Solidity error
  // name (e.g. FillExceedsMaker → trade.fillError.alreadyFilled). Without
  // these entries, decodeErrorResult cannot identify the revert and the
  // UI falls back to a generic "reverted" copy.
  // Source: ScentDexV6.sol (lines ~200–275). Keep this list in sync if a
  // future contract revision adds/removes errors.
  { type: "error", name: "ZeroFillAmount", inputs: [] },
  { type: "error", name: "ExpiredOrInvalidExpiry", inputs: [] },
  { type: "error", name: "InvalidNonce", inputs: [] },
  { type: "error", name: "TokenNotAllowed", inputs: [] },
  { type: "error", name: "DegenerateTokens", inputs: [] },
  { type: "error", name: "PairNotEnabled", inputs: [] },
  { type: "error", name: "AddressBlacklisted", inputs: [] },
  { type: "error", name: "OrderAlreadyCancelled", inputs: [] },
  { type: "error", name: "InvalidSignature", inputs: [] },
  { type: "error", name: "FillExceedsMaker", inputs: [] },
  { type: "error", name: "TakerAmountBelowFloor", inputs: [] },
  { type: "error", name: "PriceRatioAboveCap", inputs: [] },
  { type: "error", name: "ZeroTreasury", inputs: [] },
  { type: "error", name: "ZeroToken", inputs: [] },
  { type: "error", name: "TokenNotContract", inputs: [] },
  { type: "error", name: "SameToken", inputs: [] },
  { type: "error", name: "FeeSideNotInPair", inputs: [] },
  { type: "error", name: "FeeBpsTooHigh", inputs: [] },
  { type: "error", name: "NonceNotIncreasing", inputs: [] },
  { type: "error", name: "NoPendingTreasuryChange", inputs: [] },
  { type: "error", name: "TreasuryTimelockNotElapsed", inputs: [] },
  { type: "error", name: "TreasuryUnchanged", inputs: [] },
  { type: "error", name: "InvalidBatchSize", inputs: [] },
  { type: "error", name: "NotMaker", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "ZeroTakerAmount", inputs: [] },
  { type: "error", name: "FeeSideMismatch", inputs: [] },
  { type: "error", name: "FeeBpsMismatch", inputs: [] },
  { type: "error", name: "NoPendingPairChange", inputs: [] },
  { type: "error", name: "PairTimelockNotElapsed", inputs: [] },
  { type: "error", name: "Permit2TokenMismatch", inputs: [] },
  { type: "error", name: "Permit2SpenderMismatch", inputs: [] },
  { type: "error", name: "Permit2AmountInsufficient", inputs: [] },
  { type: "error", name: "AllOrdersCancelled", inputs: [] },
  { type: "error", name: "ZeroResidualTaker", inputs: [] },
  { type: "error", name: "TreasuryIsContract", inputs: [] },
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
