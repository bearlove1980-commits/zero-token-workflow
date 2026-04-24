// Zero Token Workflow — スプレッドシートロガー
// Google Apps Script として デプロイ → ウェブアプリ URL を GAS_WEB_APP_URL に設定

const SHEET_NAME = "workflow_log";
const SCRIPT_PROP_KEY = "SPREADSHEET_ID";

// 列定義: 9列 → 12列
const COLUMNS = [
  "タイムスタンプ",       // A
  "セッションID",         // B
  "コマンド",             // C
  "ソース一覧",           // D
  "ソース数",             // E
  "クエリ",               // F
  "回答サマリー",         // G
  "ノートブックURL",      // H
  "ステータス",           // I
  "スキル名",             // J ← 追加
  "タグ",                 // K ← 追加
  "節約トークン推定",     // L ← 追加
];

function setupSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(4, 300);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 400);
  }
  return sheet;
}

function getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty(SCRIPT_PROP_KEY);

  if (spreadsheetId) {
    try {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      setupSheet(ss);
      return ss;
    } catch (e) {
      props.deleteProperty(SCRIPT_PROP_KEY);
    }
  }

  const ss = SpreadsheetApp.create("Zero Token Workflow Log");
  props.setProperty(SCRIPT_PROP_KEY, ss.getId());
  setupSheet(ss);
  return ss;
}

function getLogSheet() {
  const ss = getOrCreateSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

// 保存先スプレッドシートを切り替える（Apps Script エディタで直接実行）
// 引数を変更してから「実行」を押す
function setSpreadsheetId() {
  const newId = "1_wbeoE8Ks4x92fi1YFC77w75P4H3msygGu4IDImHr1o"; // ← 切り替え先IDをここに設定
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_KEY, newId);
  const ss = SpreadsheetApp.openById(newId);
  setupSheet(ss);
  Logger.log("保存先を切り替えました: " + ss.getUrl());
}

// 旧スプレッドシートのデータを新しい保存先に移行する（一度だけ実行）
function migrateDataFromOldSpreadsheet() {
  const sourceId = "1DpJDaaDWchJW2XyW-3qXqdwKN86NusrATzuu6pw3p-8"; // ← 移行元ID
  const sourceSheet = SpreadsheetApp.openById(sourceId).getSheetByName(SHEET_NAME);
  if (!sourceSheet) {
    Logger.log('移行元シート "' + SHEET_NAME + '" が見つかりません');
    return;
  }
  const rows = sourceSheet.getDataRange().getValues();
  const dataRows = rows.slice(1); // ヘッダー行を除く
  if (dataRows.length === 0) {
    Logger.log("移行するデータがありません");
    return;
  }
  const destSheet = getLogSheet();
  destSheet.getRange(destSheet.getLastRow() + 1, 1, dataRows.length, dataRows[0].length)
    .setValues(dataRows);
  Logger.log(dataRows.length + " 行を移行しました");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    logToSheet(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(data) {
  const sheet = getLogSheet();
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.session_id || "",
    data.command || "",
    (data.sources || []).join("\n"),
    data.sources_count || 0,
    data.query || "",
    (data.answer || "").substring(0, 500),
    data.notebook_url || "",
    data.status || "ok",
    data.skill_name || "",
    (data.tags || []).join(", "),
    data.tokens_saved || 0,
  ]);
}

// 列構成変更後に一度だけ実行: SPREADSHEET_ID を削除して新シートを再生成させる
function resetSpreadsheetId() {
  PropertiesService.getScriptProperties().deleteProperty(SCRIPT_PROP_KEY);
  Logger.log("SPREADSHEET_ID を削除しました。次回のdoPost時に新規作成されます。");
}

function getSpreadsheetUrl() {
  const url = getOrCreateSpreadsheet().getUrl();
  Logger.log(url);
  return url;
}
