import Image from "next/image";
import Link from "next/link";

export default function JaHomePage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
      <Hero />
      <Divider />
      <WhatIsSCENTDEX />
      <Divider />
      <HowItWorks />
      <Divider />
      <Permit2Section />
      <Divider />
      <PhishingSafety />
      <Divider />
      <AuditPosture />
      <Divider />
      <FinalCTA />
    </div>
  );
}

function Divider() {
  return <hr className="my-14 sm:my-20 border-line" />;
}

function Hero() {
  return (
    <section className="text-center pt-4 sm:pt-12">
      <Image
        src="/logo.svg"
        alt="SCENTDEX"
        width={120}
        height={120}
        priority
        className="mx-auto mb-8"
        style={{ filter: "drop-shadow(0 0 36px rgba(138, 92, 255, 0.4))" }}
      />
      <h1 className="text-[44px] sm:text-[64px] font-medium tracking-tight leading-[0.95] mb-5">
        Scent Token を、
        <br />
        Peer-to-Peer で。
      </h1>
      <p className="text-[17px] sm:text-[19px] text-fg-dim max-w-[600px] mx-auto leading-relaxed mb-9">
        SCENTDEX は、別のウォレットと直接取引する指値オーダー型の取引所です。
        <strong className="text-fg">エスクローなし</strong>、
        <strong className="text-fg">カストディなし</strong>。
        約定の瞬間まで、資金はあなたのウォレットの中にあります。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/trade"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-accent text-bg font-medium text-[15px] hover:opacity-90 transition-opacity"
        >
          取引画面を開く →
        </Link>
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-line text-fg-dim hover:text-fg hover:border-line-strong text-[15px]"
        >
          ソースコード
        </a>
      </div>
    </section>
  );
}

function WhatIsSCENTDEX() {
  return (
    <section>
      <SectionHeading kicker="01" title="SCENTDEX とは" />
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        SCENTDEX は、Scent Token (SCENT) のために作られた分散型取引所
        (DEX) です。Uniswap や Curve のようなプール型 DEX とは違い、SCENTDEX は
        本物の<strong className="text-fg">指値オーダーブック型</strong>です。
        価格・数量・有効期限を自分で決め、それに同意した別のウォレットと
        コントラクトがマッチングします。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          title="エスクローゼロ設計"
          body="コントラクトはあなたのトークンを一切預かりません。約定はアトミックに実行され、いずれかのレッグが失敗すれば取引全体が巻き戻ります。"
        />
        <FeatureCard
          title="監査ファースト"
          body="社内レッドチーム + 4 ラウンドのマルチエージェント自動レビュー + 業界標準の静的解析 5 ツールすべてクリーン。本格運用の前に外部による正式監査を受けます。"
        />
        <FeatureCard
          title="EIP-712 署名済みオーダー"
          body="オーダーはオフチェーンの署名メッセージとして存在します。キャンセルは無料、いつでも気が変われば取り下げ可能。秘密鍵が署名するのは、ウォレットが見せた内容そのものです。"
        />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section>
      <SectionHeading kicker="02" title="取引の流れ" />

      <div className="space-y-6">
        <FlowBlock
          who="Maker(メイカー)"
          summary="自分が決めた価格で SCENT を JPYC で売りたい人"
          steps={[
            "ウォレット接続(MetaMask、Rabby、Coinbase Wallet など、標準的な EOA なら何でも)",
            "初回のみ:各トークンに対して Permit2 を承認(トークンごとに 1 回だけ)",
            "「Place Order」を開いて価格・数量・有効期限を入力",
            "オーダーに署名 — メッセージへの署名のみ、トランザクション不要、ガス不要",
            "オーダーが公開オーダーブックに掲載され、誰かが約定するか期限切れ・キャンセルまで残ります",
          ]}
        />
        <FlowBlock
          who="Taker(テイカー)"
          summary="掲載されたオーダーを見て、価格に同意して約定する人"
          steps={[
            "オーダーブックを見て、約定したい価格レベルをクリック",
            "Fill トランザクションに署名・送信 — 1 ブロックで決済完了",
            "メイカーの SCENT がテイカーへ、テイカーの JPYC がメイカーへ、手数料が UST トレジャリーへ — すべて 1 つのトランザクションでアトミックに",
            "いずれかのレッグが失敗(残高不足・許可取り消し・期限切れ等)すれば、トランザクション全体が巻き戻り。中途半端な状態にはなりません。",
          ]}
        />
      </div>
    </section>
  );
}

function Permit2Section() {
  return (
    <section>
      <SectionHeading kicker="03" title="Permit2 とは" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        Permit2 は、Uniswap が作った小さなコントラクトです。
        DeFi の地味な不便さ —{" "}
        <strong className="text-fg">dApp ごとに毎回 approve しないといけない問題</strong>
        を解決します。Permit2 にトークンを 1 回承認しておくと、それ以降は
        対応する dApp はトランザクションではなく署名メッセージで個別の取引許可を求めます。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SmallCard
          heading="Permit2 なし"
          tone="bad"
          items={[
            "approve(Uniswap, MAX) — ガス必要",
            "approve(SCENTDEX, MAX) — ガス必要",
            "approve(別の DEX, MAX) — ガス必要",
            "毎回ガス + ウォレット承認画面",
          ]}
        />
        <SmallCard
          heading="Permit2 あり"
          tone="good"
          items={[
            "approve(Permit2, MAX) — トークンごとに 1 回だけ",
            "取引ごとにメッセージ署名(無料、トランザクションではない)",
            "Permit2 がアトミックに送金をルーティング",
            "対応する dApp 全体で同じ allowance を共有",
          ]}
        />
      </div>

      <p className="text-[15px] text-fg-faint leading-relaxed">
        SCENTDEX が Permit2 を使うのは、メイカー → テイカー → トレジャリーの
        3 つのレッグを 1 つのアトミックなトランザクションで完結させ、かつ
        取引ごとの追加 approve を不要にするためです。トレードオフは、セキュリティモデルが
        「特定のコントラクトを承認する」から「ウォレットが見せたメッセージを信頼する」に
        変わること。ここでフィッシングのリスクが出てきます — 次のセクションで説明します。
      </p>
    </section>
  );
}

function PhishingSafety() {
  return (
    <section>
      <SectionHeading kicker="04" title="フィッシング対策" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        2024 年、Permit2 系の typed-data フィッシングで、約{" "}
        <strong className="text-fg">26 万件のウォレットから合計 $314M(約 470 億円)</strong>
        が盗まれました。被害者の多くは正規サイトに見えるクローンサイトで
        メッセージに署名し、それが白紙の小切手だったことに気づいていませんでした。
      </p>
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        SCENTDEX は、ウォレットに署名を要求する前に
        <strong className="text-fg">4 つのチェック</strong>
        を画面上で実行します。1 つでも失敗すると、Sign ボタンは赤い警告に
        置き換わり、3 秒長押しの確認が必要になります — 何も考えずにクリックさせません。
      </p>

      <div className="space-y-3">
        <RuleCard
          n="1"
          title="ドメインチェック"
          body="署名対象のコントラクトが、接続中のネットワーク上の正規 SCENTDEX V5 デプロイと一致するか確認します。クローンサイトが別のコントラクトアドレスで署名要求すれば、このチェックで弾かれます。"
        />
        <RuleCard
          n="2"
          title="本人チェック"
          body="オーダー内のメイカーアドレスが、接続中のウォレットと一致するか確認します。フィッシングペイロードが別のアドレスでの署名を要求してきても、ここで検出します。"
        />
        <RuleCard
          n="3"
          title="フロアチェック"
          body="テイカー量がトークン別の安全フロアを上回っていることを確認します。「100万 SCENT を 2 wei で売る」のような囮オーダーは、数字に気づかなくてもこれで弾かれます。"
        />
        <RuleCard
          n="4"
          title="価格レシオチェック"
          body="価格レシオが設定された上限内に収まっているか確認します。極端な価格(時価の 1/1000 で渡す等)はこれで弾かれます。"
        />
      </div>

      <p className="text-[14px] text-fg-faint leading-relaxed mt-6">
        加えて、すべての署名要求を
        <strong className="text-fg-dim">プレーンな日本語のサマリー</strong>
        で表示します:「X を渡し、手数料 Z を引いた後 Y 以上を受け取る、有効期限 D」。
        この一文があなたの意図と違うなら、署名しないでください。
      </p>
    </section>
  );
}

function AuditPosture() {
  return (
    <section>
      <SectionHeading kicker="05" title="監査と運用" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuditRow
          status="done"
          label="社内レッドチームレビュー"
          detail="脅威インテリジェンス・コントラクト設計・レッドチーム戦略・エクスプロイト実装・静的監査・ガバナンスを担当する 6 部署の専門エージェント"
        />
        <AuditRow
          status="done"
          label="/ultrareview(Anthropic)4 ラウンド"
          detail="ラウンド 4 では source-only レビューブランチに対して 0 findings"
        />
        <AuditRow
          status="done"
          label="静的解析 5 ツール"
          detail="Slither、Mythril、Aderyn、Wake、4naly3er — V5 コントラクト全クリーン"
        />
        <AuditRow
          status="done"
          label="セカンダリレビュー(Codex)"
          detail="3 件の指摘、2 件を r6 に反映、1 件は意図的な設計選択として記録"
        />
        <AuditRow
          status="pending"
          label="外部正式監査"
          detail="本格運用に向けて TVL 増加前に発注予定"
        />
        <AuditRow
          status="pending"
          label="バグバウンティプログラム"
          detail="本番運用後、Immunefi 等で開設予定"
        />
      </div>

      <p className="text-[13px] text-fg-faint leading-relaxed mt-6">
        ソースコードは{" "}
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="text-accent hover:underline"
        >
          github.com/ust-scent/scentdex-v5
        </a>{" "}
        にあります。第三者のレビュアーやセキュリティ研究者の検証を歓迎します。
        脆弱性報告は{" "}
        <a
          href="mailto:cs@scenttoken.com"
          className="text-accent hover:underline"
        >
          cs@scenttoken.com
        </a>
        まで。
      </p>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="text-center py-6">
      <h2 className="text-[28px] sm:text-[36px] font-medium tracking-tight mb-3">
        準備はいいですか?
      </h2>
      <p className="text-[15px] text-fg-dim max-w-[480px] mx-auto leading-relaxed mb-7">
        ウォレットを接続し、トークンごとに 1 度だけ Permit2 を承認してから、
        最初のオーダーに署名してみてください。約定が起きるまで、
        資金はウォレットから出ません。期限前ならいつでもキャンセルできます。
      </p>
      <Link
        href="/trade"
        className="inline-flex items-center justify-center px-7 py-3 rounded-md bg-accent text-bg font-medium text-[15px]"
      >
        取引画面を開く →
      </Link>
    </section>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
        {kicker}
      </div>
      <h2 className="text-[26px] sm:text-[32px] font-medium tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-line rounded-lg p-5 bg-white/[0.015]">
      <div className="font-medium text-[15px] mb-2">{title}</div>
      <p className="text-[14px] text-fg-dim leading-relaxed">{body}</p>
    </div>
  );
}

function FlowBlock({
  who,
  summary,
  steps,
}: {
  who: string;
  summary: string;
  steps: string[];
}) {
  return (
    <div className="border border-line rounded-lg p-5 bg-white/[0.015]">
      <div className="flex items-baseline gap-3 mb-1 flex-wrap">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent">
          {who}
        </span>
        <span className="text-[14px] text-fg">{summary}</span>
      </div>
      <ol className="list-decimal list-inside space-y-1.5 mt-4 text-[14px] text-fg-dim leading-relaxed marker:text-fg-faint">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function SmallCard({
  heading,
  tone,
  items,
}: {
  heading: string;
  tone: "good" | "bad";
  items: string[];
}) {
  const accent = tone === "good" ? "border-buy/30 bg-buy/[0.03]" : "border-sell/30 bg-sell/[0.03]";
  const dot = tone === "good" ? "bg-buy" : "bg-sell";
  return (
    <div className={`border ${accent} rounded-lg p-4`}>
      <div className="font-medium text-[14px] mb-3">{heading}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-fg-dim">
            <span
              className={`mt-1.5 w-1 h-1 rounded-full ${dot} shrink-0`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 p-4 border border-line rounded-lg bg-white/[0.015]">
      <div
        className="shrink-0 w-8 h-8 rounded-full bg-accent text-bg flex items-center justify-center font-mono font-bold text-[14px]"
        aria-hidden="true"
      >
        {n}
      </div>
      <div>
        <div className="font-medium text-[15px] mb-1">{title}</div>
        <p className="text-[14px] text-fg-dim leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function AuditRow({
  status,
  label,
  detail,
}: {
  status: "done" | "pending";
  label: string;
  detail: string;
}) {
  const isDone = status === "done";
  return (
    <div className="border border-line rounded-lg p-4 bg-white/[0.015]">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono ${
            isDone ? "bg-buy/20 text-buy" : "bg-fg-faint/20 text-fg-faint"
          }`}
          aria-hidden="true"
        >
          {isDone ? "✓" : "·"}
        </span>
        <div>
          <div className="font-medium text-[14px] mb-1">{label}</div>
          <p className="text-[13px] text-fg-dim leading-relaxed">{detail}</p>
        </div>
      </div>
    </div>
  );
}
