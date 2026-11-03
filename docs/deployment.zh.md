# 定制版本部署指南

本项目独立维护 Git 历史和发行版本。部署当前定制源码，或使用维护者明确发布的定制产物。原项目的安装包、镜像和 Homebrew 包不包含这里的遥测清理与桌面端配置修改。

英文完整说明见 [SELF_HOSTING.md](../SELF_HOSTING.md)，定制边界见 [customization.md](customization.md)。

前后端合并、基础设施外置的[一体化应用镜像](integrated-image.zh.md)仍处于设计阶段；本文继续说明当前可用的拆分部署方式。

## 服务与执行电脑

- Docker 机器运行 API、Web 和 PostgreSQL。
- 执行电脑运行定制 Electron 桌面端，或独立的定制 CLI / daemon。
- 桌面端已经内置 CLI，不需要用户再安装一个 Multica 二进制来使用本机执行能力。
- 智能体工具、工具账号和模型额度仍需在执行电脑自行准备。Docker 部署不会自动安装这些工具。

两部分可以在同一台机器，也可以分开部署。

## 从当前源码启动 Docker 服务

准备 Docker Compose 插件、Make 和 OpenSSL，在当前仓库根目录执行：

```bash
make selfhost-build
```

首次运行仅在 `.env` 不存在时复制示例并生成初始密钥，再构建 `multica-backend:dev`、`multica-web:dev`，启动数据库、后端和前端。已有配置和数据卷会保留；若已有 `.env`，先检查其中的密钥、数据库和端口，不会自动替换已有示例值。

默认主机端口下：

| 服务 | 地址 |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:8080` |
| 就绪检查 | `http://localhost:8080/readyz` |

这些是 Docker 示例端口，桌面端不会自动选择它们。

```bash
docker compose -f docker-compose.selfhost.yml ps
curl -fsS http://localhost:8080/readyz
docker compose -f docker-compose.selfhost.yml logs --tail=100 backend
```

`/health` 只检查进程存活；`/readyz` 检查数据库和迁移是否就绪。后端启动会自动执行迁移。

## 登录和生产配置

打开自己的 Web 地址，使用邮箱验证码登录。生产环境配置自己的 SMTP 或 Resend，并使用自己验证过的发件域名。没有配置邮件服务时，当前后端会在日志中输出生成的验证码。

固定验证码只适用于隔离的开发环境，需要 `APP_ENV=development` 与 `MULTICA_DEV_VERIFICATION_CODE`；不要在公开部署启用。Google 登录需要自己注册 OAuth，并填写自建 Web 的回调地址。

## 配置 Electron 桌面端

使用当前源码编译的桌面包，或维护者发布的定制安装包。将 [desktop.example.json](../apps/desktop/desktop.example.json) 复制到 `~/.multica/desktop.json`，按实际部署修改：

```json
{
  "schemaVersion": 1,
  "apiUrl": "http://localhost:8080",
  "appUrl": "http://localhost:3000"
}
```

Windows 路径为 `%USERPROFILE%\.multica\desktop.json`，使用 UTF-8，避免保存成 `.json.txt`。修改后重启。

`apiUrl` 和 `appUrl` 都是必填项；Web 地址用于浏览器登录和分享链接，不会从 API 域名猜测。可选 `wsUrl` 用于反向代理采用其他 WebSocket 地址的情况。缺少或配置错误时停留在配置提示页。

Docker 如果在其他电脑，`localhost` 必须换成从桌面端可访问的服务器地址。桌面端会在该 API 专属的 profile 中管理内置 CLI；不会下载上游 CLI，也不会回退到系统中的其他二进制。

桌面端的自动更新、安装和帮助入口只使用用户配置的可选地址。完整字段见[桌面端配置](customization.md#desktop-service-configuration)。尚未发布自己的更新源时，保持这些字段缺省。

需要准备自己的安装包时，按仓库工作区脚本构建；这些是供以后执行的步骤：

```bash
pnpm install --frozen-lockfile
pnpm --filter @multica/desktop package
```

需要 Go、目标平台构建依赖及签名配置。不要把未签名的本地包当成已经验证的正式发布。

## 独立 CLI 与其他执行电脑

详见 [CLI_INSTALL.md](../CLI_INSTALL.md)。从当前定制源码构建：

```bash
go -C server build -o bin/multica ./cmd/multica
```

Windows 输出文件改为 `bin/multica.exe`。明确选中该二进制或将它加入 PATH，再连接自己的服务：

```bash
multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
multica auth status
multica daemon status
```

换成实际可达的 API、Web 地址。不要使用不带参数的 `multica setup` 来初始化定制部署。使用命名 profile 时，后续每条命令也带上相同的 `--profile <name>`。

无浏览器的服务器先保存两个地址，再到自己的 Web 设置创建 PAT，通过 `multica login --token` 交互输入。不要把真实 token 直接写进命令历史。

## 跨机器访问

Compose 仅绑定服务器的 `127.0.0.1`。远程使用时配置带 TLS 的反向代理，按实际部署设置：

```dotenv
FRONTEND_ORIGIN=https://app.example.com
MULTICA_APP_URL=https://app.example.com
MULTICA_PUBLIC_URL=https://api.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
LOCAL_UPLOAD_BASE_URL=https://api.example.com
```

这些域名是占位示例。按[反向代理说明](../SELF_HOSTING_ADVANCED.md#reverse-proxy)转发认证、API、健康检查和 WebSocket；从执行电脑验证就绪状态。不要直接把数据库、原始 API 和 Web 端口公开到互联网。

## 自有镜像和 Kubernetes

没有自己的镜像仓库时继续使用 `make selfhost-build`。维护者发布定制镜像后，可在 `.env` 中显式填写：

```dotenv
MULTICA_BACKEND_IMAGE=registry.example.com/your-team/multica-backend
MULTICA_WEB_IMAGE=registry.example.com/your-team/multica-web
MULTICA_IMAGE_TAG=custom-2026-01
```

仓库和标签都必须换成真实存在的定制镜像，再执行 `make selfhost`。这个命令会拉取配置的镜像，不会构建当前源码。

Kubernetes 使用本地 chart [deploy/helm/multica](../deploy/helm/multica/)，按照 `values.yaml` 创建 Secret，配置自有镜像、ingress、TLS 和存储。镜像必须能被每个集群节点取得；本机 Docker 中存在并不代表集群可用。无需引用原项目的 OCI chart。

## 备份、升级和停止

升级前备份数据库、上传卷、配置和密钥，记录源码提交与镜像版本。下面的 SQL 备份不包含上传文件，执行时为每次备份选择新文件名：

```bash
docker compose -f docker-compose.selfhost.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > multica-backup.sql
```

源码部署切换到经过审查的定制提交后运行 `make selfhost-build`。镜像部署改为自己的新不可变标签后运行 `make selfhost`。合入上游功能先遵循[同步策略](customization.md#synchronizing-upstream-features)，不要直接拉取原仓库主分支或官方 `latest` 覆盖定制版本。

迁移已经执行时，单独回退容器镜像不等于回退数据库。回滚前确认兼容性，或恢复与旧版本配套的备份。

```bash
multica daemon stop
make selfhost-stop
```

桌面端的执行器通过应用管理。停止 Compose 会保留数据；`down -v` 会删除数据卷，不用于普通停止或升级。

## 遥测边界

产品分析、匿名上报、崩溃上报和运维指标已禁用，环境变量不能恢复。`/metrics` 和 `/health/realtime` 不可用。任务用量、成本、历史、在线状态和正常应用日志仍保留。
