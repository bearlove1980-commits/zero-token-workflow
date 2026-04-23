# Claude Code — プロジェクトルール

## トークン節約ルール

1. **CLAUDE.mdは500行以内**に保つ。長い資料は別ファイルに分けて、必要なときだけ読む。
2. **文書が3件以上**あるときはNotebookLMに投げる。Claudeは直接読まない。
3. **出力は簡潔に**。不要な説明・前置き・まとめは省く。
4. **同じ内容を繰り返さない**。一度説明したことは「前述の通り」で済ませる。
5. **サブエージェントを活用**してメインのコンテキストを節約する。重い調査はAgentに任せる。
6. **セッション終了時**は `python workflow.py save-session` を必ず実行する。

## 個人情報の保護ルール

### 絶対に書いてはいけない情報
以下の情報は、コード・設定ファイル・コメント・ログのどこにも書かない：

- **名前**（本名・フルネーム）
- **住所**（自宅・会社）
- **電話番号**
- **パスワード**（どんなサービスのものも）
- **APIキー・シークレット**（OpenAI, Anthropic, AWS など全て）
- **クレジットカード番号**

### APIキーやパスワードの正しい書き方
```
# 悪い例（絶対やらない）
API_KEY = "sk-abc123..."

# 良い例（環境変数から読む）
API_KEY = os.environ.get("API_KEY")
```

### GitHubにアップロードする前のチェック
`git commit` や `git push` の前に必ず確認する：

1. `.env` ファイルが `.gitignore` に入っているか確認する
2. コード中に個人情報が含まれていないか確認する
3. 上記の漏れを見つけたら、即座にユーザーに警告して作業を止める

### .gitignore に必ず入れるもの
```
.env
.env.local
.env.*
*.key
*.pem
secrets/
```

## コマンド一覧

```bash
# 文書分析をNotebookLMに依頼
python workflow.py analyze --sources "paper.pdf,https://example.com"

# Webリサーチ → スキル保存
python workflow.py research --topic "テーマ" --save-as-skill "skill_name"

# セッション記憶を保存
python workflow.py save-session

# 前回の記憶を引き継ぐ
python workflow.py load-context
```
