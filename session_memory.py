"""
Session Memory — セッション記憶の自動保存と次回引き継ぎ
"""

import json
from pathlib import Path
from datetime import datetime

MEMORY_DIR = Path("memory")
SESSIONS_DIR = MEMORY_DIR / "sessions"
SKILLS_DIR = MEMORY_DIR / "skills"
CONTEXT_FILE = MEMORY_DIR / "context.md"


def init_dirs():
    for d in [MEMORY_DIR, SESSIONS_DIR, SKILLS_DIR]:
        d.mkdir(exist_ok=True)


def save_session(summary, learnings=None, decisions=None, next_actions=None, sources_analyzed=None):
    init_dirs()
    timestamp = datetime.now()
    session_id = timestamp.strftime("%Y%m%d_%H%M%S")

    session = {
        "id": session_id,
        "timestamp": timestamp.isoformat(),
        "summary": summary,
        "learnings": learnings or [],
        "decisions": decisions or [],
        "next_actions": next_actions or [],
        "sources_analyzed": sources_analyzed or []
    }

    session_file = SESSIONS_DIR / f"{session_id}.json"
    session_file.write_text(
        json.dumps(session, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    _update_context(session)
    print(f"セッションを保存しました: {session_file}")
    return session_id


def _update_context(latest_session):
    past_sessions = _load_recent_sessions(n=5)

    lines = [
        "# 引き継ぎコンテキスト",
        f"*最終更新: {datetime.now().strftime('%Y-%m-%d %H:%M')}*",
        "",
        "## 直近セッションのサマリー",
    ]

    for s in past_sessions:
        lines.append(f"\n### {s['timestamp'][:10]} — {s['summary']}")
        if s.get("learnings"):
            lines.append("**学んだこと:**")
            for l in s["learnings"]:
                lines.append(f"- {l}")
        if s.get("next_actions"):
            lines.append("**次のアクション:**")
            for a in s["next_actions"]:
                lines.append(f"- [ ] {a}")

    lines += ["", "## 習得済みスキル"]
    for skill_file in sorted(SKILLS_DIR.glob("*.md")):
        lines.append(f"- {skill_file.stem}")

    CONTEXT_FILE.write_text("\n".join(lines), encoding="utf-8")


def _load_recent_sessions(n=5):
    files = sorted(SESSIONS_DIR.glob("*.json"), reverse=True)[:n]
    sessions = []
    for f in files:
        try:
            sessions.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception:
            pass
    return sessions


def load_context():
    if not CONTEXT_FILE.exists():
        return "（過去のセッション記録なし）"
    return CONTEXT_FILE.read_text(encoding="utf-8")


def print_context():
    print("=" * 60)
    print(load_context())
    print("=" * 60)


def save_skill(skill_name, content, tags=None):
    init_dirs()
    skill_file = SKILLS_DIR / f"{skill_name}.md"
    header = f"""---
name: {skill_name}
created: {datetime.now().isoformat()}
tags: {', '.join(tags or [])}
---

"""
    skill_file.write_text(header + content, encoding="utf-8")
    print(f"スキルを保存しました: {skill_file}")


def list_skills():
    return [f.stem for f in SKILLS_DIR.glob("*.md")]


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python session_memory.py [save|load|skills]")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "save":
        print("セッションサマリーを入力してください:")
        summary = input("> ").strip()
        print("学んだこと（空行で終了）:")
        learnings = []
        while True:
            line = input("> ").strip()
            if not line:
                break
            learnings.append(line)
        print("次のアクション（空行で終了）:")
        actions = []
        while True:
            line = input("> ").strip()
            if not line:
                break
            actions.append(line)
        save_session(summary=summary, learnings=learnings, next_actions=actions)

    elif cmd == "load":
        print_context()

    elif cmd == "skills":
        skills = list_skills()
        if skills:
            print("習得済みスキル:")
            for s in skills:
                print(f"  - {s}")
        else:
            print("（スキルなし）")
