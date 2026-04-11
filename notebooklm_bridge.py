"""
NotebookLM Bridge — Playwright経由でNotebookLMをCLI操作する
依存: pip install playwright && playwright install chromium
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Optional


class NotebookLMBridge:
    NOTEBOOKLM_URL = "https://notebooklm.google.com"
    AUTH_STATE_PATH = Path("memory/.notebooklm_auth.json")

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def _get_browser(self):
        from playwright.async_api import async_playwright
        p = await async_playwright().start()
        storage_state = str(self.AUTH_STATE_PATH) if self.AUTH_STATE_PATH.exists() else None
        browser = await p.chromium.launch(headless=self.headless)
        context = await browser.new_context(storage_state=storage_state)
        return p, browser, context

    async def login_interactive(self):
        from playwright.async_api import async_playwright
        print("ブラウザを開きます。Googleアカウントでログインしてください...")
        p = await async_playwright().start()
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(self.NOTEBOOKLM_URL)
        print("ログイン完了後、Enterを押してください...")
        input()
        self.AUTH_STATE_PATH.parent.mkdir(exist_ok=True)
        await context.storage_state(path=str(self.AUTH_STATE_PATH))
        print("認証状態を保存しました")
        await browser.close()
        await p.stop()

    async def create_notebook_and_query(self, sources, query, notebook_title="Research"):
        p, browser, context = await self._get_browser()
        try:
            page = await context.new_page()
            await page.goto(self.NOTEBOOKLM_URL)
            await page.wait_for_load_state("networkidle")

            new_btn = await page.wait_for_selector(
                'button:has-text("新しいノートブック"), button:has-text("New notebook")',
                timeout=10000
            )
            await new_btn.click()
            await page.wait_for_load_state("networkidle")

            for source in sources:
                await self._add_source(page, source)
                await asyncio.sleep(2)

            print(f"{len(sources)}件のソースを処理中...")
            await asyncio.sleep(5)

            answer = await self._send_query(page, query)
            notebook_url = page.url

            return {
                "answer": answer,
                "notebook_url": notebook_url,
                "sources_count": len(sources),
                "timestamp": datetime.now().isoformat()
            }
        finally:
            await browser.close()
            await p.stop()

    async def _add_source(self, page, source):
        add_btn = await page.wait_for_selector(
            'button:has-text("ソースを追加"), button:has-text("Add source")',
            timeout=5000
        )
        await add_btn.click()
        await asyncio.sleep(1)

        if source.startswith("http"):
            url_input = await page.wait_for_selector(
                'input[placeholder*="URL"], input[type="url"]',
                timeout=5000
            )
            await url_input.fill(source)
            confirm = await page.wait_for_selector(
                'button:has-text("追加"), button:has-text("Add")',
                timeout=5000
            )
            await confirm.click()
        else:
            file_input = await page.wait_for_selector('input[type="file"]', timeout=5000)
            await file_input.set_input_files(source)

    async def _send_query(self, page, query):
        chat_input = await page.wait_for_selector(
            'textarea, [contenteditable="true"]',
            timeout=10000
        )
        await chat_input.fill(query)
        await page.keyboard.press("Enter")
        await asyncio.sleep(3)

        for _ in range(20):
            response_els = await page.query_selector_all(
                '.response-text, [data-message-role="assistant"] p'
            )
            if response_els:
                texts = [await el.inner_text() for el in response_els[-3:]]
                return "\n".join(texts)
            await asyncio.sleep(3)

        return "[タイムアウト: 応答を取得できませんでした]"


class NotebookLMBridgeMock:
    def __init__(self):
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)

    def prepare_query_file(self, sources, query):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        query_file = self.output_dir / f"query_{timestamp}.md"
        content = f"""# NotebookLM クエリ — {timestamp}

## ソース（NotebookLMに追加してください）
{chr(10).join(f'- {s}' for s in sources)}

## 質問
{query}

---

## NotebookLMの回答
<!-- ここに貼り付け -->
"""
        query_file.write_text(content, encoding="utf-8")
        print(f"クエリファイルを生成しました: {query_file}")
        return query_file

    def read_result(self, query_file):
        content = query_file.read_text(encoding="utf-8")
        marker = "## NotebookLMの回答\n<!-- ここに貼り付け -->"
        if marker in content:
            result = content.split(marker)[-1].strip()
            return result if result else None
        return None
