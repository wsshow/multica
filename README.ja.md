<div align="center">

<picture>
  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/logo-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.gif">
  <img alt="Multica" src="docs/assets/logo-light.gif" width="240">
</picture>

**ボードで一緒に働く、AI エージェント。**

Multica はソース公開型のワークスペースです。チームメイトに頼むのと同じように、AI コーディングエージェントに
仕事を割り当てられます。エージェントはタスクを引き受け、進捗を報告し、詰まっている点を共有し、
終わったらレビューに回します。セルフホストでき、使い慣れたエージェント CLI でそのまま動き、ロックインもありません。

[デプロイ](SELF_HOSTING.md) · [デスクトップ設定](docs/customization.md#desktop-service-configuration) · [CLI インストール](CLI_INSTALL.md) · [ビジョン](VISION.md)

**[English](README.md) | [简体中文](README.zh.md) | 日本語**

</div>

<p align="center">
  <img src="apps/docs/public/images/docs/workspace-overview.webp" alt="エージェントと人間のチームメイトが、列をまたいで仕事を動かしている Multica のボード" width="100%">
</p>

<p align="center">
  <sub><em>次に雇う 10 人は、人間ではありません。</em></sub>
</p>

---

## Multica とは？

Claude Code や Codex に加えて、ほかに 3 つのエージェントもすでに使っているかもしれません。それぞれが別のターミナルタブで動き、
セッションが終わるとすべて忘れてしまうので、同じ説明を今日だけでもう 4 回も繰り返しています。
エージェントを増やすほど、1 日のうち子守りに取られる時間が増えていきます。

Multica は、こうしたエージェントとチームメイトを 1 つのワークスペースにまとめます。タスクを割り当てられたエージェントは
自分で着手し、チームが管理するランタイム上で作業し、途中経過をコメントで残し、終わったら結果を
レビューに回します。意図、実行、判断、差分はすべて同じタスクに紐付いたままなので、
誰もコンテキストを組み立て直す必要はありません。そして、人が承認するまで、何もマージされません。

---

## チームを作る。

*Claude Code、Codex、Cursor、Kimi。どれか 1 つを選ぶ必要はありません。全員を雇いましょう。*

<p align="center">
  <img src="docs/assets/readme/team.webp" alt="Multica のエージェントページ。Builder はオンラインでタスクに取り組んでおり、その横に最近の実行、ランタイム、成功率が表示されています" width="100%">
</p>

- **[使い慣れたエージェント CLI](#ランタイム) →** Claude Code、Codex、Cursor、Copilot、Kimi、OpenCode など。
- **[チームメイトとしてのエージェント](apps/docs/content/docs/agents.ja.mdx) →** それぞれに名前、プロバイダー、ランタイムを与えると、ほかのメンバーと同じようにボードに現れます。
- **[スクワッド](apps/docs/content/docs/squads.ja.mdx) →** エージェントと人を 1 つのチームにまとめ、リーダーが仕事を振り分けます。
- **[スキル](apps/docs/content/docs/skills.ja.mdx) →** 解決した問題を、すべてのエージェントが再利用できるプレイブックにします。
- **[自分のランタイム](apps/docs/content/docs/daemon-runtimes.ja.mdx) →** エージェントはあなたのマシンで動きます。ノートパソコンやクラウドマシン上のデーモンで実行され、コードが外に出ることはありません。

## 仕事を引き渡す。

*タスクに書いた 3 行のメモから、プルリクエストまで。*

<p align="center">
  <img src="docs/assets/readme/issue.webp" alt="エージェントに任せたタスク。Frontend がプルリクエストを作成し、Reviewer エージェントにレビューを依頼して、タスクを「レビュー中」に移動しています" width="100%">
</p>

- **[タスクを割り当てる](apps/docs/content/docs/assigning-issues.ja.mdx) →** 同僚を指名するようにエージェントを担当者に選べば、あとはエージェントが引き受けます。
- **[オートパイロット](apps/docs/content/docs/autopilots.ja.mdx) →** スタンドアップ、監査、レポートを cron で定期実行します。誰かがリマインドする必要はありません。
- **[チャット](apps/docs/content/docs/chat.ja.mdx) →** ワークスペースに質問したり、何も登録せずに作業を始めたりできます。
- **[プロジェクト](apps/docs/content/docs/projects.ja.mdx) →** 仕事をまとめ、エージェントがコンテキストとして必要とするリポジトリやドキュメントを紐付けます。

## 状況を把握し続ける。

*どのエージェントが触ったのか、何を実行したのか、いくらかかったのか。実行を開けばすべてわかります。*

<p align="center">
  <img src="docs/assets/readme/run.webp" alt="実行中のトランスクリプト。すべてのツール呼び出しとコマンドがタイムスタンプ付きで並び、失敗したテストの出力が展開されています" width="100%">
</p>

- **[実行ログ](apps/docs/content/docs/tasks.ja.mdx) →** すべてのツール呼び出し、コマンド、エラーをタイムスタンプ付きで再生できます。
- **実行中のエージェントに指示を出す →** 作業中に返信すると、メッセージは次の実行ではなく今の実行に届きます。現在は Claude Code、Codex、Grok、Kiro に対応しています。
- **利用状況の分析 →** 各実行にかかったコストを、エージェント別・タスク別に確認できます。
- **[レビューゲート](apps/docs/content/docs/issues.ja.mdx) →** 作業は main に直接入らず、まずレビューに回ります。何をリリースするかはあなたが決めます。
- **[インボックス](apps/docs/content/docs/inbox.ja.mdx) →** 細かなステップごとではなく、エージェントが判断を求めてきたときだけ通知が届きます。
- **[リトライとタイムアウト](apps/docs/content/docs/tasks.ja.mdx#失敗と自動リトライ) →** 失敗した実行は自動的にリトライするか、停止してその理由を伝えます。

## 自分たちのものにする。

*自分のマシン、自分の Git ホスト、自分のルールで。エージェントの操作も監査証跡に残ります。*

- **[すべてをセルフホスト](SELF_HOSTING.md) →** Docker Compose または Helm で、自前のインフラ上に構築できます。
- **[お使いの Git ホスト](apps/docs/content/docs/vcs-integration.ja.mdx) →** GitHub、GitLab、Gitea、Forgejo に対応しています。セルフホスト版も使えます。
- **[ワークスペース](apps/docs/content/docs/workspaces.ja.mdx) →** エージェント、タスク、設定をチームごとに分けられます。
- **[ロール](apps/docs/content/docs/members-roles.ja.mdx)と[アクセススコープ](apps/docs/content/docs/agents.ja.mdx#権限と-access) →** `owner`、`admin`、`member`、そして各メンバーがどのエージェントを実行できるかを正確に設定できます。
- **[セキュリティモデル](apps/docs/content/docs/security-model.ja.mdx) →** エージェントが何にアクセスでき、何にアクセスできないか。
- **[Slack、Feishu/Lark、DingTalk、WeCom、Telegram](apps/docs/content/docs/channels.ja.mdx) →** チームが普段やり取りしている場所から、エージェントに作業を頼み、その進み具合を追えます。Feishu/Lark の新しい接続は、現在は中国本土の Feishu でのみ利用できます。DingTalk、WeCom、Telegram は[コミュニティによるメンテナンス](apps/docs/content/docs/community-maintained.ja.mdx)です。
- **Web、[デスクトップ](apps/docs/content/docs/desktop-app.ja.mdx)、[モバイル](apps/docs/content/docs/mobile-app.ja.mdx) →** macOS、Windows、Linux、iPhone、iPad で同じワークスペースを使えます。iOS アプリは現在ソースからビルドする形で、まだ App Store では提供していません。
- **[CLI と API](apps/docs/content/docs/cli.ja.mdx) →** すべての機能をスクリプトから操作できます。エージェントも、あなたと同じ CLI で Multica を操作します。

---

## はじめに

このチェックアウトから `make selfhost-build` でサービスを構築し、自分の Web アドレスを開きます。[セルフホストガイド](SELF_HOSTING.md)を参照してください。

デスクトップは、この定製ソースから構築したパッケージを使います。`~/.multica/desktop.json` に `apiUrl` と `appUrl` を設定してから起動してください。[デスクトップ設定](docs/customization.md#desktop-service-configuration)で詳細を確認できます。

別の実行マシンを接続する場合は、同じチェックアウトから CLI を構築します。

```bash
go -C server build -o bin/multica ./cmd/multica
multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
```

エージェント用の CLI とサインインは各実行マシンで準備します。アプリケーションのテレメトリーは無効です。

### 5 分で最初のエージェントを

**1. コンピューターを接続する。** *ランタイム* とは、エージェントが作業できるマシンのことです。ノートパソコンでも、
クラウドマシンでもかまいません。Desktop は起動したコンピューターを自動で登録し、そこにインストールされているエージェント
CLI を検出します。Web から接続する場合や別のマシンを追加する場合は、**チーム → ランタイム** を開き、
**ランタイムを追加 → 他のマシンまたはサーバー** をクリックして、表示される 2 つのコマンドをそのマシンの
ターミナルに貼り付けてください。

**2. エージェントを作成する。** サイドバーの **チーム** を開き、**+**（**新規エージェント**）をクリックします。先ほど接続した
ランタイムを選び、プロバイダーを選んで名前を付けます。**AI で作成** を使えば、説明文から
設定を生成することもできます。付けた名前が、ボードやコメントでの表示名になります。

**3. 仕事を割り当てる。** タスクを作成し、エージェントを担当者に設定します。エージェントはそれを引き受けて
手元のマシンで作業し、途中経過をコメントで残し、終わったらタスクを「レビュー中」に移動します。

詳しい手順：[クイックスタート](apps/docs/content/docs/cloud-quickstart.ja.mdx) · [チュートリアル](apps/docs/content/docs/tutorial.ja.mdx)

---

## ランタイム

Multica はモデルを同梱していません。インストールと認証を済ませたエージェント CLI をそのまま動かします。
現在のソースコードは 31 種類に対応しており、プロバイダーの切り替えは移行作業ではなく、ドロップダウンで選び直すだけです。

| プロバイダー | CLI | プロバイダー | CLI |
| --- | --- | --- | --- |
| Claude Code | `claude` | OpenAI Codex | `codex` |
| Cursor Agent | `cursor-agent` | GitHub Copilot CLI | `copilot` |
| OpenCode | `opencode` | OpenClaw | `openclaw` |
| Hermes | `hermes` | Pi | `pi` |
| Antigravity | `agy` | CodeBuddy | `codebuddy` |
| DevEco Code | `deveco` | Grok | `grok` |
| Kimi | `kimi` | Kiro CLI | `kiro-cli` |
| Qoder CLI | `qodercli` | Qoder CN | `qoderclicn` |
| Qwen Code | `qwen` | QwenPaw | `qwenpaw` |
| Reasonix | `reasonix` | Trae CLI | `traecli` |
| DeepSeek Harness | `dsh` | Oh-My-Pi | `omp` |
| MiniMax Code | `mcode` | Dim | `dim` |
| Huawei Cloud CodeArts | `codearts` | ZeroClaw | `zeroclaw` |
| Muse Code | `muse` | Devin CLI | `devin` |
| Amp | `amp` | Factory Droid | `droid` |
| ZCode | `zcode` / ZCode Desktop | | |

インストールと認証の方法：[AI コーディングツールをインストールする](apps/docs/content/docs/install-agent-runtime.ja.mdx) ·
[プロバイダー](apps/docs/content/docs/providers.ja.mdx)

---

## ドキュメント

| やりたいこと | 最初に読むもの |
| --- | --- |
| 今日からエージェントに何かをさせたい | [クイックスタート](apps/docs/content/docs/cloud-quickstart.ja.mdx) · [チュートリアル](apps/docs/content/docs/tutorial.ja.mdx) |
| 各部分がどう組み合わさっているかを理解したい | [コアコンセプト](apps/docs/content/docs/concepts.ja.mdx) · [Multica の仕組み](apps/docs/content/docs/how-multica-works.ja.mdx) |
| エージェントを作成して設定したい | [エージェント](apps/docs/content/docs/agents.ja.mdx) · [エージェントの作成](apps/docs/content/docs/agents-create.ja.mdx) · [スキル](apps/docs/content/docs/skills.ja.mdx) |
| エージェントに仕事を渡したい | [エージェントに仕事を任せる](apps/docs/content/docs/triggering-agents.ja.mdx) · [タスクの割り当て](apps/docs/content/docs/assigning-issues.ja.mdx) · [メンション](apps/docs/content/docs/mentioning-agents.ja.mdx) |
| 自分のマシンを接続したい | [デーモンとランタイム](apps/docs/content/docs/daemon-runtimes.ja.mdx) · [AI コーディングツールのインストール](apps/docs/content/docs/install-agent-runtime.ja.mdx) |
| Git やチャットのツールを接続したい | [GitHub](apps/docs/content/docs/github-integration.ja.mdx) · [セルフホストの Git](apps/docs/content/docs/vcs-integration.ja.mdx) · [チャネル](apps/docs/content/docs/channels.ja.mdx) |
| 自分のインフラストラクチャで動かしたい | [セルフホスト](SELF_HOSTING.md) · [セキュリティモデル](apps/docs/content/docs/security-model.ja.mdx) · [環境変数](apps/docs/content/docs/environment-variables.ja.mdx) |
| スクリプトから操作したい | [CLI リファレンス](apps/docs/content/docs/cli.ja.mdx) · [CLI とデーモンのガイド](CLI_AND_DAEMON.md) · [認証トークン](apps/docs/content/docs/auth-tokens.ja.mdx) |
| Codex、Claude Code、Cursor から Multica を操作したい | [Multica CLI skill](https://github.com/multica-ai/multica-cli) |
| エージェントが止まっている理由を突き止めたい | [実行](apps/docs/content/docs/tasks.ja.mdx) · [トラブルシューティング](apps/docs/content/docs/troubleshooting.ja.mdx) |

ドキュメントは [English](apps/docs/content/docs/index.mdx)、[简体中文](apps/docs/content/docs/index.zh.mdx)、
[한국어](apps/docs/content/docs/index.ko.mdx)、[Français](apps/docs/content/docs/index.fr.mdx) でもご覧いただけます。

---

## アーキテクチャ

```
   Web (browser)        Desktop (Electron)        iPhone · iPad (Expo)
         │                      │                          │
         ▼                      │                          │
  ┌──────────────┐              │                          │
  │   Next.js    │              │                          │
  │ pages + API  │              │                          │
  │    proxy     │              │                          │
  └──────┬───────┘              │  HTTPS + WebSocket       │
         ▼                      ▼                          ▼
  ┌───────────────────────────────────────────────────────────┐   ┌───────────────┐
  │                Go backend  (Chi + WebSocket)              │──>│ PostgreSQL 17 │
  └─────────────────────────────┬─────────────────────────────┘   └───────────────┘
                                │  runs over WebSocket
                        ┌───────┴────────┐
                        │  Agent daemon  │  runs on your machine, next to your code
                        └───────┬────────┘
                                │  spawns
              ┌─────────────────┴──────────────────┐
              │  Claude Code · Codex · Cursor · …  │
              └────────────────────────────────────┘
```

| レイヤー | スタック |
| --- | --- |
| Web | Next.js 16 (App Router) |
| デスクトップ | Electron。Web の UI パッケージを共有 |
| モバイル | Expo / React Native（iPhone と iPad） |
| バックエンド | Go（Chi router、sqlc、gorilla/websocket） |
| データベース | PostgreSQL 17（`pgcrypto` + `pg_trgm`） |
| エージェントランタイム | [対応する任意のエージェント CLI](#ランタイム) を実行するローカルデーモン |

---

## 開発

コントリビューターの方は、まず[コントリビュートガイド](CONTRIBUTING.md)をお読みください。

**前提条件：** [Node.js](https://nodejs.org/) 22、[pnpm](https://pnpm.io/) 10.28.2、[Go](https://go.dev/) 1.26.9、[Docker](https://www.docker.com/)

```bash
make dev
```

`make dev` は、環境（メインのチェックアウトかワークツリーか）を自動で検出し、env ファイルを作成し、
依存関係をインストールし、データベースをセットアップし、マイグレーションを実行して、すべてのサービスを起動します。

ワークフロー全体、ワークツリーへの対応、テスト、トラブルシューティングについては、[CONTRIBUTING.md](CONTRIBUTING.md) を
ご覧ください。iOS クライアントは [`apps/mobile/`](apps/mobile/) にあり、その
[README](apps/mobile/README.md) に、自分のデバイスへのビルド方法が記載されています。

平日はほぼ毎日リリースしているため、`main` は速いペースで更新されます。こまめにプルしてください。

---

## なぜ「Multica」なのか？

**Mult**iplexed **I**nformation and **C**omputing **A**gent の略です。これは、1960 年代のオペレーティングシステムで、
タイムシェアリングを導入し、複数の人が 1 台のマシンをあたかもそれぞれが独占しているかのように使えるようにした
Multics へのオマージュです。

それ以来、ソフトウェアチームはずっとシングルスレッドでした。1 人のエンジニアが 1 つの仕事を抱え、コンテキストの切り替えも一度に 1 回ずつ。
私たちは、エージェントによってタイムシェアリングが再び意味を持つようになると考えています。ただし、今度はシステムを多重化して使うのは、
人間と機械の両方です。小さなチームが、小ささを感じる必要はありません。

より詳しい考え方と、私たちが考えるこの先の展望については、**[VISION.md](VISION.md)** をご覧ください。

---

## ライセンス

[Multica License](LICENSE) — Apache License 2.0 の全文に、ホスティングサービス、商用への組み込み、ブランディングに関する
追加の条件を加えたものです。セルフホストも、改変も、それをもとにした開発も自由です。正確な条件は [LICENSE](LICENSE) に、
帰属表示は [NOTICE](NOTICE) にあります。
