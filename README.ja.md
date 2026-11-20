# Multica

[English](README.md) · [简体中文](README.zh.md) · 日本語

Multica のカスタマイズ版は、AI コーディングエージェントにタスクを割り当て、進捗の確認や成果のレビューができるセルフホスト型のワークスペースです。

![Multica のワークスペースのボード](apps/docs/public/images/docs/workspace-overview.webp)

## コマンドひとつでデプロイ

Docker を起動し、Docker Compose 2.30 以上、Bash、curl を用意してください。インストーラーの案内は中国語で、最新の安定版がインストールされます。

```bash
curl -fsSLo multica-personal.sh https://raw.githubusercontent.com/wsshow/multica/main/scripts/install-personal.sh && bash multica-personal.sh
```

ターミナルに表示されたアドレス（既定値は `http://localhost:8080`）を開き、初回セットアップコードでオーナーアカウントを作成してください。

[デプロイガイド（英語）](docs/integrated-image.md) · [上流バージョンの履歴](docs/version-mapping.md) · [ライセンス](LICENSE) · [著作権表示](NOTICE)
