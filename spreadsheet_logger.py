"""
Spreadsheet Logger — Google Apps Script Web App 経由でワークフローをログ記録

セットアップ:
  1. gas/Code.gs を Google Apps Script に貼り付けてウェブアプリとしてデプロイ
  2. python workflow.py setup-gas --url "https://script.google.com/..."
     または環境変数 GAS_WEB_APP_URL に設定
"""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

CONFIG_FILE = Path("memory/gas_config.json")


def _load_web_app_url() -> str | None:
    if url := os.environ.get("GAS_WEB_APP_URL"):
        return url
    if CONFIG_FILE.exists():
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return config.get("web_app_url")
    return None


def log_workflow(
    command: str,
    sources: list = None,
    query: str = "",
    answer: str = "",
    notebook_url: str = "",
    status: str = "ok",
    skill_name: str = "",
    tags: list = None,
    tokens_saved: int = 0,
    session_id: str = None,
) -> bool:
    url = _load_web_app_url()
    if not url:
        return False

    payload = {
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id or datetime.now().strftime("%Y%m%d_%H%M%S"),
        "command": command,
        "sources": sources or [],
        "sources_count": len(sources or []),
        "query": query,
        "answer": answer,
        "notebook_url": notebook_url,
        "status": status,
        "skill_name": skill_name,
        "tags": tags or [],
        "tokens_saved": tokens_saved,
    }

    try:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("status") == "ok"
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        return False


def set_web_app_url(url: str) -> None:
    CONFIG_FILE.parent.mkdir(exist_ok=True)
    config = {}
    if CONFIG_FILE.exists():
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    config["web_app_url"] = url
    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Web App URL を保存しました: {CONFIG_FILE}")
