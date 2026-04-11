# Zero Token Research Workflow — Claude Code Instructions

## このプロジェクトの目的
重い文書分析をNotebookLMに委ねることでClaudeのトークンを節約し、
分析結果だけをClaudeが受け取って編集・構造化する効率的なワークフロー。

## ワークフロー構造
[Claude Code] --指示だけ--> [NotebookLM] --Geminiが無料分析--> [Claude Code] --最小トークンで編集-->

## コマンド一覧

### 文書分析を依頼する
python workflow.py analyze --sources "paper.pdf,https://example.com,youtube_url"

### Webリサーチ → スキル化
python workflow.py research --topic "テーマ" --save-as-skill "skill_name"

### セッション記憶を保存
python workflow.py save-session

### 前回の記憶を引き継ぐ
python workflow.py load-context

## Claudeへのルール

1. 文書が3件以上あるときは必ずNotebookLMに投げる — 直接読まない
2. 分析結果のみ受け取り、編集・整形だけ行う — トークン最小化
3. セッション終了時は必ず save-session を実行する
4. 新しいスキルを習得したら memory/skills/ に保存する
5. NotebookLMへの入力はURL・PDF・YouTubeのみ — テキスト直貼り禁止
