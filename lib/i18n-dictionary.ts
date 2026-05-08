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

  // Trade page — PlaceOrder
  "trade.placeOrder.title": string;
  "trade.placeOrder.price": string;
  "trade.placeOrder.amount": string;
  "trade.placeOrder.expires": string;
  "trade.placeOrder.total": string;
  "trade.placeOrder.youReceive": string;
  "trade.placeOrder.makerFee": string;
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

  // Trade page — RecentTrades
  "trade.recentTrades.title": string;
  "trade.recentTrades.price": string;
  "trade.recentTrades.amount": string;
  "trade.recentTrades.time": string;

  // Trade page — StatsBar
  "trade.statsBar.volume24h": string;
  "trade.statsBar.high24h": string;
  "trade.statsBar.low24h": string;
  "trade.statsBar.makerFee": string;
  "trade.statsBar.makerFeeSuffix": string;
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
    "No action needed before trading — approvals are requested automatically when you place your first order. This tab shows which tokens you have already approved.",
  "trade.approvedTokens.learnMore": "Learn more →",
  "trade.approvedTokens.notDeployed": "Not deployed on this network.",
  "trade.approvedTokens.connectWallet":
    "Connect your wallet to view your {symbol} balance and Permit2 status.",
  "trade.approvedTokens.approved":
    "Permit2 is approved. SCENTDEX can route your signed orders without another approve tx.",
  "trade.approvedTokens.notApproved":
    "Approve once to start trading {symbol}. You'll sign a single on-chain transaction granting Permit2 a max allowance.",
  "trade.approvedTokens.approve": "Approve {symbol}",
  "trade.approvedTokens.reApprove": "Re-approve",
  "trade.approvedTokens.approving": "Approving…",
  "trade.approvedTokens.reApproving": "Re-approving…",
  "trade.approvedTokens.mintTest": "Get 1,000 {symbol}",
  "trade.approvedTokens.minting": "Minting…",
  "trade.approvedTokens.getMint": "Get 1,000 {symbol}",
  "trade.approvedTokens.balance": "Balance",

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
  "trade.myOrders.connect": "Connect your wallet to see your orders.",
  "trade.myOrders.cancelling": "Cancelling…",
  "trade.myOrders.needsApproval": "Approval needed",
  "trade.myOrders.needsApprovalTooltip":
    "This order is signed but won't fill until you approve Permit2 for {symbol} (Approved Tokens tab).",

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

  // Trade page — PlaceOrder
  "trade.placeOrder.title": "Place Order",
  "trade.placeOrder.price": "Price",
  "trade.placeOrder.amount": "Amount",
  "trade.placeOrder.expires": "Expires",
  "trade.placeOrder.total": "Total",
  "trade.placeOrder.youReceive": "You receive (at least)",
  "trade.placeOrder.makerFee": "Protocol fee ({bps}%) (maker)",
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
  "trade.placeOrder.balances": "Balance",
  "trade.placeOrder.balanceConnect": "Connect wallet to see your balance",
  "trade.placeOrder.notDeployedHere": "—",

  // Trade page — RecentTrades
  "trade.recentTrades.title": "Recent Trades",
  "trade.recentTrades.price": "Price",
  "trade.recentTrades.amount": "Amount",
  "trade.recentTrades.time": "Time",

  // Trade page — StatsBar
  "trade.statsBar.volume24h": "24H Volume",
  "trade.statsBar.high24h": "24H High",
  "trade.statsBar.low24h": "24H Low",
  "trade.statsBar.makerFee": "Maker Fee",
  "trade.statsBar.makerFeeSuffix": "paid in {feeSide} (sell side)",
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
    "取引前に特別な操作は不要です。初回注文時に自動で承認が求められます。このタブは承認済みトークンの確認用です。",
  "trade.approvedTokens.learnMore": "詳しく →",
  "trade.approvedTokens.notDeployed": "このネットワークにはデプロイされていません。",
  "trade.approvedTokens.connectWallet":
    "ウォレットを接続すると、{symbol} の残高と承認状況を確認できます。",
  "trade.approvedTokens.approved":
    "承認済みです。SCENTDEX は署名済み注文をオンチェーンの承認なしに実行できます。",
  "trade.approvedTokens.notApproved":
    "{symbol} の取引を開始するには、Permit2 を一度承認してください。署名 1 回のオンチェーントランザクションで完了します。",
  "trade.approvedTokens.approve": "{symbol} を承認する",
  "trade.approvedTokens.reApprove": "再承認",
  "trade.approvedTokens.approving": "承認中…",
  "trade.approvedTokens.reApproving": "再承認中…",
  "trade.approvedTokens.mintTest": "テストトークンを取得",
  "trade.approvedTokens.minting": "取得中…",
  "trade.approvedTokens.getMint": "{symbol} を 1,000 取得",
  "trade.approvedTokens.balance": "残高",

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
  "trade.myOrders.connect": "注文を表示するにはウォレットを接続してください。",
  "trade.myOrders.cancelling": "キャンセル中…",
  "trade.myOrders.needsApproval": "承認が必要",
  "trade.myOrders.needsApprovalTooltip":
    "署名済みですが、{symbol} の Permit2 承認が完了するまで約定しません（「承認済みトークン」タブで承認してください）。",

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

  // Trade page — PlaceOrder
  "trade.placeOrder.title": "注文を出す",
  "trade.placeOrder.price": "価格",
  "trade.placeOrder.amount": "数量",
  "trade.placeOrder.expires": "有効期限",
  "trade.placeOrder.total": "合計",
  "trade.placeOrder.youReceive": "受取額（最低）",
  "trade.placeOrder.makerFee": "プロトコル手数料 ({bps}%)（メイカー）",
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
  "trade.placeOrder.balances": "残高",
  "trade.placeOrder.balanceConnect": "残高を表示するにはウォレットを接続してください",
  "trade.placeOrder.notDeployedHere": "—",

  // Trade page — RecentTrades
  "trade.recentTrades.title": "最近の取引",
  "trade.recentTrades.price": "価格",
  "trade.recentTrades.amount": "数量",
  "trade.recentTrades.time": "時刻",

  // Trade page — StatsBar
  "trade.statsBar.volume24h": "24H 出来高",
  "trade.statsBar.high24h": "24H 高値",
  "trade.statsBar.low24h": "24H 安値",
  "trade.statsBar.makerFee": "メイカー手数料",
  "trade.statsBar.makerFeeSuffix": "{feeSide} 建て（売り側）",
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
