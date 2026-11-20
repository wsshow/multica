# 定制版本与官方源码对应关系

本项目独立维护版本号，首个版本为 `v0.1.0`。官方版本号用于记录源码来源，不决定本项目的发布版本号。CLI、Electron 安装包和 Docker 镜像从同一个定制版本 tag 构建。

## 版本对应表

| 定制版本 | 本仓库定位 | 官方最近版本 tag | 官方源码比对参考 | 确认状态 |
| --- | --- | --- | --- | --- |
| `v0.1.0` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.0)，首次定制快照为 `fcd80467b2cf795a02310a37c921f8f2646ed24e` | [`v0.7.2`](https://github.com/multica-ai/multica/releases/tag/v0.7.2)，对应 commit 为 `f05a525ac8e82f5e9169ad078e44f166fad6d5c8` | [`87ec077e5f56ff66342caef1df1638780acfdf2e`](https://github.com/multica-ai/multica/commit/87ec077e5f56ff66342caef1df1638780acfdf2e)，2026-11-03 | 已完成文件比对；该 commit 为候选参考基线，原始 checkout commit 未恢复 |
| `v0.1.1` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.1)，修复 `v0.1.0` 的桌面打包与上传配置 | `v0.7.2`，未新增上游同步 | `87ec077e5f56ff66342caef1df1638780acfdf2e`，沿用同一比对参考 | 同上；本次仅修改定制发行配置 |
| `v0.1.2` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.2)，拆分发行版本与 CLI 功能兼容版本 | `v0.7.2`，未新增上游同步 | `87ec077e5f56ff66342caef1df1638780acfdf2e`，沿用同一比对参考 | 同上；CLI 兼容版本声明为 `0.7.2` |
| `v0.1.3` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.3)，新增一体化应用镜像、独立部署配置和 Docker Hub 双架构自动发布 | `v0.7.2`，未新增上游同步 | `87ec077e5f56ff66342caef1df1638780acfdf2e`，沿用同一比对参考 | 同上；CLI 兼容版本仍为 `0.7.2` |
| `v0.1.4` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.4)，首次上游同步经 [PR #1](https://github.com/wsshow/multica/pull/1) 合入 `main` | [`v0.8.0`](https://github.com/multica-ai/multica/releases/tag/v0.8.0) | [`9b1ab4f9eed9153a94719596eb8a728d2770f065`](https://github.com/multica-ai/multica/commit/9b1ab4f9eed9153a94719596eb8a728d2770f065) | 完整导入该 tag 的上游变更并保留定制边界；首次建立可追溯的合并关系，原始 checkout 身份仍未恢复；见[同步记录](upstream-sync.json) |
| `v0.1.5` | [定制发布 tag](https://github.com/wsshow/multica/tree/v0.1.5)，上游同步经 [PR #2](https://github.com/wsshow/multica/pull/2) 合入 `main`，并修复定制测试和 CI 时序 | [`v0.10.0`](https://github.com/multica-ai/multica/releases/tag/v0.10.0)，包含 `v0.8.1`、`v0.8.2`、`v0.9.0` | [`2fcb424b72b024f65161809081009063846ea44d`](https://github.com/multica-ai/multica/commit/2fcb424b72b024f65161809081009063846ea44d) | 合并此前 `v0.8.0` 至此 tag 的 493 个提交，保留定制边界；主线 CI 和 AMD64/ARM64 一体化镜像检查已通过，未运行本地验证；见[同步记录](upstream-sync.json) |
| 未发布（`feikong/upstream-sync`） | 在 `v0.1.5` 之上同步源码，包版本暂不递增 | [`v0.11.1`](https://github.com/multica-ai/multica/releases/tag/v0.11.1)，包含 `v0.11.0` | [`e1fe10d6694848e35dd1aa00e08cd11d93e545ac`](https://github.com/multica-ai/multica/commit/e1fe10d6694848e35dd1aa00e08cd11d93e545ac) | 完整合并 `v0.10.0` 至此 tag 的 146 个提交，保留定制边界；按用户要求仅完成源码审查，未运行本地验证；见[同步记录](upstream-sync.json) |

`v0.1.0` 的桌面发行不完整；`v0.1.1` 修复桌面打包，但独立编号仍会触发原有 CLI 功能版本门槛；`v0.1.2` 修复该兼容问题，`v0.1.3` 在此基础上增加一体化镜像发行。保留已发布 tag，避免同一版本号对应不同源码。

源码包含官方 `v0.7.2` 之后的主线变更，因此不能将定制 `v0.1.0` 视为官方 `v0.7.2` 的完整对应副本。参考 commit 相对该官方 tag 前进了 68 个提交，统计命令为 `git rev-list --count v0.7.2..87ec077e5f56ff66342caef1df1638780acfdf2e`。

## 核验依据与限制

原 `.git` 已主动移除，首次定制提交已经包含遥测清理，因此无法直接恢复原始 checkout 的身份和祖先关系。2026-11-03 对官方主线最近 120 个 first-parent 提交逐一比对，以首次定制提交的完整 Git 文件树为依据，比较文件路径、模式、类型和 blob hash；具体窗口与差异清单保存在 [比对记录](upstream-baseline.json)。

最接近的候选结果如下：

| 项目 | 数量 |
| --- | ---: |
| 首次定制提交中的文件 | 7,283 |
| 官方候选提交中的文件 | 7,323 |
| 完全一致的文件 | 7,191 |
| 同路径但内容或模式不同 | 87 |
| 仅定制快照存在 | 5 |
| 仅官方候选存在 | 45 |

文件比对能确认相同内容和剩余差异，不能证明已丢失的 Git 祖先关系。2026-11-04 的首次同步审查了这 137 项差异，确认其属于遥测边界、相关测试、依赖、配置、文档和定制发行修改，并将候选快照作为明确指定的三方对照点。首次集成提交以旧定制主线和官方 `v0.8.0` 为双亲，从这次集成开始建立真实可追溯的合并关系；不将候选点标为已恢复的历史祖先。后续按[同步策略](customization.md#synchronizing-upstream-features)复用 `feikong/upstream-sync`，`upstream/source` 仅跟踪已经导入的纯净官方快照。

初始源码中的 Web 和 Desktop `package.json` 都声明 `0.7.2`，这是版本元数据证据，不能单独证明源码等于官方 tag。当前定制版的根目录、Web、Desktop 包版本统一为 `0.1.5`，对应本次官方 `v0.10.0` 源码同步；此前 `v0.1.4` 首次将官方 `v0.8.0` 源码发布为定制发行版本，变更记录见 [Changelog](../CHANGELOG.md)。本次 `v0.11.1` 源码同步尚未创建新的定制发行 tag，包版本保持 `0.1.5`，不表示已发布安装包包含新功能。Go 的 `go.mod` 版本字段描述 Go 工具链要求，不是产品版本。

## 发行版本与功能兼容版本

`cli_version` 保留定制发行版本，用于界面显示、更新比较和桌面端判断内置 CLI 是否需要重启。`cli_compatibility_version` 声明已实现的上游 CLI 功能契约，供快速创建、显式任务字段和聊天项目上下文等功能判断使用。同步官方 `v0.11.1` 后，当前源码声明值为 `0.11.1`，位于 [CLI 兼容策略](../server/pkg/agent/cli_compatibility.go)。它不代表恢复了原始 Git 祖先关系，也不决定本项目的发行号。

新守护进程注册时同时发送这两个字段，后端保存到运行时元数据；没有兼容字段的旧守护进程继续使用原有 `cli_version` 规则，未知或错误的版本不会直接放行。Web 和 Electron 与本版后端、CLI 配套升级，才能使用这一拆分。后续同步必须按实际导入的功能审查兼容值，不能随定制版本号自动递增。

## 定制提交索引

| 提交 | 内容 |
| --- | --- |
| `fcd8046` | 建立独立 Git 历史，集中禁用遥测并保留空接口 |
| `181f114` | Electron 仅执行本定制源码编译的内置 CLI |
| `7125655` | 桌面端要求用户配置自建服务与可选外部来源 |
| `deeed14` | 部署与安装文档对齐定制发行方式 |
| `d8ed99d`、`3b20108` | 自建 CLI 下载指引与定制行为的 CI 修复 |
| `40d2701` | 桌面发布源显式读取当前 Actions 仓库，补齐架构更新频道配置 |

## 后续维护

每次发布追加对应表与 [变更记录](../CHANGELOG.md)，保留历史行。仅修复问题递增 patch，新增功能递增 minor，破坏性变更递增 major；同步官方代码后继续使用本项目自己的版本序列。

每次同步记录官方完整 commit SHA、最近官方 tag、同步前后的定制 tag、导入范围、冲突处理和验证结果。部分导入或 cherry-pick 应写明实际导入的提交，不得将其标成完整同步。确认原始基线后更新核验状态，并保留本次比对记录作为来源证据。
