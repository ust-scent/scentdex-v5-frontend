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
        あなたから誰かへ。
      </h1>
      <p className="text-[17px] sm:text-[19px] text-fg-dim max-w-[600px] mx-auto leading-relaxed mb-9">
        SCENTDEX は、Scent Token を売りたい人と買いたい人をつなぐ場所です。
        間に取引所が入って預かることはなく、
        <strong className="text-fg">あなたとお相手が直接、その場で交換</strong>します。
        交換の瞬間まで、トークンはずっとあなたの手元にあります。
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
          ソースコードを見る
        </a>
      </div>
    </section>
  );
}

function WhatIsSCENTDEX() {
  return (
    <section>
      <SectionHeading kicker="01" title="SCENTDEX とは" />
      <p className="text-[16px] text-fg-dim leading-relaxed mb-4">
        Scent Token を、別の誰かと直接交換するためのサービスです。
        フリマアプリのように、出品(売り注文)を出すか、
        他の人の出品を見て買うか、どちらでも参加できます。
      </p>
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        ふつうの取引所と違うのは、
        <strong className="text-fg">SCENTDEX があなたのトークンを預からない</strong>
        という点です。「成立した瞬間に、双方の財布の中身が同時に入れ替わる」だけ。
        失敗すれば何も動きません。途中で止まることはなく、
        相手が裏切ることもできません。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          title="トークンを預けない"
          body="サービスがあなたのトークンを保管することは一度もありません。取引が成立した瞬間に、お互いの財布の中身が同時に動きます。"
        />
        <FeatureCard
          title="何度もチェック済み"
          body="社内の専門チームに加えて、AI による多段レビュー、業界標準の自動解析ツール 5 種、すべてで問題なし。本格運用の前にさらに第三者の正式監査を受けます。"
        />
        <FeatureCard
          title="あなたが OK しないと動かない"
          body="注文や取引が動くのは、あなたが署名(承認)したときだけ。気が変わったらいつでも無料で取り消しできます。"
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
          who="売る人"
          summary="自分の希望価格で Scent Token を売りたい場合"
          steps={[
            "ウォレット(MetaMask など)を画面右上から接続",
            "初回のみ、各トークンに「Permit2 を使ってもいい」という許可を出します(トークンごとに 1 回だけ)",
            "価格・数量・有効期限を入力して、注文に署名(=ハンコを押す)",
            "署名はメッセージへの押印だけ。手数料(ガス代)はかかりません",
            "あなたの注文が掲示板に並び、誰かが買いに来るか、期限切れまで残ります",
          ]}
        />
        <FlowBlock
          who="買う人"
          summary="掲示板に並ぶ売り注文を見て、買いたい場合"
          steps={[
            "掲示板から、欲しい価格の注文をクリック",
            "ウォレットで承認 → 購入処理が 1 ブロック(約 12 秒)で完了",
            "売り手のトークンがあなたへ、あなたの代金が売り手へ、手数料が運営トレジャリーへ — 一度に動きます",
            "もし途中で何かがうまくいかなかったら(残高不足など)、すべて元に戻ります。中途半端な状態にはなりません。",
          ]}
        />
      </div>
    </section>
  );
}

function Permit2Section() {
  return (
    <section>
      <SectionHeading kicker="03" title="Permit2 という仕組み" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-4">
        Permit2 とは、いわば「
        <strong className="text-fg">使い回しの利く合鍵</strong>
        」です。Uniswap という別のサービスが作った仕組みで、
        多くの取引アプリが共通で使っています。
      </p>
      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        ふつうは、新しいアプリを使うたびに「ここにトークンを使う許可をください」
        という承認(=手数料がかかる手続き)が必要です。
        Permit2 はこの「承認」を一度だけ済ませておくと、
        以降は取引のたびに署名(無料、ボタンを押すだけ)で
        済むようにしてくれます。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SmallCard
          heading="Permit2 を使わない場合"
          tone="bad"
          items={[
            "Uniswap で使う前に → 承認(手数料)",
            "SCENTDEX で使う前に → 承認(手数料)",
            "別の取引所で使う前に → 承認(手数料)",
            "毎回ガス代と承認画面が増える",
          ]}
        />
        <SmallCard
          heading="Permit2 を使う場合"
          tone="good"
          items={[
            "Permit2 にだけ承認(トークンごとに 1 回)",
            "あとは取引のたびに署名(無料)",
            "署名 1 回で全部の手続きが同時に進む",
            "対応するアプリ全部で同じ許可を共有",
          ]}
        />
      </div>

      <p className="text-[15px] text-fg-faint leading-relaxed">
        SCENTDEX が Permit2 を使うのは、ガス代を節約しつつ、
        売る人・買う人・運営トレジャリーの 3 方向の動きを 1 度の処理で
        終わらせるためです。便利になる反面、
        「ボタンを押す前にちゃんと中身を確認すること」が大事になります。
        次のセクションで、そのチェック方法を説明します。
      </p>
    </section>
  );
}

function PhishingSafety() {
  return (
    <section>
      <SectionHeading kicker="04" title="騙されないための仕組み" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-4">
        2024 年、Permit2 を狙った詐欺によって、世界中で
        <strong className="text-fg">およそ 26 万人が合計 $314M(約 470 億円)</strong>
        を失いました。原因の多くは、本物そっくりの偽サイトで
        うっかり署名してしまったこと。署名の中身は実は
        「全財産の使用許可」だった、というケースがほとんどです。
      </p>
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        SCENTDEX は、ウォレットに署名を求める前に、
        <strong className="text-fg">画面の中で 4 つのチェック</strong>
        を必ず実行します。1 つでも失敗すると、
        署名ボタンが赤い警告に変わり、
        3 秒長押ししないと進めない仕様になります。
        うっかりクリックは起きません。
      </p>

      <div className="space-y-3">
        <RuleCard
          n="1"
          title="正規のサイトかどうか"
          body="今あなたが署名しようとしている相手が、本物の SCENTDEX のコントラクトと一致しているかを確認します。偽サイトはここで弾かれます。"
        />
        <RuleCard
          n="2"
          title="あなた自身の注文か"
          body="注文の「売主」が、今接続しているあなたのウォレットと一致しているかを確認します。誰か別の人になりすました署名要求はここで止まります。"
        />
        <RuleCard
          n="3"
          title="価格が極端に安すぎないか"
          body="「100 万 SCENT を 0.001 円で売る」のような明らかにおかしい注文を、自動的に検出して止めます。気付かなかった「ゼロが多すぎ・少なすぎ」も拾います。"
        />
        <RuleCard
          n="4"
          title="価格レートが妥当か"
          body="一般的な相場から極端に離れた価格(時価の 1000 分の 1 等)は、間違いまたは詐欺の可能性が高いので、警告を出します。"
        />
      </div>

      <p className="text-[14px] text-fg-faint leading-relaxed mt-6">
        さらに、署名画面では必ず内容を
        <strong className="text-fg-dim">日本語で要約</strong>
        して表示します。
        「あなたが渡すもの:○○、受け取るもの(手数料を引いた後):○○、有効期限:◯月◯日」。
        この一文があなたの意図と違うなら、署名しないでください。
      </p>
    </section>
  );
}

function AuditPosture() {
  return (
    <section>
      <SectionHeading kicker="05" title="安全性のチェック状況" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        スマートコントラクト(自動で動くプログラム)に間違いがあると、
        資金が抜かれることがあります。SCENTDEX では、
        本格運用に向けて以下のチェックを段階的に行っています。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuditRow
          status="done"
          label="社内専門チームによるレビュー"
          detail="脅威分析・設計・攻撃シミュレーション・実装・監査・運用の 6 担当が、それぞれの目線で繰り返しチェック"
        />
        <AuditRow
          status="done"
          label="AI による多段レビュー(Anthropic 提供)"
          detail="複数の AI エージェントが独立にコードを審査。4 ラウンド回した結果、最終ラウンドは指摘事項ゼロ"
        />
        <AuditRow
          status="done"
          label="自動解析ツール 5 種"
          detail="業界標準のセキュリティチェッカー(Slither / Mythril / Aderyn / Wake / 4naly3er)を全て実行、すべて問題なし"
        />
        <AuditRow
          status="done"
          label="別系統の AI レビュー(Codex)"
          detail="念のため別の AI ツールでも検証。3 件の指摘のうち 2 件を反映、1 件は意図的な仕様として記録"
        />
        <AuditRow
          status="pending"
          label="第三者の正式監査"
          detail="本格運用に進む前に、外部の専門監査会社に発注予定"
        />
        <AuditRow
          status="pending"
          label="バグ報奨金プログラム"
          detail="本番運用後、世界中の研究者が脆弱性を報告できる仕組みを開設予定"
        />
      </div>

      <p className="text-[13px] text-fg-faint leading-relaxed mt-6">
        コードはすべて公開しています:
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="text-accent hover:underline"
        >
          github.com/ust-scent/scentdex-v5
        </a>
        。脆弱性を見つけた方は{" "}
        <a
          href="mailto:cs@scenttoken.com"
          className="text-accent hover:underline"
        >
          cs@scenttoken.com
        </a>
        までご連絡ください。
      </p>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="text-center py-6">
      <h2 className="text-[28px] sm:text-[36px] font-medium tracking-tight mb-3">
        さっそく試してみる
      </h2>
      <p className="text-[15px] text-fg-dim max-w-[480px] mx-auto leading-relaxed mb-7">
        ウォレットを接続し、トークンごとに 1 度だけ Permit2 を承認するところから。
        あなたが署名するまで、何も動きません。
        期限が来る前なら、いつでも注文を取り消せます。
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
