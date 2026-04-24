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
echo ""
echo "【スプレッドシートログ設定（任意）】"
echo "  ※ 列構成変更（9列→12列）後の初回は以下の移行手順が必要："
echo ""
echo "  Step 1: gas/Code.gs を Google Apps Script に貼り付け、"
echo "          ウェブアプリとしてデプロイ（アクセス: 全員）"
echo ""
echo "  Step 2: Apps Script エディタで resetSpreadsheetId() を一度実行"
echo "          （スクリプトプロパティの SPREADSHEET_ID を削除）"
echo "          ※ 既存データは古いシートに残るので事前にバックアップ推奨"
echo ""
echo "  Step 3: デプロイ後のウェブアプリ URL を登録:"
echo "   python3 workflow.py setup-gas --url 'https://script.google.com/...'"
echo ""
echo "  以降の analyze/research 実行時に新しい12列シートへ自動ログされます"
echo ""
echo "【保存先スプレッドシートの切り替え手順】"
echo "  現行: 1DpJDaaDWchJW2XyW-3qXqdwKN86NusrATzuu6pw3p-8"
echo "  新先: 1_wbeoE8Ks4x92fi1YFC77w75P4H3msygGu4IDImHr1o"
echo ""
echo "  Step 1: Apps Script エディタで setSpreadsheetId() を実行"
echo "          → SPREADSHEET_ID プロパティが新しいIDに書き換わり、"
echo "            workflow_log シートが自動作成されます"
echo ""
echo "  Step 2（任意）: 旧スプレッドシートのデータを移行する場合は"
echo "          migrateDataFromOldSpreadsheet() を実行"
echo "          → 旧シートの全行が新シートの末尾にコピーされます"
echo ""
echo "  Step 3: テスト送信して新シートに行が追加されることを確認"
