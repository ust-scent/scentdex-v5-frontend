import {
  DEFAULT_LOCALE,
  resolveLocale,
  type SupportedLocale,
} from "@/lib/i18n";

/**
 * Translation dictionary for the marketing/explainer pages.
 *
 * Keys are dot-namespaced. Each key MUST exist in every locale's record;
 * the `Record<SupportedLocale, Dictionary>` type below enforces this.
 *
 * Convention:
 *   en — canonical source of truth
 *   ja — full translation (Alex audience #1)
 *   ko / zh-CN / zh-TW / id — copy en for now, translate later
 *
 * Lists (FlowBlock steps, SmallCard items) use array-typed keys.
 */
export type Dictionary = {
  // Header
  "header.nav.home": string;
  "header.nav.trade": string;

  // Hero
  "hero.title.line1": string;
  "hero.title.line2": string;
  "hero.tagline": string;
  "hero.cta.primary": string;
  "hero.cta.secondary": string;

  // 01. What is SCENTDEX?
  "what.kicker": string;
  "what.title": string;
  "what.body1": string;
  "what.body2": string;
  "what.card1.title": string;
  "what.card1.body": string;
  "what.card2.title": string;
  "what.card2.body": string;
  "what.card3.title": string;
  "what.card3.body": string;

  // 02. How a trade works
  "how.kicker": string;
  "how.title": string;
  "how.maker.who": string;
  "how.maker.summary": string;
  "how.maker.steps": readonly string[];
  "how.taker.who": string;
  "how.taker.summary": string;
  "how.taker.steps": readonly string[];

  // 03. What is Permit2?
  "permit.kicker": string;
  "permit.title": string;
  "permit.body1": string;
  "permit.body2": string;
  "permit.without.heading": string;
  "permit.without.items": readonly string[];
  "permit.with.heading": string;
  "permit.with.items": readonly string[];
  "permit.outro": string;

  // 04. Phishing safety
  "phish.kicker": string;
  "phish.title": string;
  "phish.body1": string;
  "phish.body2": string;
  "phish.rule1.title": string;
  "phish.rule1.body": string;
  "phish.rule2.title": string;
  "phish.rule2.body": string;
  "phish.rule3.title": string;
  "phish.rule3.body": string;
  "phish.rule4.title": string;
  "phish.rule4.body": string;
  "phish.outro": string;

  // 05. Audit & operations
  "audit.kicker": string;
  "audit.title": string;
  "audit.intro": string;
  "audit.row1.label": string;
  "audit.row1.detail": string;
  "audit.row2.label": string;
  "audit.row2.detail": string;
  "audit.row3.label": string;
  "audit.row3.detail": string;
  "audit.row4.label": string;
  "audit.row4.detail": string;
  "audit.row5.label": string;
  "audit.row5.detail": string;
  "audit.row6.label": string;
  "audit.row6.detail": string;
  "audit.outro.prefix": string;
  "audit.outro.contact": string;

  // 06. FAQ
  "faq.kicker": string;
  "faq.title": string;
  "faq.q1.q": string;
  "faq.q1.a": string;

  // 07. Final CTA
  "cta.title": string;
  "cta.body": string;
  "cta.button": string;

  // Trade page — BottomTabs
  "trade.tabs.orders": string;
  "trade.tabs.history": string;
  "trade.tabs.approvedTokens": string;

  // Trade page — Approved Tokens (Permit2) tab
  "trade.approvedTokens.description": string;
  "trade.approvedTokens.learnMore": string;
  "trade.approvedTokens.notDeployed": string;
  "trade.approvedTokens.connectWallet": string;
  "trade.approvedTokens.approved": string;
  "trade.approvedTokens.notApproved": string;
  "trade.approvedTokens.approve": string;
  "trade.approvedTokens.reApprove": string;
  "trade.approvedTokens.approving": string;
  "trade.approvedTokens.reApproving": string;
  "trade.approvedTokens.mintTest": string;
  "trade.approvedTokens.minting": string;
  "trade.approvedTokens.getMint": string;
  "trade.approvedTokens.balance": string;
  "trade.approvedTokens.step1Label": string;
  "trade.approvedTokens.step2Label": string;
  "trade.approvedTokens.approvingStep1": string;
  "trade.approvedTokens.approvingStep2": string;
  "trade.approvedTokens.continueApproval": string;
  "trade.approvedTokens.partialDescription": string;
  "trade.approvedTokens.statusNotApproved": string;
  "trade.approvedTokens.revoke": string;
  "trade.approvedTokens.revoking": string;

  // Trade page — MyOrders
  "trade.myOrders.active": string;
  "trade.myOrders.historical": string;
  "trade.myOrders.bulkCancel": string;
  "trade.myOrders.pair": string;
  "trade.myOrders.side": string;
  "trade.myOrders.price": string;
  "trade.myOrders.amountFilled": string;
  "trade.myOrders.status": string;
  "trade.myOrders.action": string;
  "trade.myOrders.cancel": string;
  "trade.myOrders.amount": string;
  "trade.myOrders.filled": string;
  "trade.myOrders.empty": string;
  "trade.myOrders.emptyHistorical": string;
  "trade.myOrders.loading": string;
  "trade.myOrders.connect": string;
  "trade.myOrders.cancelling": string;
  "trade.myOrders.needsApproval": string;
  "trade.myOrders.needsApprovalTooltip": string;

  // Trade page — History
  "trade.history.time": string;
  "trade.history.pair": string;
  "trade.history.side": string;
  "trade.history.amount": string;
  "trade.history.price": string;
  "trade.history.role": string;
  "trade.history.counterparty": string;
  "trade.history.protocolFee": string;
  "trade.history.empty": string;
  "trade.history.connect": string;

  // Trade page — OrderBook
  "trade.orderBook.title": string;
  "trade.orderBook.noOrders": string;
  "trade.orderBook.hiddenTooltip": string;
  "trade.orderBook.hidden": string;
  "trade.orderBook.spread": string;
  "trade.orderBook.statusLoading": string;
  "trade.orderBook.statusEmpty": string;
  "trade.orderBook.statusAggregated": string;

  // Trade page — PlaceOrder
  "trade.placeOrder.title": string;
  "trade.placeOrder.price": string;
  "trade.placeOrder.amount": string;
  "trade.placeOrder.expires": string;
  "trade.placeOrder.total": string;
  "trade.placeOrder.youReceive": string;
  "trade.placeOrder.makerFee": string;
  "trade.placeOrder.caseBTakerNote": string;
  // Round-5 conversational labels
  "trade.placeOrder.sizeSellQuestion": string;
  "trade.placeOrder.sizeBuyQuestion": string;
  "trade.placeOrder.priceQuestionSell": string;
  "trade.placeOrder.priceQuestionBuy": string;
  "trade.placeOrder.marketPriceHint": string;
  "trade.placeOrder.grossSell": string;
  "trade.placeOrder.grossBuy": string;
  "trade.placeOrder.expiryOption.1d": string;
  "trade.placeOrder.expiryOption.1w": string;
  "trade.placeOrder.expiryOption.1mo": string;
  "trade.placeOrder.expiryOption.1y": string;
  "trade.placeOrder.connectWallet": string;
  "trade.placeOrder.wrongNetwork": string;
  "trade.placeOrder.pairNotAvailable": string;
  "trade.placeOrder.enterPrice": string;
  "trade.placeOrder.enterAmount": string;
  "trade.placeOrder.waitingForWallet": string;
  "trade.placeOrder.signOrder": string;
  "trade.placeOrder.couldNotBuild": string;
  "trade.placeOrder.buy": string;
  "trade.placeOrder.sell": string;
  "trade.placeOrder.balances": string;
  "trade.placeOrder.balanceConnect": string;
  "trade.placeOrder.notDeployedHere": string;
  "trade.placeOrder.wrongNetworkBalance": string;
  "trade.placeOrder.approveAndSign": string;
  "trade.placeOrder.approvingStep1": string;
  "trade.placeOrder.approvingStep2": string;
  "trade.placeOrder.approvingErc20": string;
  "trade.placeOrder.orderSigned": string;
  "trade.placeOrder.orderPosted": string;
  "trade.placeOrder.orderPlacedHeader": string;
  "trade.placeOrder.orderFailedHeader": string;

  // Trade page — RecentTrades
  "trade.recentTrades.title": string;
  "trade.recentTrades.price": string;
  "trade.recentTrades.amount": string;
  "trade.recentTrades.time": string;
  "trade.recentTrades.live": string;
  "trade.recentTrades.syncing": string;
  "trade.recentTrades.loading": string;
  "trade.recentTrades.empty": string;

  // Trade page — StandingAllowanceBanner (round-2 → round-3 cleanup)
  "trade.standingAllowance.headline": string;
  "trade.standingAllowance.body": string;
  "trade.standingAllowance.revokeAll": string;
  "trade.standingAllowance.revoking": string;

  // Trade page — SignConfirmModal
  "trade.signModal.title": string;
  "trade.signModal.close": string;
  "trade.signModal.action": string;
  "trade.signModal.headlineSell": string;
  "trade.signModal.headlineBuy": string;
  "trade.signModal.forAtLeast": string;
  "trade.signModal.youGive": string;
  "trade.signModal.youReceive": string;
  "trade.signModal.afterFee": string;
  "trade.signModal.protocolFee": string;
  "trade.signModal.expires": string;
  "trade.signModal.maker": string;
  "trade.signModal.yourWallet": string;
  "trade.signModal.phishingChecks": string;
  "trade.signModal.disclosure": string;
  "trade.signModal.checksFailed": string;
  "trade.signModal.cancel": string;
  "trade.signModal.holdToSign": string;
  "trade.signModal.signingOverride": string;
  "trade.signModal.ruleDomainOk": string;
  "trade.signModal.ruleDomainFail": string;
  "trade.signModal.ruleSelfOk": string;
  "trade.signModal.ruleSelfFail": string;
  "trade.signModal.ruleSelfDetail": string;
  "trade.signModal.ruleFloorOk": string;
  "trade.signModal.ruleFloorFail": string;
  "trade.signModal.ruleRatioOk": string;
  "trade.signModal.ruleRatioFail": string;

  // Trade page — StatsBar
  "trade.statsBar.volume24h": string;
  "trade.statsBar.high24h": string;
  "trade.statsBar.low24h": string;
  "trade.statsBar.makerFee": string;
  "trade.statsBar.makerFeeSuffix": string;

  // Trade page — order book crossed-state copy
  "trade.orderbook.crossedWarning": string;
  "trade.orderbook.crossed": string;

  // Trade page — FillModal error messages (V5 custom error mapping)
  "trade.fillError.title": string;
  "trade.fillError.walletRejected": string;
  "trade.fillError.timeout": string;
  "trade.fillError.alreadyFilled": string;
  "trade.fillError.cancelled": string;
  "trade.fillError.allCancelled": string;
  "trade.fillError.expired": string;
  "trade.fillError.invalidNonce": string;
  "trade.fillError.invalidSignature": string;
  "trade.fillError.takerBelowFloor": string;
  "trade.fillError.priceRatio": string;
  "trade.fillError.permit2TokenMismatch": string;
  "trade.fillError.permit2SpenderMismatch": string;
  "trade.fillError.permit2AmountInsufficient": string;
  "trade.fillError.blacklisted": string;
  "trade.fillError.tokenNotAllowed": string;
  "trade.fillError.pairNotEnabled": string;
  "trade.fillError.zeroFill": string;
  "trade.fillError.zeroResidual": string;
  "trade.fillError.feeSideMismatch": string;
  "trade.fillError.feeBpsMismatch": string;
  "trade.fillError.revertedWith": string;
  "trade.fillError.reverted": string;
  "trade.fillError.unknown": string;
  "trade.fillError.gasLimitTooHigh": string;
  "trade.fillError.insufficientFunds": string;
  "trade.fillError.networkError": string;
  "trade.fillError.closeAndRetry": string;

  // FillModal layout / status / buttons / footer
  "trade.fillModal.title": string;
  "trade.fillModal.pair": string;
  "trade.fillModal.maker": string;
  "trade.fillModal.price": string;
  "trade.fillModal.youReceive": string;
  "trade.fillModal.youReceiveGross": string;
  "trade.fillModal.youReceiveNet": string;
  "trade.fillModal.protocolFee": string;
  "trade.fillModal.youPay": string;
  "trade.fillModal.orderStatus": string;
  "trade.fillModal.cantFillOwn": string;
  "trade.fillModal.missingPermit": string;
  "trade.fillModal.switchNetwork": string;
  "trade.fillModal.settled": string;
  "trade.fillModal.button.filled": string;
  "trade.fillModal.button.approving": string;
  "trade.fillModal.button.signPermit": string;
  "trade.fillModal.button.waitingWallet": string;
  "trade.fillModal.button.confirmingTx": string;
  "trade.fillModal.button.approve": string;
  "trade.fillModal.button.fill": string;
  "trade.fillModal.footnote": string;
  "trade.fillModal.statusOpen": string;
  "trade.fillModal.statusPartiallyFilled": string;
  "trade.fillModal.statusFilled": string;
  "trade.fillModal.statusCancelled": string;
  "trade.fillModal.statusExpired": string;
  "trade.fillModal.walletPopupHint": string;
  "trade.fillModal.previewFeeError": string;

  // Footer
  "footer.terms": string;
  "footer.privacy": string;
  "footer.contact": string;
  "footer.copyright": string;

  // Legal documents (Terms / Privacy)
  "legal.translation.notice": string;

  // Per-order click-wrap consent (PlaceOrder / FillModal)
  "terms.consent.prefix": string;
  "terms.consent.termsLink": string;
  "terms.consent.privacyLink": string;
  "terms.consent.joiner": string;
  "terms.consent.suffix": string;
  "terms.consent.required": string;

  // Cookie banner
  "cookie.banner.body": string;
  "cookie.banner.accept": string;
  "cookie.banner.rejectNonEssential": string;
  "cookie.banner.learnMore": string;

  // Onboarding banner (above OrderBook on /trade)
  "onboarding.banner.text": string;
  "onboarding.banner.cta": string;
  "onboarding.banner.dismissAria": string;

  // Active Offers section (below OrderBook on /trade)
  "activeOffers.heading": string;
  "activeOffers.subtext": string;
  "activeOffers.badge.sell": string;
  "activeOffers.badge.buy": string;
  "activeOffers.label.maker": string;
  "activeOffers.label.filled": string;
  "activeOffers.label.ago_just_now": string;
  "activeOffers.label.ago_minutes": string;
  "activeOffers.label.ago_hours": string;
  "activeOffers.label.ago_days": string;
  "activeOffers.button.take": string;
  "activeOffers.button.loading": string;
  "activeOffers.disabled.own": string;
  "activeOffers.disabled.balance": string;
  "activeOffers.empty.title": string;
  "activeOffers.empty.body": string;

  // FAQ page
  "faq.page.title": string;
  "faq.notFilled.title": string;
  "faq.notFilled.body": string;
  "faq.howItWorks.title": string;
  "faq.howItWorks.body": string;
};

const en: Dictionary = {
  "header.nav.home": "Home",
  "header.nav.trade": "Trade",

  "hero.title.line1": "Trade Scent Token,",
  "hero.title.line2": "peer to peer.",
  "hero.tagline":
    "SCENTDEX is a limit-order exchange where you trade directly with another wallet. No escrow. No custody. Your funds stay in your wallet until the moment a trade settles.",
  "hero.cta.primary": "Open the trade interface →",
  "hero.cta.secondary": "View source",

  "what.kicker": "01",
  "what.title": "What is SCENTDEX?",
  "what.body1":
    "SCENTDEX is a decentralised exchange built specifically for Scent Token (SCENT). Unlike pool-based DEXs (Uniswap, Curve), SCENTDEX is a true limit-order book — you set your price, your terms, your expiry, and the contract matches you with another wallet that agrees.",
  "what.body2": "",
  "what.card1.title": "Zero on-chain escrow",
  "what.card1.body":
    "The contract never holds your tokens. Both sides settle atomically the instant a fill happens — or the entire transaction reverts.",
  "what.card2.title": "Audit-first design",
  "what.card2.body":
    "Internal red team + 4 rounds of multi-agent automated review + 5 industry static-analysis tools, all clean. External formal audit before any TVL ramp.",
  "what.card3.title": "EIP-712 signed orders",
  "what.card3.body":
    "Orders live off-chain as signed messages. Cancel costs nothing, change your mind anytime, and your private key signs only what the wallet shows you.",

  "how.kicker": "02",
  "how.title": "How a trade works",
  "how.maker.who": "Maker",
  "how.maker.summary": "Wants to sell SCENT for JPYC at a price they choose",
  "how.maker.steps": [
    "Connect wallet (MetaMask, Rabby, Coinbase Wallet — any standard EOA)",
    "One-time: approve Permit2 for each token (1 transaction per token, ever)",
    "Open Place Order, set price + amount + expiry",
    "Sign the order — this is just a message, no transaction, no gas",
    "The order appears on the public book until someone fills it or you cancel",
  ],
  "how.taker.who": "Taker",
  "how.taker.summary": "Sees the order, agrees to the price, and fills it",
  "how.taker.steps": [
    "Browse the order book, click the price level you want",
    "Sign + submit a fill transaction — settles in one block",
    "Maker's SCENT moves to taker, taker's JPYC moves to maker, fee moves to treasury — all atomic, all in one tx",
    "If any leg fails (insufficient balance, allowance revoked, expiry passed), the whole transaction reverts. No partial state.",
  ],

  "permit.kicker": "03",
  "permit.title": "What is Permit2?",
  "permit.body1":
    "Permit2 is a small contract built by Uniswap that solves a real annoyance: approving every dApp separately. Instead, you approve Permit2 once per token, and from then on every compatible dApp uses signed messages — not transactions — to ask permission for specific trades.",
  "permit.body2": "",
  "permit.without.heading": "Without Permit2",
  "permit.without.items": [
    "approve(Uniswap, MAX) — gas tx",
    "approve(SCENTDEX, MAX) — gas tx",
    "approve(some-other-DEX, MAX) — gas tx",
    "Each tx costs gas + a confirmation",
  ],
  "permit.with.heading": "With Permit2",
  "permit.with.items": [
    "approve(Permit2, MAX) — once, per token",
    "Sign a message for each trade (free, no tx)",
    "Permit2 routes the transfer atomically",
    "Same allowance shared across compatible dApps",
  ],
  "permit.outro":
    "SCENTDEX uses Permit2 because it lets the maker → taker → treasury legs of a fill happen in a single atomic transaction, with no per-trade approval overhead. The trade-off is that the security model moves from \"approve a specific contract\" to \"trust the message my wallet shows me before I sign it.\" That's where phishing risk comes in — see the next section.",

  "phish.kicker": "04",
  "phish.title": "How we keep you safe from phishing",
  "phish.body1":
    "In 2024, attackers stole roughly $314M from ~260,000 wallets using Permit2-style typed-data phishing. Most victims signed a message on a cloned site that looked legitimate, not realising the signature was a blank cheque.",
  "phish.body2":
    "Before SCENTDEX asks your wallet to sign anything, we run four checks in front of you. If any fails, the Sign button is replaced with a red warning and a 3-second hold-to-confirm — never a blind click.",
  "phish.rule1.title": "Domain check",
  "phish.rule1.body":
    "The contract you're signing for must match the official SCENTDEX V5 deploy on the network you're connected to. A cloned site signing for a different contract address fails this check.",
  "phish.rule2.title": "Self check",
  "phish.rule2.body":
    "The maker address inside the order must match your connected wallet. If a phishing payload is asking you to sign on behalf of another address, this catches it.",
  "phish.rule3.title": "Floor check",
  "phish.rule3.body":
    "The taker amount must be above the per-token safety floor. A bait order ('sell 1M SCENT for 2 wei') fails this even if you didn't notice the numbers.",
  "phish.rule4.title": "Ratio check",
  "phish.rule4.body":
    "The price ratio must be within the configured cap. Extreme prices (giving away tokens at 1/1000th of market) fail this.",
  "phish.outro":
    "We also show every signature request as a plain-language summary: \"You give X, you receive at least Y after Z fee, expires on D.\" If that sentence doesn't match what you intended, don't sign.",

  "audit.kicker": "05",
  "audit.title": "Audit & operations",
  "audit.intro": "",
  "audit.row1.label": "Internal red team review",
  "audit.row1.detail":
    "6 specialised UST agents covered threat intel, contract design, red team strategy, exploit engineering, static audit, and governance",
  "audit.row2.label": "4 rounds of /ultrareview (Anthropic)",
  "audit.row2.detail":
    "Round 4 returned 0 findings on the source-only review branch",
  "audit.row3.label": "5-tools static analysis",
  "audit.row3.detail":
    "Slither, Mythril, Aderyn, Wake, 4naly3er — all clean on the V5 contract",
  "audit.row4.label": "Secondary review (Codex tool)",
  "audit.row4.detail":
    "3 findings, 2 adopted into r6, 1 documented design choice",
  "audit.row5.label": "External formal audit",
  "audit.row5.detail":
    "To be commissioned ahead of any meaningful TVL ramp on mainnet",
  "audit.row6.label": "Bug bounty program",
  "audit.row6.detail": "Post-mainnet, via Immunefi or equivalent",
  "audit.outro.prefix":
    "Source code lives at github.com/ust-scent/scentdex-v5. Independent reviewers and security researchers are invited to read it. Found something? Email",
  "audit.outro.contact": "cs@scenttoken.com",

  "faq.kicker": "06",
  "faq.title": "Common questions",
  "faq.q1.q":
    "What happens if I move my SCENT to another wallet before someone fills my order?",
  "faq.q1.a":
    "Nothing breaks — and you don't lose anything. When the taker tries to fill, the contract can't pull SCENT from your wallet, so the entire transaction reverts. Your funds stay wherever you moved them; the taker only loses the gas they spent on the failed attempt. To protect takers from wasting gas on stale orders like that, SCENTDEX continuously monitors every maker's balance and Permit2 allowance — orders that have become unfillable are automatically hidden from the order book.",

  "cta.title": "Ready to trade?",
  "cta.body":
    "Connect a wallet, approve Permit2 once per token, and sign your first order. Cancel anytime before expiry — your funds never leave your wallet until a fill happens.",
  "cta.button": "Open the trade interface →",

  // Trade page — BottomTabs
  "trade.tabs.orders": "My Orders",
  "trade.tabs.history": "History",
  "trade.tabs.approvedTokens": "Approved Tokens",

  // Trade page — Approved Tokens (Permit2) tab
  "trade.approvedTokens.description":
    "This tab is for status only — approvals happen automatically the first time you sign an order. Once a token is approved here, every future order is allowed to spend exactly its own makerAmount and nothing more, scoped to that order's expiry. No standing blanket allowance sits on the DEX between trades.",
  "trade.approvedTokens.learnMore": "Learn more →",
  "trade.approvedTokens.notDeployed": "Not deployed on this network.",
  "trade.approvedTokens.connectWallet":
    "Connect your wallet to view your {symbol} balance and Permit2 status.",
  "trade.approvedTokens.approved":
    "Permit2 can move {symbol} from your wallet when an order you signed is filled. Each fill is bounded to the makerAmount you signed for that specific order.",
  "trade.approvedTokens.notApproved":
    "Approve to start trading {symbol}. One on-chain transaction the first time; future orders are signed off-chain.",
  "trade.approvedTokens.approve": "Approve {symbol}",
  "trade.approvedTokens.reApprove": "Re-approve",
  "trade.approvedTokens.approving": "Approving…",
  "trade.approvedTokens.reApproving": "Re-approving…",
  "trade.approvedTokens.mintTest": "Get 1,000 {symbol}",
  "trade.approvedTokens.minting": "Minting…",
  "trade.approvedTokens.getMint": "Get 1,000 {symbol}",
  "trade.approvedTokens.balance": "Balance",
  "trade.approvedTokens.step1Label": "Step 1 · ERC-20 → Permit2",
  "trade.approvedTokens.step2Label": "Step 2 · Permit2 → SCENTDEX",
  "trade.approvedTokens.approvingStep1": "Approving (1/2)…",
  "trade.approvedTokens.approvingStep2": "Approving (2/2)…",
  "trade.approvedTokens.continueApproval": "Finish approval",
  "trade.approvedTokens.partialDescription":
    "Step 1 is done. One more transaction (Permit2 → SCENTDEX) is needed before fills can settle.",
  "trade.approvedTokens.statusNotApproved":
    "Not approved yet. The first time you sign a {symbol} order, SCENTDEX will request a one-time on-chain approve — no need to do it here in advance.",
  "trade.approvedTokens.revoke": "Revoke {symbol} approval",
  "trade.approvedTokens.revoking": "Revoking…",

  // Trade page — MyOrders
  "trade.myOrders.active": "Active ({count})",
  "trade.myOrders.historical": "Historical ({count})",
  "trade.myOrders.bulkCancel": "🗑 Bulk cancel",
  "trade.myOrders.pair": "Pair",
  "trade.myOrders.side": "Side",
  "trade.myOrders.price": "Price",
  "trade.myOrders.amountFilled": "Amount / Filled",
  "trade.myOrders.status": "Status",
  "trade.myOrders.action": "Action",
  "trade.myOrders.cancel": "Cancel",
  "trade.myOrders.amount": "Amount",
  "trade.myOrders.filled": "Filled",
  "trade.myOrders.empty": "No active orders. Place your first order on the right.",
  "trade.myOrders.emptyHistorical": "No historical orders yet.",
  "trade.myOrders.loading": "Loading orders…",
  "trade.myOrders.connect": "Connect your wallet to see your orders.",
  "trade.myOrders.cancelling": "Cancelling…",
  "trade.myOrders.needsApproval": "Cannot fill",
  "trade.myOrders.needsApprovalTooltip":
    "This order is signed but won't fill right now: either the {symbol} balance has dropped below makerAmount, or the wallet → Permit2 approval has been revoked. Re-approve from the Approved Tokens tab to clear it.",

  // Trade page — History
  "trade.history.time": "Time",
  "trade.history.pair": "Pair",
  "trade.history.side": "Side",
  "trade.history.amount": "Amount",
  "trade.history.price": "Price",
  "trade.history.role": "Role",
  "trade.history.counterparty": "Counter-party",
  "trade.history.protocolFee": "Protocol Fee",
  "trade.history.empty": "No fills yet.",
  "trade.history.connect": "Connect your wallet to see your trade history.",

  // Trade page — OrderBook
  "trade.orderBook.title": "Order Book",
  "trade.orderBook.noOrders": "No orders for this pair yet.\nBe the first to place a signed order.",
  "trade.orderBook.hiddenTooltip":
    "These orders' makers have insufficient balance or Permit2 allowance — fills would revert. Hidden so you don't waste gas.",
  "trade.orderBook.hidden": "{count} {orders} hidden (insufficient maker balance / allowance)",
  "trade.orderBook.spread": "Spread",
  "trade.orderBook.statusLoading": "loading…",
  "trade.orderBook.statusEmpty": "empty",
  "trade.orderBook.statusAggregated": "aggregated",

  // Trade page — PlaceOrder
  "trade.placeOrder.title": "Place Order",
  "trade.placeOrder.price": "Price",
  "trade.placeOrder.amount": "Amount",
  "trade.placeOrder.expires": "Expires after",
  "trade.placeOrder.sizeSellQuestion": "How much {base} do you want to sell?",
  "trade.placeOrder.sizeBuyQuestion": "How much {quote} do you want to spend?",
  "trade.placeOrder.priceQuestionSell":
    "At what price per 1 {base} do you want to sell?",
  "trade.placeOrder.priceQuestionBuy":
    "At what price per 1 {base} do you want to buy?",
  "trade.placeOrder.marketPriceHint": "Most recent fill: {price}",
  "trade.placeOrder.grossSell": "You receive (gross, {symbol})",
  "trade.placeOrder.grossBuy": "You receive (gross, {symbol})",
  "trade.placeOrder.expiryOption.1d": "1 day",
  "trade.placeOrder.expiryOption.1w": "1 week",
  "trade.placeOrder.expiryOption.1mo": "1 month",
  "trade.placeOrder.expiryOption.1y": "1 year",
  "trade.placeOrder.total": "Total",
  "trade.placeOrder.youReceive": "You receive (at least)",
  "trade.placeOrder.makerFee": "Protocol fee ({bps}%) (maker)",
  "trade.placeOrder.caseBTakerNote":
    "When a taker fills this order by selling {feeSide}, the protocol fee ({bps}%) is deducted from the taker's {quote} receive. Your payment ({makerToken}) is unchanged.",
  "trade.placeOrder.connectWallet": "Connect wallet",
  "trade.placeOrder.wrongNetwork": "Switch to a supported network",
  "trade.placeOrder.pairNotAvailable": "Pair not available on this network",
  "trade.placeOrder.enterPrice": "Enter a price",
  "trade.placeOrder.enterAmount": "Enter an amount",
  "trade.placeOrder.waitingForWallet": "Waiting for wallet…",
  "trade.placeOrder.signOrder": "Sign Order",
  "trade.placeOrder.couldNotBuild": "Could not build order amounts",
  "trade.placeOrder.buy": "Buy {base}",
  "trade.placeOrder.sell": "Sell {base}",
  "trade.placeOrder.balances": "Wallet Balance",
  "trade.placeOrder.balanceConnect": "Connect wallet to see your balance",
  "trade.placeOrder.notDeployedHere": "—",
  "trade.placeOrder.wrongNetworkBalance": "Switch to a supported network to see your balance",
  "trade.placeOrder.approveAndSign": "Approve & sign {symbol}",
  "trade.placeOrder.approvingStep1": "Approving {symbol} (1/2)…",
  "trade.placeOrder.approvingStep2": "Approving {symbol} (2/2)…",
  "trade.placeOrder.approvingErc20": "Approving {symbol}…",
  "trade.placeOrder.orderSigned": "Order signed. Signature:",
  "trade.placeOrder.orderPosted":
    "Posted to the book. The taker side will see your order within a poll cycle.",
  "trade.placeOrder.orderPlacedHeader": "Order placed",
  "trade.placeOrder.orderFailedHeader": "Order failed",

  // Trade page — RecentTrades
  "trade.recentTrades.title": "Recent Trades",
  "trade.recentTrades.price": "Price",
  "trade.recentTrades.amount": "Amount",
  "trade.recentTrades.time": "Time",
  "trade.recentTrades.live": "live",
  "trade.recentTrades.syncing": "syncing",
  "trade.recentTrades.loading": "Loading recent fills…",
  "trade.recentTrades.empty": "No fills in the last 24 hours.",

  // Trade page — StandingAllowanceBanner
  "trade.standingAllowance.headline":
    "Old standing allowance detected",
  "trade.standingAllowance.body":
    "Your wallet still grants Permit2 a blanket spend right on SCENTDEX for {tokens}. Round-3 orders carry their own per-order signatures, so this allowance is no longer needed and is broader than what you actually want to authorise. Revoke to collapse it to zero — one transaction per token.",
  "trade.standingAllowance.revokeAll": "Revoke {count}",
  "trade.standingAllowance.revoking": "Revoking… ({remaining} left)",

  // Trade page — SignConfirmModal
  "trade.signModal.title": "Confirm order signature",
  "trade.signModal.close": "Close",
  "trade.signModal.action": "Action",
  "trade.signModal.headlineSell": "Sell",
  "trade.signModal.headlineBuy": "Buy",
  "trade.signModal.forAtLeast": "for at least",
  "trade.signModal.youGive": "You give",
  "trade.signModal.youReceive": "You receive",
  "trade.signModal.afterFee": "(after fee)",
  "trade.signModal.protocolFee": "Protocol fee",
  "trade.signModal.expires": "Expires",
  "trade.signModal.maker": "Maker",
  "trade.signModal.yourWallet": "(your wallet)",
  "trade.signModal.phishingChecks": "Phishing checks",
  "trade.signModal.disclosure":
    "Signing this order does not move funds yet. The trade settles only when a taker fills your order on-chain. You can cancel anytime before expiry.",
  "trade.signModal.checksFailed":
    "One or more checks failed. Do not sign unless you understand the risk.",
  "trade.signModal.cancel": "Cancel",
  "trade.signModal.holdToSign": "Hold 3s to sign anyway",
  "trade.signModal.signingOverride": "Signing…",
  "trade.signModal.ruleDomainOk": "Domain: SCENTDEX on chainId {chainId}",
  "trade.signModal.ruleDomainFail":
    "No SCENTDEX V5 contract configured for this chain",
  "trade.signModal.ruleSelfOk": "You are signing on your own wallet",
  "trade.signModal.ruleSelfFail":
    "Order maker does not match the connected wallet",
  "trade.signModal.ruleSelfDetail": "wallet {wallet} ≠ maker {maker}",
  "trade.signModal.ruleFloorOk": "Taker amount is above the safety floor",
  "trade.signModal.ruleFloorFail":
    "Taker amount is below the safety floor (likely a bait order)",
  "trade.signModal.ruleRatioOk": "Price ratio is within safe bounds",
  "trade.signModal.ruleRatioFail":
    "Price ratio exceeds the safety cap (extreme price)",

  // Trade page — StatsBar
  "trade.statsBar.volume24h": "24H Volume",
  "trade.statsBar.high24h": "24H High",
  "trade.statsBar.low24h": "24H Low",
  "trade.statsBar.makerFee": "Maker Fee",
  "trade.statsBar.makerFeeSuffix": "deducted from receive on sell",
  "trade.orderbook.crossedWarning":
    "Orderbook crossed — arbitrage opportunity available",
  "trade.orderbook.crossed": "crossed",

  // FillModal error messages
  "trade.fillError.title": "Fill failed",
  "trade.fillError.walletRejected": "You declined the request in your wallet.",
  "trade.fillError.timeout":
    "This order has already been filled by someone else.",
  "trade.fillError.alreadyFilled":
    "This order has already been filled by someone else.",
  "trade.fillError.cancelled": "The maker cancelled this order before your fill landed.",
  "trade.fillError.allCancelled":
    "All orders have been globally cancelled by the maker.",
  "trade.fillError.expired": "This order has expired.",
  "trade.fillError.invalidNonce":
    "Permit2 nonce is out of sync. Try re-signing the order or the fill.",
  "trade.fillError.invalidSignature":
    "Maker signature on this order is no longer valid.",
  "trade.fillError.takerBelowFloor":
    "Fill amount is below the minimum for this token.",
  "trade.fillError.priceRatio":
    "Order price ratio is outside the protocol cap.",
  "trade.fillError.permit2TokenMismatch":
    "Permit2 token does not match the order's token.",
  "trade.fillError.permit2SpenderMismatch":
    "Permit2 spender does not match the DEX.",
  "trade.fillError.permit2AmountInsufficient":
    "Permit2 allowance is insufficient for this fill.",
  "trade.fillError.blacklisted":
    "One of the parties is blacklisted on this DEX.",
  "trade.fillError.tokenNotAllowed":
    "One of the tokens is not allowed on this DEX anymore.",
  "trade.fillError.pairNotEnabled":
    "This trading pair has been disabled.",
  "trade.fillError.zeroFill": "Fill amount cannot be zero.",
  "trade.fillError.zeroResidual":
    "Order has no fillable amount left after rounding.",
  "trade.fillError.feeSideMismatch":
    "Order's fee side no longer matches the pair config.",
  "trade.fillError.feeBpsMismatch":
    "Order's fee rate no longer matches the pair config.",
  "trade.fillError.revertedWith": "Reverted with",
  "trade.fillError.reverted": "Transaction reverted on chain.",
  "trade.fillError.unknown": "Fill failed for an unknown reason.",
  "trade.fillError.gasLimitTooHigh":
    "Gas limit was set too high. Refresh the page and try again.",
  "trade.fillError.insufficientFunds":
    "Insufficient ETH in your wallet to cover gas.",
  "trade.fillError.networkError":
    "Network error while reaching the chain. Please retry.",
  "trade.fillError.closeAndRetry": "Close and try again",

  "trade.fillModal.title": "Fill order",
  "trade.fillModal.pair": "Pair",
  "trade.fillModal.maker": "Maker",
  "trade.fillModal.price": "Price",
  "trade.fillModal.youReceive": "You receive",
  "trade.fillModal.youReceiveGross": "You receive (before fee)",
  "trade.fillModal.youReceiveNet": "You receive (after fee)",
  "trade.fillModal.protocolFee": "Protocol fee ({bps}%)",
  "trade.fillModal.youPay": "You pay",
  "trade.fillModal.orderStatus": "Order status",
  "trade.fillModal.cantFillOwn": "You can't fill your own order. Use Cancel instead.",
  "trade.fillModal.missingPermit":
    "This order is missing the per-order Permit2 signature (legacy). The maker needs to re-post it.",
  "trade.fillModal.switchNetwork": "Switch to a supported network to fill.",
  "trade.fillModal.settled": "Filled — settlement confirmed on-chain.",
  "trade.fillModal.button.filled": "Filled",
  "trade.fillModal.button.approving": "Approving {symbol}…",
  "trade.fillModal.button.signPermit": "Sign Permit2…",
  "trade.fillModal.button.waitingWallet": "Waiting for wallet…",
  "trade.fillModal.button.confirmingTx": "Confirming on-chain…",
  "trade.fillModal.button.approve": "Approve {symbol}",
  "trade.fillModal.button.fill": "Fill — pay {amount} {symbol}",
  "trade.fillModal.footnote":
    "Two wallet popups: one Permit2 signature (off-chain, no gas) + one on-chain fillOrder transaction. Plus a one-time ERC-20 → Permit2 approval if you haven't done it before.",
  "trade.fillModal.statusOpen": "open",
  "trade.fillModal.statusPartiallyFilled": "partially filled",
  "trade.fillModal.statusFilled": "filled",
  "trade.fillModal.statusCancelled": "cancelled",
  "trade.fillModal.statusExpired": "expired",
  "trade.fillModal.walletPopupHint":
    "Check your wallet popup and approve / sign the request to continue.",
  "trade.fillModal.previewFeeError":
    "Couldn't read the on-chain fee preview for this order. Filling is disabled until it resolves — close and retry, or check your network.",

  "footer.terms": "Terms of Service",
  "footer.privacy": "Privacy Policy",
  "footer.contact": "Contact: cs@scenttoken.com",
  "footer.copyright":
    "© Universal Scent Technology Pte. Ltd. All rights reserved.",

  "legal.translation.notice":
    "This is a convenience translation. The English version is the authoritative original — in case of conflict, the English version prevails.",

  "terms.consent.prefix": "I have read and agree to the",
  "terms.consent.termsLink": "Terms of Service",
  "terms.consent.privacyLink": "Privacy Policy",
  "terms.consent.joiner": "and",
  "terms.consent.suffix": ".",
  "terms.consent.required":
    "Please tick the box to confirm you accept the Terms before placing this order.",

  "cookie.banner.body":
    "We use cookies for security, language preference, and basic analytics. By using this site you agree to our use of cookies.",
  "cookie.banner.accept": "Accept",
  "cookie.banner.rejectNonEssential": "Essential only",
  "cookie.banner.learnMore": "Learn more",

  "onboarding.banner.text":
    "ScentDEX is a peer-to-peer marketplace — orders fill when someone takes them, not automatically.",
  "onboarding.banner.cta": "Learn more →",
  "onboarding.banner.dismissAria": "Dismiss banner",

  "activeOffers.heading": "Active Offers",
  "activeOffers.subtext":
    "Open orders waiting for a counterparty. Click any offer to take it.",
  "activeOffers.badge.sell": "SELL",
  "activeOffers.badge.buy": "BUY",
  "activeOffers.label.maker": "Maker:",
  "activeOffers.label.filled": "Filled: {pct}%",
  "activeOffers.label.ago_just_now": "just now",
  "activeOffers.label.ago_minutes": "{n}m ago",
  "activeOffers.label.ago_hours": "{n}h ago",
  "activeOffers.label.ago_days": "{n}d ago",
  "activeOffers.button.take": "Take this offer",
  "activeOffers.button.loading": "Loading…",
  "activeOffers.disabled.own": "Your offer — can't take your own",
  "activeOffers.disabled.balance": "Insufficient {token} to take this",
  "activeOffers.empty.title": "No active offers yet.",
  "activeOffers.empty.body":
    "Place an order to start the market, or check back in a moment.",

  "faq.page.title": "FAQ",
  "faq.notFilled.title": "Why isn't my order filled?",
  "faq.notFilled.body":
    "Your order sits on ScentDEX as a *limit order* — it waits on the book until another trader (a \"taker\") decides to fill it. Nothing fills it automatically. This is by design: ScentDEX is a peer-to-peer marketplace, not a centralized matching engine.\n\n**Tips to get filled faster:**\n\n- **Tighten your price.** The closer your price is to the current best ask/bid, the more attractive your order looks to takers.\n- **Be patient.** Orders can sit for minutes or hours before a counterparty arrives, especially during low-volume windows.\n- **Browse Active Offers.** If you're willing to take an existing offer instead of placing one, scroll down to *Active Offers* and tap one — your trade settles immediately on-chain.\n\nIf your order has been on the book for a long time and the market has moved past it, you can always cancel it and replace it at a new price. Cancellation is on-chain and gas-paid by you.",
  "faq.howItWorks.title": "How does ScentDEX work? (vs centralized exchanges)",
  "faq.howItWorks.body":
    "ScentDEX is a **peer-to-peer limit-order marketplace**. Every offer you see on the book or in Active Offers was posted by another user. When you take an offer, the trade settles directly on-chain — no broker, no custodian, no matching engine in the middle.\n\n**Quick comparison:**\n\n|                              | Centralized exchange (CEX) | ScentDEX                  |\n|------------------------------|----------------------------|---------------------------|\n| Who matches orders?          | Exchange's matching engine | You do — by taking offers |\n| Where do funds sit?          | In the exchange's custody  | In your wallet            |\n| What does the maker pay?     | Trading fees on fill       | Zero gas to post an order |\n| What does the taker pay?     | Trading fees on fill       | Gas + fee on fill         |\n| Where are orders stored?     | Exchange's database        | Off-chain, signed by maker; settled on-chain |\n| Can the operator censor you? | Yes                        | No — settlement is on-chain |\n\n**What this means in practice:**\n\n- Posting an order is free (no gas). It's a signed message, not a transaction.\n- Taking an order requires a wallet signature and gas, because settlement happens on-chain.\n- Your assets never leave your wallet until the moment a trade settles.\n- ScentDEX itself never holds your funds.\n\nIf you're used to a CEX, the main mindset shift is this: **the order book is a list of standing offers, not a queue that fills itself**. To trade right now, take an existing offer. To trade at your own price, post one and wait.",
};

const ja: Dictionary = {
  "header.nav.home": "ホーム",
  "header.nav.trade": "取引",

  "hero.title.line1": "Scent Token を、",
  "hero.title.line2": "あなたから誰かへ。",
  "hero.tagline":
    "SCENTDEX は、Scent Token を売りたい人と買いたい人をつなぐ場所です。間に取引所が入って預かることはなく、あなたとお相手が直接、その場で交換します。交換の瞬間まで、トークンはずっとあなたの手元にあります。",
  "hero.cta.primary": "取引画面を開く →",
  "hero.cta.secondary": "ソースコードを見る",

  "what.kicker": "01",
  "what.title": "SCENTDEX とは",
  "what.body1":
    "Scent Token を、別の誰かと直接交換するためのサービスです。フリマアプリのように、出品(売り注文)を出すか、他の人の出品を見て買うか、どちらでも参加できます。",
  "what.body2":
    "ふつうの取引所と違うのは、SCENTDEX があなたのトークンを預からないという点です。「成立した瞬間に、双方の財布の中身が同時に入れ替わる」だけ。失敗すれば何も動きません。途中で止まることはなく、相手が裏切ることもできません。",
  "what.card1.title": "トークンを預けない",
  "what.card1.body":
    "サービスがあなたのトークンを保管することは一度もありません。取引が成立した瞬間に、お互いの財布の中身が同時に動きます。",
  "what.card2.title": "何度もチェック済み",
  "what.card2.body":
    "社内の専門チームに加えて、AI による多段レビュー、業界標準の自動解析ツール 5 種、すべてで問題なし。本格運用の前にさらに第三者の正式監査を受けます。",
  "what.card3.title": "あなたが OK しないと動かない",
  "what.card3.body":
    "注文や取引が動くのは、あなたが署名(承認)したときだけ。気が変わったらいつでも無料で取り消しできます。",

  "how.kicker": "02",
  "how.title": "取引の流れ",
  "how.maker.who": "売る人",
  "how.maker.summary": "自分の希望価格で Scent Token を売りたい場合",
  "how.maker.steps": [
    "ウォレット(MetaMask など)を画面右上から接続",
    "初回のみ、各トークンに「Permit2 を使ってもいい」という許可を出します(トークンごとに 1 回だけ)",
    "価格・数量・有効期限を入力して、注文に署名(=ハンコを押す)",
    "署名はメッセージへの押印だけ。手数料(ガス代)はかかりません",
    "あなたの注文が掲示板に並び、誰かが買いに来るか、期限切れまで残ります",
  ],
  "how.taker.who": "買う人",
  "how.taker.summary": "掲示板に並ぶ売り注文を見て、買いたい場合",
  "how.taker.steps": [
    "掲示板から、欲しい価格の注文をクリック",
    "ウォレットで承認 → 購入処理が 1 ブロック(約 12 秒)で完了",
    "売り手のトークンがあなたへ、あなたの代金が売り手へ、手数料が運営トレジャリーへ — 一度に動きます",
    "もし途中で何かがうまくいかなかったら(残高不足など)、すべて元に戻ります。中途半端な状態にはなりません。",
  ],

  "permit.kicker": "03",
  "permit.title": "Permit2 という仕組み",
  "permit.body1":
    "Permit2 とは、いわば「使い回しの利く合鍵」です。Uniswap という別のサービスが作った仕組みで、多くの取引アプリが共通で使っています。",
  "permit.body2":
    "ふつうは、新しいアプリを使うたびに「ここにトークンを使う許可をください」という承認(=手数料がかかる手続き)が必要です。Permit2 はこの「承認」を一度だけ済ませておくと、以降は取引のたびに署名(無料、ボタンを押すだけ)で済むようにしてくれます。",
  "permit.without.heading": "Permit2 を使わない場合",
  "permit.without.items": [
    "Uniswap で使う前に → 承認(手数料)",
    "SCENTDEX で使う前に → 承認(手数料)",
    "別の取引所で使う前に → 承認(手数料)",
    "毎回ガス代と承認画面が増える",
  ],
  "permit.with.heading": "Permit2 を使う場合",
  "permit.with.items": [
    "Permit2 にだけ承認(トークンごとに 1 回)",
    "あとは取引のたびに署名(無料)",
    "署名 1 回で全部の手続きが同時に進む",
    "対応するアプリ全部で同じ許可を共有",
  ],
  "permit.outro":
    "SCENTDEX が Permit2 を使うのは、ガス代を節約しつつ、売る人・買う人・運営トレジャリーの 3 方向の動きを 1 度の処理で終わらせるためです。便利になる反面、「ボタンを押す前にちゃんと中身を確認すること」が大事になります。次のセクションで、そのチェック方法を説明します。",

  "phish.kicker": "04",
  "phish.title": "騙されないための仕組み",
  "phish.body1":
    "2024 年、Permit2 を狙った詐欺によって、世界中でおよそ 26 万人が合計 $314M(約 470 億円)を失いました。原因の多くは、本物そっくりの偽サイトでうっかり署名してしまったこと。署名の中身は実は「全財産の使用許可」だった、というケースがほとんどです。",
  "phish.body2":
    "SCENTDEX は、ウォレットに署名を求める前に、画面の中で 4 つのチェックを必ず実行します。1 つでも失敗すると、署名ボタンが赤い警告に変わり、3 秒長押ししないと進めない仕様になります。うっかりクリックは起きません。",
  "phish.rule1.title": "正規のサイトかどうか",
  "phish.rule1.body":
    "今あなたが署名しようとしている相手が、本物の SCENTDEX のコントラクトと一致しているかを確認します。偽サイトはここで弾かれます。",
  "phish.rule2.title": "あなた自身の注文か",
  "phish.rule2.body":
    "注文の「売主」が、今接続しているあなたのウォレットと一致しているかを確認します。誰か別の人になりすました署名要求はここで止まります。",
  "phish.rule3.title": "価格が極端に安すぎないか",
  "phish.rule3.body":
    "「100 万 SCENT を 0.001 円で売る」のような明らかにおかしい注文を、自動的に検出して止めます。気付かなかった「ゼロが多すぎ・少なすぎ」も拾います。",
  "phish.rule4.title": "価格レートが妥当か",
  "phish.rule4.body":
    "一般的な相場から極端に離れた価格(時価の 1000 分の 1 等)は、間違いまたは詐欺の可能性が高いので、警告を出します。",
  "phish.outro":
    "さらに、署名画面では必ず内容を日本語で要約して表示します。「あなたが渡すもの:○○、受け取るもの(手数料を引いた後):○○、有効期限:◯月◯日」。この一文があなたの意図と違うなら、署名しないでください。",

  "audit.kicker": "05",
  "audit.title": "安全性のチェック状況",
  "audit.intro":
    "スマートコントラクト(自動で動くプログラム)に間違いがあると、資金が抜かれることがあります。SCENTDEX では、本格運用に向けて以下のチェックを段階的に行っています。",
  "audit.row1.label": "社内専門チームによるレビュー",
  "audit.row1.detail":
    "脅威分析・設計・攻撃シミュレーション・実装・監査・運用の 6 担当が、それぞれの目線で繰り返しチェック",
  "audit.row2.label": "AI による多段レビュー(Anthropic 提供)",
  "audit.row2.detail":
    "複数の AI エージェントが独立にコードを審査。4 ラウンド回した結果、最終ラウンドは指摘事項ゼロ",
  "audit.row3.label": "自動解析ツール 5 種",
  "audit.row3.detail":
    "業界標準のセキュリティチェッカー(Slither / Mythril / Aderyn / Wake / 4naly3er)を全て実行、すべて問題なし",
  "audit.row4.label": "別系統の AI レビュー(Codex)",
  "audit.row4.detail":
    "念のため別の AI ツールでも検証。3 件の指摘のうち 2 件を反映、1 件は意図的な仕様として記録",
  "audit.row5.label": "第三者の正式監査",
  "audit.row5.detail":
    "本格運用に進む前に、外部の専門監査会社に発注予定",
  "audit.row6.label": "バグ報奨金プログラム",
  "audit.row6.detail":
    "本番運用後、世界中の研究者が脆弱性を報告できる仕組みを開設予定",
  "audit.outro.prefix":
    "コードはすべて公開しています:github.com/ust-scent/scentdex-v5。脆弱性を見つけた方は",
  "audit.outro.contact": "cs@scenttoken.com",

  "faq.kicker": "06",
  "faq.title": "よくある質問",
  "faq.q1.q":
    "約定する前に、自分の SCENT を別のウォレットに移したらどうなる?",
  "faq.q1.a":
    "結論から言うと、何も壊れません。あなたは何も失いません。買い手が「fill」を押した瞬間、コントラクトはあなたのウォレットから SCENT を引き出そうとしますが、残高が無いため処理全体が巻き戻ります。あなたの資産は移した先にそのまま残り、買い手は失敗したトランザクションのガス代だけを損する形になります。買い手が無駄なガス代を踏まないよう、SCENTDEX は常に各 maker の残高と Permit2 allowance を監視していて、約定不能になった注文は自動的に板から非表示にします。",

  "cta.title": "さっそく試してみる",
  "cta.body":
    "ウォレットを接続し、トークンごとに 1 度だけ Permit2 を承認するところから。あなたが署名するまで、何も動きません。期限が来る前なら、いつでも注文を取り消せます。",
  "cta.button": "取引画面を開く →",

  // Trade page — BottomTabs
  "trade.tabs.orders": "注文一覧",
  "trade.tabs.history": "取引履歴",
  "trade.tabs.approvedTokens": "承認済みトークン",

  // Trade page — Approved Tokens (Permit2) tab
  "trade.approvedTokens.description":
    "このタブは承認の状態確認専用です。承認は最初に注文を署名するときに自動でリクエストされます。承認後の各注文は、その注文で指定した数量・有効期限の範囲だけ DEX が引き出せます。常時残る包括承認は DEX に存在しません。",
  "trade.approvedTokens.learnMore": "詳しく →",
  "trade.approvedTokens.notDeployed": "このネットワークにはデプロイされていません。",
  "trade.approvedTokens.connectWallet":
    "ウォレットを接続すると、{symbol} の残高と承認状況を確認できます。",
  "trade.approvedTokens.approved":
    "署名した注文に応じて Permit2 が {symbol} を移動できます。各約定は、その注文で署名した makerAmount の範囲を超えません。",
  "trade.approvedTokens.notApproved":
    "{symbol} の取引を開始するには初回の承認が必要です。最初の注文署名時にオンチェーン1回。以降の注文はオフチェーン署名のみ。",
  "trade.approvedTokens.approve": "{symbol} を承認する",
  "trade.approvedTokens.reApprove": "再承認",
  "trade.approvedTokens.approving": "承認中…",
  "trade.approvedTokens.reApproving": "再承認中…",
  "trade.approvedTokens.mintTest": "テストトークンを取得",
  "trade.approvedTokens.minting": "取得中…",
  "trade.approvedTokens.getMint": "{symbol} を 1,000 取得",
  "trade.approvedTokens.balance": "残高",
  "trade.approvedTokens.step1Label": "ステップ 1 · ERC-20 → Permit2",
  "trade.approvedTokens.step2Label": "ステップ 2 · Permit2 → SCENTDEX",
  "trade.approvedTokens.approvingStep1": "承認中（1/2）…",
  "trade.approvedTokens.approvingStep2": "承認中（2/2）…",
  "trade.approvedTokens.continueApproval": "承認を完了する",
  "trade.approvedTokens.partialDescription":
    "ステップ 1 は完了しました。約定可能にするには、もう 1 件のトランザクション（Permit2 → SCENTDEX）が必要です。",
  "trade.approvedTokens.statusNotApproved":
    "未承認です。{symbol} の注文に最初に署名するときに、オンチェーン承認 1 回が SCENTDEX から要求されます。事前にここから承認する必要はありません。",
  "trade.approvedTokens.revoke": "{symbol} の承認を解除",
  "trade.approvedTokens.revoking": "解除中…",

  // Trade page — MyOrders
  "trade.myOrders.active": "有効 ({count})",
  "trade.myOrders.historical": "過去 ({count})",
  "trade.myOrders.bulkCancel": "🗑 一括キャンセル",
  "trade.myOrders.pair": "ペア",
  "trade.myOrders.side": "売買",
  "trade.myOrders.price": "価格",
  "trade.myOrders.amountFilled": "数量 / 約定済み",
  "trade.myOrders.status": "状態",
  "trade.myOrders.action": "操作",
  "trade.myOrders.cancel": "キャンセル",
  "trade.myOrders.amount": "数量",
  "trade.myOrders.filled": "約定済み",
  "trade.myOrders.empty": "アクティブな注文はありません。右側から最初の注文を出してください。",
  "trade.myOrders.emptyHistorical": "過去の注文はまだありません。",
  "trade.myOrders.loading": "注文を読み込み中…",
  "trade.myOrders.connect": "注文を表示するにはウォレットを接続してください。",
  "trade.myOrders.cancelling": "キャンセル中…",
  "trade.myOrders.needsApproval": "約定不可",
  "trade.myOrders.needsApprovalTooltip":
    "署名済みですが現状約定できません: {symbol} の残高が makerAmount を下回っているか、ウォレット → Permit2 の承認が解除されています。「承認済みトークン」タブから再承認してください。",

  // Trade page — History
  "trade.history.time": "時刻",
  "trade.history.pair": "ペア",
  "trade.history.side": "売買",
  "trade.history.amount": "数量",
  "trade.history.price": "価格",
  "trade.history.role": "役割",
  "trade.history.counterparty": "相手方",
  "trade.history.protocolFee": "プロトコル手数料",
  "trade.history.empty": "約定履歴はまだありません。",
  "trade.history.connect": "取引履歴を表示するにはウォレットを接続してください。",

  // Trade page — OrderBook
  "trade.orderBook.title": "板情報",
  "trade.orderBook.noOrders": "このペアの注文はまだありません。\n最初の署名付き注文を出してみましょう。",
  "trade.orderBook.hiddenTooltip":
    "これらの注文のメイカーは残高または Permit2 の許可が不足しています。リバートされるため非表示にしています。",
  "trade.orderBook.hidden": "{count} 件の注文が非表示（メイカーの残高・許可が不足）",
  "trade.orderBook.spread": "スプレッド",
  "trade.orderBook.statusLoading": "読込中…",
  "trade.orderBook.statusEmpty": "なし",
  "trade.orderBook.statusAggregated": "集計済み",

  // Trade page — PlaceOrder
  "trade.placeOrder.title": "注文を出す",
  "trade.placeOrder.price": "価格",
  "trade.placeOrder.amount": "数量",
  "trade.placeOrder.expires": "有効期限",
  "trade.placeOrder.sizeSellQuestion": "{base} をどれくらい売りたい？",
  "trade.placeOrder.sizeBuyQuestion": "{quote} をどれくらい使いたい？",
  "trade.placeOrder.priceQuestionSell": "1 {base} をいくらで売りたい？",
  "trade.placeOrder.priceQuestionBuy": "1 {base} をいくらで買いたい？",
  "trade.placeOrder.marketPriceHint": "直近の約定価格: {price}",
  "trade.placeOrder.grossSell": "受取（手数料引き前、{symbol}）",
  "trade.placeOrder.grossBuy": "受取（手数料引き前、{symbol}）",
  "trade.placeOrder.expiryOption.1d": "1日",
  "trade.placeOrder.expiryOption.1w": "1週間",
  "trade.placeOrder.expiryOption.1mo": "1ヶ月",
  "trade.placeOrder.expiryOption.1y": "1年",
  "trade.placeOrder.total": "合計",
  "trade.placeOrder.youReceive": "受取額（最低）",
  "trade.placeOrder.makerFee": "プロトコル手数料 ({bps}%)（メイカー）",
  "trade.placeOrder.caseBTakerNote":
    "テイカーが {feeSide} を売却して約定した場合、テイカー側の受取 {quote} から {bps}% が差し引かれます。あなたの支払額（{makerToken}）は変わりません。",
  "trade.placeOrder.connectWallet": "ウォレットを接続",
  "trade.placeOrder.wrongNetwork": "対応ネットワークに切り替え",
  "trade.placeOrder.pairNotAvailable": "このネットワークでは取引ペアが利用できません",
  "trade.placeOrder.enterPrice": "価格を入力",
  "trade.placeOrder.enterAmount": "数量を入力",
  "trade.placeOrder.waitingForWallet": "ウォレット待機中…",
  "trade.placeOrder.signOrder": "注文に署名",
  "trade.placeOrder.couldNotBuild": "注文金額の計算に失敗しました",
  "trade.placeOrder.buy": "{base} を買う",
  "trade.placeOrder.sell": "{base} を売る",
  "trade.placeOrder.balances": "ウォレット残高",
  "trade.placeOrder.balanceConnect": "残高を表示するにはウォレットを接続してください",
  "trade.placeOrder.notDeployedHere": "—",
  "trade.placeOrder.wrongNetworkBalance": "残高を表示するには対応ネットワークに切り替えてください",
  "trade.placeOrder.approveAndSign": "{symbol} を承認して署名",
  "trade.placeOrder.approvingStep1": "{symbol} を承認中（1/2）…",
  "trade.placeOrder.approvingStep2": "{symbol} を承認中（2/2）…",
  "trade.placeOrder.approvingErc20": "{symbol} を承認中…",
  "trade.placeOrder.orderSigned": "署名:",
  "trade.placeOrder.orderPosted":
    "板に投稿しました。次のポーリングでテイカー側にも表示されます。",
  "trade.placeOrder.orderPlacedHeader": "注文を出しました",
  "trade.placeOrder.orderFailedHeader": "注文に失敗しました",

  // Trade page — RecentTrades
  "trade.recentTrades.title": "最近の取引",
  "trade.recentTrades.price": "価格",
  "trade.recentTrades.amount": "数量",
  "trade.recentTrades.time": "時刻",
  "trade.recentTrades.live": "ライブ",
  "trade.recentTrades.syncing": "同期中",
  "trade.recentTrades.loading": "最近の約定を読み込み中…",
  "trade.recentTrades.empty": "過去 24 時間に約定はありません。",

  // Trade page — StandingAllowanceBanner
  "trade.standingAllowance.headline":
    "以前の包括承認が残っています",
  "trade.standingAllowance.body":
    "{tokens} について、Permit2 から SCENTDEX への包括的な使用許可がまだ残っています。Round-3 の注文は注文ごとに個別署名を含むので、この包括承認はもう不要で、本来許可したい範囲より広くなっています。「解除」を押すとゼロに戻ります（トークンごとに 1 トランザクション）。",
  "trade.standingAllowance.revokeAll": "{count} 件を解除",
  "trade.standingAllowance.revoking": "解除中…（残り {remaining} 件）",

  // Trade page — SignConfirmModal
  "trade.signModal.title": "注文署名の確認",
  "trade.signModal.close": "閉じる",
  "trade.signModal.action": "操作内容",
  "trade.signModal.headlineSell": "売却",
  "trade.signModal.headlineBuy": "購入",
  "trade.signModal.forAtLeast": "→ 受取（最低）",
  "trade.signModal.youGive": "差し出す",
  "trade.signModal.youReceive": "受取",
  "trade.signModal.afterFee": "（手数料控除後）",
  "trade.signModal.protocolFee": "プロトコル手数料",
  "trade.signModal.expires": "有効期限",
  "trade.signModal.maker": "メイカー",
  "trade.signModal.yourWallet": "（あなたのウォレット）",
  "trade.signModal.phishingChecks": "フィッシング検査",
  "trade.signModal.disclosure":
    "署名してもこの時点では資金は動きません。テイカーがオンチェーンで約定したときに初めて取引が成立します。有効期限内であればいつでもキャンセル可能です。",
  "trade.signModal.checksFailed":
    "1 つ以上のチェックに失敗しています。リスクを理解していない場合は署名しないでください。",
  "trade.signModal.cancel": "キャンセル",
  "trade.signModal.holdToSign": "3 秒長押しで署名",
  "trade.signModal.signingOverride": "署名中…",
  "trade.signModal.ruleDomainOk": "ドメイン: chainId {chainId} の SCENTDEX",
  "trade.signModal.ruleDomainFail":
    "このチェーンには SCENTDEX V5 が設定されていません",
  "trade.signModal.ruleSelfOk": "ご自身のウォレットで署名しています",
  "trade.signModal.ruleSelfFail":
    "注文のメイカーが接続中のウォレットと一致しません",
  "trade.signModal.ruleSelfDetail": "ウォレット {wallet} ≠ メイカー {maker}",
  "trade.signModal.ruleFloorOk": "テイカー額は安全フロアを上回っています",
  "trade.signModal.ruleFloorFail":
    "テイカー額が安全フロアを下回っています（おとり注文の可能性）",
  "trade.signModal.ruleRatioOk": "価格比は安全範囲内です",
  "trade.signModal.ruleRatioFail":
    "価格比が安全上限を超えています（異常価格）",

  // Trade page — StatsBar
  "trade.statsBar.volume24h": "24H 出来高",
  "trade.statsBar.high24h": "24H 高値",
  "trade.statsBar.low24h": "24H 安値",
  "trade.statsBar.makerFee": "メイカー手数料",
  "trade.statsBar.makerFeeSuffix": "売り注文時、受取通貨から差引",
  "trade.orderbook.crossedWarning":
    "板が交差しています — アービトラージ機会あり",
  "trade.orderbook.crossed": "交差中",

  // FillModal error messages
  "trade.fillError.title": "約定に失敗しました",
  "trade.fillError.walletRejected": "ウォレットで取引を拒否しました。",
  "trade.fillError.timeout":
    "この注文は別の利用者によって既に約定済みです。",
  "trade.fillError.alreadyFilled":
    "この注文は別の利用者によって既に約定済みです。",
  "trade.fillError.cancelled":
    "あなたの約定が反映される前に、メイカーがこの注文をキャンセルしました。",
  "trade.fillError.allCancelled":
    "メイカーによってすべての注文が一括キャンセルされています。",
  "trade.fillError.expired": "この注文は有効期限が切れています。",
  "trade.fillError.invalidNonce":
    "Permit2 のnonceが不整合です。注文または約定を再署名してください。",
  "trade.fillError.invalidSignature":
    "メイカー署名が無効です。",
  "trade.fillError.takerBelowFloor":
    "約定数量がこのトークンの最小値を下回っています。",
  "trade.fillError.priceRatio":
    "注文の価格比がプロトコル上限を超えています。",
  "trade.fillError.permit2TokenMismatch":
    "Permit2 のトークンが注文のトークンと一致しません。",
  "trade.fillError.permit2SpenderMismatch":
    "Permit2 の spender が DEX と一致しません。",
  "trade.fillError.permit2AmountInsufficient":
    "Permit2 で承認された数量がこの約定に対して不足しています。",
  "trade.fillError.blacklisted":
    "関係者のいずれかが DEX でブラックリスト登録されています。",
  "trade.fillError.tokenNotAllowed":
    "対象トークンが DEX で取引許可されていません。",
  "trade.fillError.pairNotEnabled":
    "この取引ペアは現在無効化されています。",
  "trade.fillError.zeroFill": "約定数量がゼロです。",
  "trade.fillError.zeroResidual":
    "丸め誤差により約定可能な残量がありません。",
  "trade.fillError.feeSideMismatch":
    "注文の手数料サイドが現在のペア設定と一致しません。",
  "trade.fillError.feeBpsMismatch":
    "注文の手数料率が現在のペア設定と一致しません。",
  "trade.fillError.revertedWith": "コントラクト revert",
  "trade.fillError.reverted": "オンチェーン取引が失敗しました。",
  "trade.fillError.unknown": "不明な理由で約定に失敗しました。",
  "trade.fillError.gasLimitTooHigh":
    "ガス上限の設定が高すぎます。ページを再読み込みしてからお試しください。",
  "trade.fillError.insufficientFunds":
    "ウォレットの ETH 残高がガス代に対して不足しています。",
  "trade.fillError.networkError":
    "ネットワーク接続エラーが発生しました。もう一度お試しください。",
  "trade.fillError.closeAndRetry": "閉じてやり直す",

  "trade.fillModal.title": "注文を約定する",
  "trade.fillModal.pair": "ペア",
  "trade.fillModal.maker": "メイカー",
  "trade.fillModal.price": "価格",
  "trade.fillModal.youReceive": "受取",
  "trade.fillModal.youReceiveGross": "受取（手数料引き前）",
  "trade.fillModal.youReceiveNet": "実際の受取",
  "trade.fillModal.protocolFee": "プロトコル手数料 ({bps}%)",
  "trade.fillModal.youPay": "支払",
  "trade.fillModal.orderStatus": "注文ステータス",
  "trade.fillModal.cantFillOwn": "自分の注文は約定できません。代わりにキャンセルしてください。",
  "trade.fillModal.missingPermit":
    "この注文には注文単位の Permit2 署名がありません（旧形式）。メイカーが再投稿する必要があります。",
  "trade.fillModal.switchNetwork": "対応ネットワークに切り替えて約定してください。",
  "trade.fillModal.settled": "約定済み — オンチェーンで確定しました。",
  "trade.fillModal.button.filled": "約定済み",
  "trade.fillModal.button.approving": "{symbol} を承認中…",
  "trade.fillModal.button.signPermit": "Permit2 に署名…",
  "trade.fillModal.button.waitingWallet": "ウォレット応答待ち…",
  "trade.fillModal.button.confirmingTx": "オンチェーン確認中…",
  "trade.fillModal.button.approve": "{symbol} を承認",
  "trade.fillModal.button.fill": "約定 — {amount} {symbol} を支払う",
  "trade.fillModal.footnote":
    "ウォレットのポップアップは 2 回：Permit2 署名（オフチェーン・ガス不要）と、オンチェーンの fillOrder トランザクション。初回のみ、ERC-20 → Permit2 の承認も追加で必要です。",
  "trade.fillModal.statusOpen": "オープン",
  "trade.fillModal.statusPartiallyFilled": "一部約定",
  "trade.fillModal.statusFilled": "約定済み",
  "trade.fillModal.statusCancelled": "キャンセル済み",
  "trade.fillModal.statusExpired": "期限切れ",
  "trade.fillModal.walletPopupHint":
    "ウォレットのポップアップを確認して、承認または署名のボタンを押してください。",
  "trade.fillModal.previewFeeError":
    "この注文のオンチェーン手数料プレビューを取得できませんでした。解決するまで約定はできません — 一度閉じて再試行するか、ネットワークを確認してください。",

  "footer.terms": "利用規約",
  "footer.privacy": "プライバシーポリシー",
  "footer.contact": "お問い合わせ: cs@scenttoken.com",
  "footer.copyright":
    "© Universal Scent Technology Pte. Ltd. All rights reserved.",

  "legal.translation.notice":
    "本翻訳は参考のためのものです。英語版が正本であり、矛盾が生じた場合は英語版が優先します。",

  "terms.consent.prefix": "",
  "terms.consent.termsLink": "利用規約",
  "terms.consent.privacyLink": "プライバシーポリシー",
  "terms.consent.joiner": "および",
  "terms.consent.suffix": "を読み、これに同意します。",
  "terms.consent.required":
    "注文する前に、利用規約に同意するチェックボックスにチェックを入れてください。",

  "cookie.banner.body":
    "本サイトはセキュリティ、言語設定、基本的なアクセス解析のために Cookie を使用します。本サイトをご利用いただくことで、Cookie の使用に同意したものとみなされます。",
  "cookie.banner.accept": "同意する",
  "cookie.banner.rejectNonEssential": "必須のみ",
  "cookie.banner.learnMore": "詳細",

  // TODO(i18n): translate to Japanese. Keeping English as v1 placeholder.
  "onboarding.banner.text":
    "ScentDEX is a peer-to-peer marketplace — orders fill when someone takes them, not automatically.",
  "onboarding.banner.cta": "Learn more →",
  "onboarding.banner.dismissAria": "Dismiss banner",

  // TODO(i18n): translate to Japanese. Keeping English as v1 placeholder.
  "activeOffers.heading": "Active Offers",
  "activeOffers.subtext":
    "Open orders waiting for a counterparty. Click any offer to take it.",
  "activeOffers.badge.sell": "SELL",
  "activeOffers.badge.buy": "BUY",
  "activeOffers.label.maker": "Maker:",
  "activeOffers.label.filled": "Filled: {pct}%",
  "activeOffers.label.ago_just_now": "just now",
  "activeOffers.label.ago_minutes": "{n}m ago",
  "activeOffers.label.ago_hours": "{n}h ago",
  "activeOffers.label.ago_days": "{n}d ago",
  "activeOffers.button.take": "Take this offer",
  "activeOffers.button.loading": "Loading…",
  "activeOffers.disabled.own": "Your offer — can't take your own",
  "activeOffers.disabled.balance": "Insufficient {token} to take this",
  "activeOffers.empty.title": "No active offers yet.",
  "activeOffers.empty.body":
    "Place an order to start the market, or check back in a moment.",

  // TODO(i18n): translate to Japanese. Keeping English as v1 placeholder.
  "faq.page.title": "FAQ",
  "faq.notFilled.title": "Why isn't my order filled?",
  "faq.notFilled.body":
    "Your order sits on ScentDEX as a *limit order* — it waits on the book until another trader (a \"taker\") decides to fill it. Nothing fills it automatically. This is by design: ScentDEX is a peer-to-peer marketplace, not a centralized matching engine.\n\n**Tips to get filled faster:**\n\n- **Tighten your price.** The closer your price is to the current best ask/bid, the more attractive your order looks to takers.\n- **Be patient.** Orders can sit for minutes or hours before a counterparty arrives, especially during low-volume windows.\n- **Browse Active Offers.** If you're willing to take an existing offer instead of placing one, scroll down to *Active Offers* and tap one — your trade settles immediately on-chain.\n\nIf your order has been on the book for a long time and the market has moved past it, you can always cancel it and replace it at a new price. Cancellation is on-chain and gas-paid by you.",
  "faq.howItWorks.title": "How does ScentDEX work? (vs centralized exchanges)",
  "faq.howItWorks.body":
    "ScentDEX is a **peer-to-peer limit-order marketplace**. Every offer you see on the book or in Active Offers was posted by another user. When you take an offer, the trade settles directly on-chain — no broker, no custodian, no matching engine in the middle.\n\n**Quick comparison:**\n\n|                              | Centralized exchange (CEX) | ScentDEX                  |\n|------------------------------|----------------------------|---------------------------|\n| Who matches orders?          | Exchange's matching engine | You do — by taking offers |\n| Where do funds sit?          | In the exchange's custody  | In your wallet            |\n| What does the maker pay?     | Trading fees on fill       | Zero gas to post an order |\n| What does the taker pay?     | Trading fees on fill       | Gas + fee on fill         |\n| Where are orders stored?     | Exchange's database        | Off-chain, signed by maker; settled on-chain |\n| Can the operator censor you? | Yes                        | No — settlement is on-chain |\n\n**What this means in practice:**\n\n- Posting an order is free (no gas). It's a signed message, not a transaction.\n- Taking an order requires a wallet signature and gas, because settlement happens on-chain.\n- Your assets never leave your wallet until the moment a trade settles.\n- ScentDEX itself never holds your funds.\n\nIf you're used to a CEX, the main mindset shift is this: **the order book is a list of standing offers, not a queue that fills itself**. To trade right now, take an existing offer. To trade at your own price, post one and wait.",
};

// Stub other locales by reusing English. Full translations land in subsequent passes.
const ko: Dictionary = en;
const zhCN: Dictionary = en;
const zhTW: Dictionary = en;
const id: Dictionary = en;

const dictionaries: Record<SupportedLocale, Dictionary> = {
  en,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  id,
};

export type TranslationKey = keyof Dictionary;

export function getTranslation<K extends TranslationKey>(
  key: K,
  locale: string | null | undefined,
): Dictionary[K] {
  const resolved = resolveLocale(locale);
  const value = dictionaries[resolved]?.[key];
  if (value !== undefined) return value;
  return dictionaries[DEFAULT_LOCALE][key];
}

export function getTranslator(locale: string | null | undefined) {
  return <K extends TranslationKey>(key: K): Dictionary[K] =>
    getTranslation(key, locale);
}
