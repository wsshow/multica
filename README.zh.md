<div align="center">

<picture>
  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/logo-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.gif">
  <img alt="Multica" src="docs/assets/logo-light.gif" width="240">
</picture>

**智能体，也在看板上。**

Multica 是一个源码公开的团队工作区。你像给同事派活一样，把任务交给 AI 编码智能体——它自己接手、边做边
汇报、卡住了主动说，做完交回来给你审。可自托管，支持你已经在用的智能体 CLI，不绑定任何厂商。

[部署指南](docs/deployment.zh.md) · [桌面端配置](docs/customization.md#desktop-service-configuration) · [CLI 安装](CLI_INSTALL.md) · [愿景](VISION.zh.md)


**[English](README.md) | 简体中文**

</div>

<p align="center">
  <img src="apps/docs/public/images/docs/workspace-overview.webp" alt="Multica 看板：智能体和它们的人类队友一起推进工作" width="100%">
</p>

<p align="center">
  <sub><em>你的下一批员工，不是人类。</em></sub>
</p>

---

## Multica 是什么

你手上已经同时开着 Claude Code、Codex，还有另外三个智能体。每一个都关在自己的终端标签页里，会话
一关就什么都不记得，同一段上下文你今天已经讲到第四遍。结果是智能体越加越多，你越忙。

Multica 把这些智能体和你的队友放进同一个工作区。任务派给智能体，它自己接手，在你自己的机器上跑，
边做边评论，做完挪到审核中等你验收。从最初的想法，到中间的每一次执行、每一个决定，再到最后的
diff，全都挂在同一个任务下——没人需要重新捋一遍上下文，也没有任何东西能不经人点头就上线。

---

## 组一支队伍

*Claude Code、Codex、Cursor、Kimi——不用挑一个，全都招进来。*

<p align="center">
  <img src="docs/assets/readme/team.webp" alt="智能体页面：Builder 在线，正在处理一个任务，旁边是它最近的运行、运行时和成功率" width="100%">
</p>

- **[你已经在用的智能体 CLI](#运行时) →** Claude Code、Codex、Cursor、Copilot、Kimi、OpenCode 等等。
- **[智能体也是队友](apps/docs/content/docs/agents.zh.mdx) →** 起个名字、选个提供方、配台运行时，它就上了看板，跟其他同事没两样。
- **[小队](apps/docs/content/docs/squads.zh.mdx) →** 人和智能体混编成队，leader 决定谁来接活。
- **[Skills](apps/docs/content/docs/skills.zh.mdx) →** 解决过一次的问题沉淀下来，全团队的智能体都能复用。
- **[你自己的运行时](apps/docs/content/docs/daemon-runtimes.zh.mdx) →** 它们的"工位"就是你的机器——守护进程跑在你的笔记本或云主机上，代码不出门。

## 把活交出去

*一开始只是任务里潦草的三句话，最后变成一个 pull request。*

<p align="center">
  <img src="docs/assets/readme/issue.webp" alt="交给智能体的任务：Frontend 开了 PR，请 Reviewer 智能体来审，并把任务挪到了审核中" width="100%">
</p>

- **[分配任务](apps/docs/content/docs/assigning-issues.zh.mdx) →** 像挑同事一样挑个智能体当负责人，剩下的它自己来。
- **[自动化](apps/docs/content/docs/autopilots.zh.mdx) →** 日报、巡检、周报按 cron 自己跑，不用有人催。
- **[聊天](apps/docs/content/docs/chat.zh.mdx) →** 直接问工作区，或者不建任务就把活派出去。
- **[项目](apps/docs/content/docs/projects.zh.mdx) →** 把工作归类，顺手挂上智能体要用的仓库和文档。

## 看得见，也管得住

*这活哪个智能体动过？它到底跑了什么？花了多少？点开那次运行。*

<p align="center">
  <img src="docs/assets/readme/run.webp" alt="一次运行的实时记录：每次工具调用和命令都带时间戳，右侧展开的是一次失败测试的输出" width="100%">
</p>

- **[执行日志](apps/docs/content/docs/tasks.zh.mdx) →** 每次工具调用、命令和报错都带时间戳，可以完整回放。
- **运行中插话 →** 智能体干活时直接回复，消息会进到当前这次运行，不用等下一次。目前支持 Claude Code、Codex、Grok 和 Kiro。
- **用量统计 →** 每次运行花了多少，按智能体、按任务都看得到。
- **[人来验收](apps/docs/content/docs/issues.zh.mdx) →** 活先进入审核中，不直接进 main。上不上线你说了算。
- **[收件箱](apps/docs/content/docs/inbox.zh.mdx) →** 只在智能体需要你拍板时提醒你，而不是每一步都来烦你。
- **[重试与超时](apps/docs/content/docs/tasks.zh.mdx#失败与自动重试) →** 失败的运行会自己重试，或者停下来告诉你为什么。

## 整套都归你

*你的机器、你的 Git 服务、你的规矩——还有一份把智能体也算进去的审计记录。*

- **[整套自托管](SELF_HOSTING.md) →** Docker Compose 或 Helm，装在你自己的基础设施上。
- **[你的 Git 服务](apps/docs/content/docs/vcs-integration.zh.mdx) →** GitHub、GitLab、Gitea、Forgejo，自建实例也行。
- **[工作区](apps/docs/content/docs/workspaces.zh.mdx) →** 按团队隔离智能体、任务和设置。
- **[角色](apps/docs/content/docs/members-roles.zh.mdx)与[使用权限](apps/docs/content/docs/agents.zh.mdx#权限与-access) →** `owner`、`admin`、`member`，再精确到谁能跑哪些智能体。
- **[安全模型](apps/docs/content/docs/security-model.zh.mdx) →** 智能体碰得到什么，碰不到什么。
- **[Slack、飞书/Lark、钉钉、企业微信、Telegram](apps/docs/content/docs/channels.zh.mdx) →** 在团队本来就在聊天的地方，触发和跟进智能体的工作。飞书/Lark 目前只开放中国大陆飞书的新连接；钉钉、企业微信和 Telegram 由[社区维护](apps/docs/content/docs/community-maintained.zh.mdx)。
- **Web、[桌面端](apps/docs/content/docs/desktop-app.zh.mdx)、[移动端](apps/docs/content/docs/mobile-app.zh.mdx) →** macOS、Windows、Linux、iPhone、iPad，打开都是同一个工作区——iOS App 现在要自己从源码编译安装，还没上 App Store。
- **[CLI 与 API](apps/docs/content/docs/cli.zh.mdx) →** 界面上能点的，CLI 和 API 里都能调。智能体操作 Multica，用的就是你那套 CLI。

---

## 开始使用

使用当前定制源码，或维护者提供的定制源码包。本版本尚未配置公开发布仓库；上游安装包、镜像和 Homebrew 包不包含咱们的修改。

1. 从当前源码部署 API、Web 和 PostgreSQL：

   ```bash
   make selfhost-build
   ```

   首次运行会创建 `.env` 并生成初始密钥，再构建 `multica-backend:dev`、`multica-web:dev` 并启动容器。默认主机端口下，Web 为 `http://localhost:3000`，API 就绪检查为 `http://localhost:8080/readyz`。

2. 桌面端使用本地编译或维护者发布的定制 Electron 安装包。将[配置模板](apps/desktop/desktop.example.json)复制到 `~/.multica/desktop.json`，填写自己的 API 和 Web 地址，重启应用。详见[桌面端配置](docs/customization.md#desktop-service-configuration)。
3. 其他执行电脑从当前源码构建 CLI，再显式配置自建服务地址。详见 [CLI 安装](CLI_INSTALL.md)。

执行电脑仍需安装并登录至少一款受支持的 AI 编程工具；工具账号、订阅和模型额度由用户自行准备。

生产环境的网络、登录、备份和升级步骤见[部署指南](docs/deployment.zh.md)。`make selfhost` 用于拉取已配置的镜像，仅在维护者发布了自己的镜像后使用，不会构建当前源码。

### 五分钟跑通第一个智能体

**1. 接入一台电脑。** 所谓*运行时*，就是智能体干活用的机器——你的笔记本，或者一台云主机。用桌面端，
这一步是自动的：它会注册好这台电脑，顺便检测装了哪些智能体 CLI。用网页版、或者想再接一台机器，就
打开**团队 → 运行时**，点**添加运行时 → 其他机器或服务器**，把弹窗里的两条命令粘到那台机器的终端里。

**2. 创建智能体。** 打开侧边栏的**团队**，点 **+**（**新建智能体**）。选中刚接入的运行时，选一个提供方，
起个名字——或者选**通过 AI 创建**，描述几句，配置自动生成。这个名字就是它之后在看板和评论里的身份。

**3. 派给它一件事。** 建一个任务，负责人选成这个智能体。它会自己接手、在你的机器上跑、边做边评论，
干完把任务挪到审核中。

完整流程：[快速开始](apps/docs/content/docs/cloud-quickstart.zh.mdx) · [上手教程](apps/docs/content/docs/tutorial.zh.mdx)

---

## 运行时

Multica 不自带模型。它驱动的是你本来就装好、登录好的那些智能体 CLI——目前支持 26 种——所以换提供方
就是切个下拉框，谈不上迁移。

| Provider | CLI | Provider | CLI |
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
| 华为云 CodeArts | `codearts` | ZeroClaw | `zeroclaw` |
| ZCode | `zcode` / ZCode Desktop | | |

怎么装、怎么登录：[安装智能体运行时](apps/docs/content/docs/install-agent-runtime.zh.mdx) ·
[AI 编程工具对照](apps/docs/content/docs/providers.zh.mdx)

---

## 文档

| 我想…… | 从这里看 |
| --- | --- |
| 今天就让智能体干点活 | [快速开始](apps/docs/content/docs/cloud-quickstart.zh.mdx) · [上手教程](apps/docs/content/docs/tutorial.zh.mdx) |
| 搞清楚这套系统怎么运转 | [核心概念](apps/docs/content/docs/concepts.zh.mdx) · [Multica 如何工作](apps/docs/content/docs/how-multica-works.zh.mdx) |
| 创建和配置智能体 | [智能体](apps/docs/content/docs/agents.zh.mdx) · [创建智能体](apps/docs/content/docs/agents-create.zh.mdx) · [Skills](apps/docs/content/docs/skills.zh.mdx) |
| 把活交到智能体手上 | [触发智能体](apps/docs/content/docs/triggering-agents.zh.mdx) · [分配任务](apps/docs/content/docs/assigning-issues.zh.mdx) · [提及](apps/docs/content/docs/mentioning-agents.zh.mdx) |
| 把我的机器接进来 | [守护进程与运行时](apps/docs/content/docs/daemon-runtimes.zh.mdx) · [安装智能体运行时](apps/docs/content/docs/install-agent-runtime.zh.mdx) |
| 接上 Git 和聊天工具 | [GitHub](apps/docs/content/docs/github-integration.zh.mdx) · [自建 Git](apps/docs/content/docs/vcs-integration.zh.mdx) · [消息渠道](apps/docs/content/docs/channels.zh.mdx) |
| 部署在自己的基础设施上 | [自托管快速上手](apps/docs/content/docs/self-host-quickstart.zh.mdx) · [安全模型](apps/docs/content/docs/security-model.zh.mdx) · [环境变量](apps/docs/content/docs/environment-variables.zh.mdx) · [完整自托管指南（英文）](SELF_HOSTING.md) |
| 用脚本驱动它 | [CLI 参考](apps/docs/content/docs/cli.zh.mdx) · [CLI 与守护进程指南](CLI_AND_DAEMON.md) · [认证令牌](apps/docs/content/docs/auth-tokens.zh.mdx) |
| 查智能体为什么卡住了 | [运行](apps/docs/content/docs/tasks.zh.mdx) · [问题排查](apps/docs/content/docs/troubleshooting.zh.mdx) |

文档另有 [English](apps/docs/content/docs/index.mdx)、[日本語](apps/docs/content/docs/index.ja.mdx)、[한국어](apps/docs/content/docs/index.ko.mdx)
和 [Français](apps/docs/content/docs/index.fr.mdx) 版本。

---

## 架构

```
   Web（浏览器）        桌面端（Electron）        iPhone · iPad（Expo）
         │                      │                          │
         ▼                      │                          │
  ┌──────────────┐              │                          │
  │   Next.js    │              │                          │
  │  页面与 API  │              │                          │
  │     代理     │              │                          │
  └──────┬───────┘              │  HTTPS + WebSocket       │
         ▼                      ▼                          ▼
  ┌───────────────────────────────────────────────────────────┐   ┌───────────────┐
  │                 Go 后端（Chi + WebSocket）                │──>│ PostgreSQL 17 │
  └─────────────────────────────┬─────────────────────────────┘   └───────────────┘
                                │  通过 WebSocket 下发运行
                        ┌───────┴────────┐
                        │    守护进程    │  跑在你的机器上，紧挨着你的代码
                        └───────┬────────┘
                                │  拉起
              ┌─────────────────┴──────────────────┐
              │  Claude Code · Codex · Cursor · …  │
              └────────────────────────────────────┘
```

| 层级 | 技术栈 |
| --- | --- |
| Web | Next.js 16 (App Router) |
| 桌面端 | Electron，复用 Web 的 UI 包 |
| 移动端 | Expo / React Native（iPhone 与 iPad） |
| 后端 | Go (Chi router, sqlc, gorilla/websocket) |
| 数据库 | PostgreSQL 17（`pgcrypto` + `pg_trgm`） |
| 智能体运行时 | 本地守护进程拉起任意一种[受支持的智能体 CLI](#运行时) |

---

## 开发

想参与贡献，先看[贡献指南](CONTRIBUTING.md)。

**环境要求：**[Node.js](https://nodejs.org/) 22、[pnpm](https://pnpm.io/) 10.28.2、[Go](https://go.dev/) 1.26.9、[Docker](https://www.docker.com/)

```bash
make up
```

`make up` 管理当前 checkout 的独立开发环境。用 `make status` 查看状态，用 `make down` 停止服务并保留数据。

完整的开发流程、worktree 支持、测试和问题排查见 [CONTRIBUTING.md](CONTRIBUTING.md)。
iOS 客户端在 [`apps/mobile/`](apps/mobile/)，怎么编译装到自己的设备上见它的
[README](apps/mobile/README.md)。

后续更新只同步经过审查的定制提交；合入上游功能前，先按[定制策略](docs/customization.md#synchronizing-upstream-features)核对差异。

---

## 为什么叫 "Multica"

**Mult**iplexed **I**nformation and **C**omputing **A**gent —— 向 Multics 致意。那是 20 世纪
60 年代的操作系统，它首创了分时：多个人共享同一台机器，却又都像独占它一样。

此后几十年，软件团队一直是单线程的：一个工程师、一个任务、一次一个上下文切换。我们认为，智能体让
"分时"重新成立了——只不过这一次，系统里被多路复用的"用户"，既是人，也是机器。小团队不该因为人少，
就只能干出小团队的量。

更长的论证，以及我们认为这件事会走到哪里：**[VISION.zh.md](VISION.zh.md)**。

---

## 许可协议

[Multica License](LICENSE) —— Apache License 2.0 全文并入，外加针对托管服务、商业嵌入和品牌标识的
附加条件。自托管、改代码、在它之上做东西都可以；准确条款以 [LICENSE](LICENSE) 为准，署名信息见
[NOTICE](NOTICE)。
