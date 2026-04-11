#!/bin/bash
# Zero Token Research Workflow — Mac セットアップスクリプト
# 実行: chmod +x setup.sh && ./setup.sh

set -e

echo "Zero Token Research Workflow セットアップ"
echo "============================================"

# Python確認
if ! command -v python3 &>/dev/null; then
    echo "Python3が必要です: brew install python"
    exit 1
fi
echo "Python3: $(python3 --version)"

# pip依存インストール
echo "依存パッケージをインストール中..."
pip3 install playwright --quiet

# Playwrightブラウザインストール
echo "Chromiumをインストール中（初回のみ数分かかります）..."
python3 -m playwright install chromium

# ディレクトリ作成
echo "ディレクトリを作成中..."
mkdir -p memory/sessions memory/skills output

echo ""
echo "============================================"
echo "セットアップ完了！"
echo ""
echo "【次のステップ】"
echo "1. NotebookLMにログイン（初回のみ）:"
echo "   python3 notebooklm_bridge.py"
echo ""
echo "2. ワークフローを実行:"
echo "   python3 workflow.py analyze \\"
echo "     --sources 'https://example.com' \\"
echo "     --query '主要な内容を日本語で要約して'"
echo ""
echo "3. モックモード（Playwright不要）:"
echo "   python3 workflow.py analyze --sources '...' --mock"
