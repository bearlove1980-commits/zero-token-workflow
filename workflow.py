"""
Zero Token Research Workflow — メインオーケストレーター

使い方:
  python workflow.py analyze --sources "paper.pdf,https://url.com" --query "要約して"
  python workflow.py research --topic "LLMエージェント" --save-as-skill "llm_agent"
  python workflow.py save-session
  python workflow.py load-context
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime

from session_memory import save_session, load_context, save_skill, print_context
from notebooklm_bridge import NotebookLMBridge, NotebookLMBridgeMock

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)


async def cmd_analyze(args):
    sources = [s.strip() for s in args.sources.split(",") if s.strip()]
    query = args.query or "主要なポイント、重要な発見、実践的な示唆を日本語で説明してください。"

    print(f"分析開始: {len(sources)}件のソース")
    print(f"クエリ: {query}")

    if args.mock:
        bridge = NotebookLMBridgeMock()
        query_file = bridge.prepare_query_file(sources, query)
        print(f"モックモード: {query_file} を編集して結果を貼り付けてください")
        return

    bridge = NotebookLMBridge(headless=not args.show_browser)
    auth_file = Path("memory/.notebooklm_auth.json")
    if not auth_file.exists():
        print("初回ログインが必要です...")
        await bridge.login_interactive()

    result = await bridge.create_notebook_and_query(
        sources=sources,
        query=query,
        notebook_title=f"Research_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_file = OUTPUT_DIR / f"analysis_{timestamp}.md"
    result_file.write_text(
        f"# 分析結果 — {timestamp}\n\n"
        f"## ソース\n" + "\n".join(f"- {s}" for s in sources) + "\n\n"
        f"## クエリ\n{query}\n\n"
        f"## NotebookLMの回答\n{result['answer']}\n",
        encoding="utf-8"
    )

    print(f"\n完了: {result_file}")
    print(result["answer"][:500])


async def cmd_research(args):
    topic = args.topic
    skill_name = args.save_as_skill or topic.replace(" ", "_")[:30]

    print(f"リサーチ開始: {topic}")

    if args.urls:
        urls = [u.strip() for u in args.urls.split(",")]
    else:
        print("分析するURLを入力してください（カンマ区切り）:")
        url_input = input("> ").strip()
        urls = [u.strip() for u in url_input.split(",") if u.strip()] if url_input else []

    if not urls:
        skill_content = f"# {topic}\n\n## 概要\n（ここに記入）\n\n## 手順\n1. \n\n## 注意点\n- \n"
        save_skill(skill_name, skill_content, tags=[topic])
        return

    query = f"{topic}について:\n1. 核心的な概念\n2. 実践的な手順\n3. よくある落とし穴\n4. 参考リソース"

    if args.mock:
        bridge = NotebookLMBridgeMock()
        bridge.prepare_query_file(urls, query)
        return

    bridge = NotebookLMBridge(headless=True)
    result = await bridge.create_notebook_and_query(sources=urls, query=query)

    skill_content = f"""# {topic}

## 情報源
{chr(10).join(f'- {u}' for u in urls)}

## 分析結果 ({datetime.now().strftime('%Y-%m-%d')})
{result['answer']}

## 実践メモ
（ここに使用経験を追記）
"""
    save_skill(skill_name, skill_content, tags=[topic, "research"])
    print(f"スキル '{skill_name}' を保存しました")


def cmd_save_session(args):
    print("セッションサマリー（1行）:")
    summary = input("> ").strip() or "作業セッション"

    print("学んだこと（空行で終了）:")
    learnings = []
    while True:
        line = input("> ").strip()
        if not line:
            break
        learnings.append(line)

    print("次回のアクション（空行で終了）:")
    actions = []
    while True:
        line = input("> ").strip()
        if not line:
            break
        actions.append(line)

    session_id = save_session(summary=summary, learnings=learnings, next_actions=actions)
    print(f"保存完了 (ID: {session_id})")


def cmd_load_context(args):
    print_context()


def main():
    parser = argparse.ArgumentParser(description="Zero Token Research Workflow")
    sub = parser.add_subparsers(dest="command")

    p_analyze = sub.add_parser("analyze")
    p_analyze.add_argument("--sources", required=True)
    p_analyze.add_argument("--query")
    p_analyze.add_argument("--show-browser", action="store_true")
    p_analyze.add_argument("--mock", action="store_true")

    p_research = sub.add_parser("research")
    p_research.add_argument("--topic", required=True)
    p_research.add_argument("--urls")
    p_research.add_argument("--save-as-skill")
    p_research.add_argument("--mock", action="store_true")

    sub.add_parser("save-session")
    sub.add_parser("load-context")

    args = parser.parse_args()

    if args.command == "analyze":
        asyncio.run(cmd_analyze(args))
    elif args.command == "research":
        asyncio.run(cmd_research(args))
    elif args.command == "save-session":
        cmd_save_session(args)
    elif args.command == "load-context":
        cmd_load_context(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
