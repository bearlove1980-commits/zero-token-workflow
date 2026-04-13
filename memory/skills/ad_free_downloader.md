# 広告なしダウンローダーアプリ設計スキル

## 概要
既存の広告入りダウンローダーアプリ（例: `video.downloader.tiktok.instagram.file.saver.vault`）を
改造するのではなく、ゼロから合法的な広告なしダウンローダーを作るためのアプローチ。

## 重要な前提（法務）
1. **既存アプリの改造は不可** — 利用規約違反・リバースエンジニアリング禁止条項に抵触
2. **SNS スクレイピングは含めない** — TikTok / Instagram / X 等の公式 API 外取得は規約違反
3. **想定用途** — 自前ファイル、CC ライセンス素材、パブリックドメイン、明示的に配布許諾された素材

## 技術スタック（最小構成）
- **Expo (React Native)** — iOS/Android 両対応、OTA 更新
- **expo-file-system** — `createDownloadResumable` で進捗付きダウンロード
- **expo-media-library** — 画像/動画を写真ライブラリへ保存
- **expo-sharing** — OS 標準の共有シート連携
- 広告 / アナリティクス SDK は**一切入れない**

## アーキテクチャ骨子
```
App.js
└─ DownloaderScreen.js   UI (URL 入力 / 進捗 / 履歴 / 共有)
   └─ downloader.js      validateUrl / filenameFromUrl / downloadFile
```

## 実装上の要点
- URL 検証で `http` / `https` 以外を弾く（`file://` や `javascript:` を防ぐ）
- ファイル名は URL 末尾から推測、拡張子なしは `.bin`
- 画像/動画拡張子なら MediaLibrary にも登録
- ダウンロードは `createDownloadResumable` で進捗コールバックを取る

## 広告ゼロを保つための注意
- `package.json` に `react-native-google-mobile-ads` / `@react-native-firebase/*` を入れない
- Expo プラグインの `expo-notifications` は入れる場合もプッシュ SDK とは別
- デバッグ時に Sentry 等のエラートラッキングを入れる場合もユーザー同意 UI を必須に

## 次段階の機能候補
- AsyncStorage での履歴永続化
- WiFi 限定ダウンロードオプション
- バックグラウンドダウンロード（iOS `URLSession`、Android `WorkManager`）
- ファイルタイプ別のカスタムビューア

## 関連ファイル
- `downloader_app/` — 最小スキャフォールド
- `downloader_app/README.md` — 利用範囲とセットアップ手順
