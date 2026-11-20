# Multica

[English](README.md) · 简体中文 · [日本語](README.ja.md)

Multica 定制版是一个可自托管的协作工作区。你可以将任务分配给 AI 编码智能体，跟踪进度并审阅结果。

![Multica 工作区看板](apps/docs/public/images/docs/workspace-overview.webp)

## 一键部署

启动 Docker，准备 Docker Compose 2.30 或更高版本、Bash 和 curl。运行下面的命令安装最新稳定版。

```bash
curl -fsSLo multica-personal.sh https://raw.githubusercontent.com/wsshow/multica/main/scripts/install-personal.sh && bash multica-personal.sh
```

打开终端显示的地址（默认 `http://localhost:8080`），使用一次性初始化码创建所有者账号。

在终端使用或接入另一台电脑，可通过[独立 CLI 向导](CLI_INSTALL.md#install-and-connect-with-the-wizard)完成安装、登录和运行时启动。

[部署指南](docs/integrated-image.zh.md) · [上游版本记录](docs/version-mapping.md) · [许可协议](LICENSE) · [署名信息](NOTICE)
