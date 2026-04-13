# Ad-Free Downloader (Expo)

広告のない、シンプルなファイルダウンローダーの最小スキャフォールドです。

## 設計方針

- **広告ゼロ**: 広告 SDK・アナリティクス・トラッカーを一切同梱しない
- **最小権限**: ストレージ書き込み権限のみ要求
- **直リンクのみ**: ユーザーが入力した HTTP(S) 直リンクを取得して保存
- **ゼロ依存 SNS**: TikTok / Instagram / X 等の SNS スクレイピング機能は**含めない**

## 合法的な利用範囲

このアプリは以下のような用途を想定しています:

- 自分自身が権利を持つファイル（自作動画、自前サーバーの素材）のダウンロード
- パブリックドメイン / Creative Commons ライセンスの素材
- 公式配布元から明示的に許可されたファイル

SNS プラットフォームの利用規約に違反する形での動画・画像取得には**使用しないでください**。

## 技術スタック

- [Expo](https://expo.dev/) (React Native)
- `expo-file-system` - ファイル I/O とダウンロード
- `expo-media-library` - 写真/ビデオライブラリへの保存
- `expo-sharing` - OS 標準の共有シートへ橋渡し

依存はこれだけで、広告/解析系の SDK は一切入れません。

## セットアップ

```bash
cd downloader_app
npm install
npx expo start
```

## プロジェクト構造

```
downloader_app/
├── App.js                 # エントリーポイント
├── app.json               # Expo 設定
├── package.json
└── src/
    ├── DownloaderScreen.js  # UI
    └── downloader.js        # ダウンロードロジック
```

## 次のステップ

- [ ] ダウンロード履歴の永続化（`AsyncStorage`）
- [ ] 複数ファイルの並列ダウンロード
- [ ] プログレスバー
- [ ] ダウンロード完了通知（`expo-notifications`）
