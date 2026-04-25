// Zero Token Workflow — Drive 整理スクリプト
//
// マイドライブ/care/ 配下を「ユニット → 入所者」階層に再編する。
//
// 想定する整理後の構造:
//   マイドライブ/care/
//     ├── 神立/<入所者>/...
//     ├── 八雲/<入所者>/...
//     └── 瑞穂/<入所者>/...
//
// 使い方 (Apps Script エディタから関数を選んで実行):
//   1) verifyResidentList()     … 利用者一覧Docのパース結果だけログ出力
//   2) organizeDriveDryRun()    … 何をどこへ動かすか「レポートだけ」出力（移動なし）
//   3) organizeDriveExecute()   … レポート内容で問題なければ実行
//
// 設定はスクリプトプロパティでも上書き可:
//   RESIDENT_DOC_ID  : 利用者一覧 Google ドキュメントのID
//   CARE_FOLDER_NAME : 整理対象のトップフォルダ名 (既定 "care")

const DEFAULT_RESIDENT_DOC_ID = "1vryVBP5Jydf5dcI8Plys6DXQEpKlL6jbpVMdtpEkke8";
const DEFAULT_CARE_FOLDER_NAME = "care";
const UNITS = ["神立", "八雲", "瑞穂"];

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    residentDocId: props.getProperty("RESIDENT_DOC_ID") || DEFAULT_RESIDENT_DOC_ID,
    careFolderName: props.getProperty("CARE_FOLDER_NAME") || DEFAULT_CARE_FOLDER_NAME,
  };
}

// ========== エントリポイント ==========

function verifyResidentList() {
  const residents = parseResidentList_();
  Logger.log("=== 利用者一覧 パース結果: %s名 ===", residents.length);
  UNITS.forEach(u => {
    const list = residents.filter(r => r.unit === u);
    Logger.log("[%s] %s名: %s", u, list.length, list.map(r => r.name).join(", "));
  });
  return residents;
}

function organizeDriveDryRun() {
  return organizeDrive_(true);
}

function organizeDriveExecute() {
  return organizeDrive_(false);
}

// ========== メインロジック ==========

function organizeDrive_(dryRun) {
  const cfg = getConfig_();
  const residents = parseResidentList_();
  const careFolder = findCareFolder_(cfg.careFolderName);

  // ユニットフォルダを (必要なら) 用意
  const unitFolders = ensureUnitFolders_(careFolder, dryRun);

  // 既存の入所者フォルダ (移動先候補) を把握
  const ensured = ensureResidentFolderHandles_(unitFolders, residents);

  // (B案) care/直下にある入所者フォルダ → ユニット下へ移動 計画
  const folderPlan = planResidentFolderMoves_(careFolder, residents, ensured);

  // (A案) care/直下のばらまきファイル → ユニット/入所者/ へ移動 計画
  const filePlan = planLooseFileMoves_(careFolder, residents, ensured);

  const report = buildReport_(residents, unitFolders, ensured, folderPlan, filePlan, dryRun);
  Logger.log(report);

  if (!dryRun) {
    executeFolderMoves_(folderPlan, ensured, cfg.careFolderName);
    executeFileMoves_(filePlan, ensured);
    Logger.log("=== 実行完了 ===");
  } else {
    Logger.log("=== ドライラン: 何も移動していません。問題なければ organizeDriveExecute() を実行 ===");
  }
  return report;
}

// ========== 利用者一覧パース ==========

function parseResidentList_() {
  const cfg = getConfig_();
  const doc = DocumentApp.openById(cfg.residentDocId);
  const text = doc.getBody().getText();
  const lines = text.split(/\r?\n/);

  // 例: "青木 利夫（神立）"  全角/半角カッコ・全角/半角スペース両対応
  const re = /^(.+?)[\s　]*[（(]\s*(.+?)\s*[）)]\s*$/;
  const residents = [];
  const skipped = [];

  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const m = line.match(re);
    if (!m) {
      skipped.push(line);
      return;
    }
    const name = m[1].trim();
    const unit = m[2].trim();
    if (UNITS.indexOf(unit) === -1) {
      skipped.push(line + " (未知ユニット: " + unit + ")");
      return;
    }
    residents.push({
      name: name,
      unit: unit,
      normName: normalize_(name),
    });
  });

  if (skipped.length) {
    Logger.log("(参考) パース対象外の行: %s", skipped.length);
    skipped.forEach(s => Logger.log("  - %s", s));
  }

  // 重複チェック (normalize 後)
  const seen = {};
  residents.forEach(r => {
    if (seen[r.normName]) {
      Logger.log("警告: 同名らしい利用者が複数 → '%s'", r.name);
    }
    seen[r.normName] = true;
  });

  return residents;
}

// 表記揺れ吸収用: 半角/全角空白を全部除去して小文字化、末尾「さん」「様」を落とす。
function normalize_(s) {
  if (s == null) return "";
  return String(s)
    .replace(/[\s　]+/g, "")
    .replace(/(さん|様)$/, "")
    .toLowerCase();
}

// ========== フォルダ操作ヘルパ ==========

function findCareFolder_(name) {
  const root = DriveApp.getRootFolder();
  const it = root.getFoldersByName(name);
  if (!it.hasNext()) {
    throw new Error("マイドライブ直下に '" + name + "' フォルダが見つかりません");
  }
  const folder = it.next();
  if (it.hasNext()) {
    Logger.log("警告: マイドライブ直下に '%s' が複数あります。最初の1件を使用します。", name);
  }
  return folder;
}

function ensureUnitFolders_(careFolder, dryRun) {
  const out = {};
  UNITS.forEach(unit => {
    const it = careFolder.getFoldersByName(unit);
    if (it.hasNext()) {
      out[unit] = { folder: it.next(), created: false };
    } else if (dryRun) {
      out[unit] = { folder: null, created: false, willCreate: true };
    } else {
      out[unit] = { folder: careFolder.createFolder(unit), created: true };
    }
  });
  return out;
}

// 既存の入所者フォルダ(care/<unit>/<name>)を引き当て。dry-run時は parent が null の場合あり。
function ensureResidentFolderHandles_(unitFolders, residents) {
  const out = {};
  residents.forEach(r => {
    const u = unitFolders[r.unit];
    let existing = null;
    if (u && u.folder) {
      const it = u.folder.getFoldersByName(r.name);
      if (it.hasNext()) existing = it.next();
    }
    out[r.normName] = {
      resident: r,
      unitInfo: u,
      folder: existing,            // 既存の入所者フォルダ (なければ null)
      willCreate: !existing,       // 実行時に必要なら作成
    };
  });
  return out;
}

// ========== 計画 ==========

function planResidentFolderMoves_(careFolder, residents, ensured) {
  const moves = [];
  const it = careFolder.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    const folderName = f.getName();
    if (UNITS.indexOf(folderName) !== -1) continue; // ユニットフォルダ自体はスキップ
    const norm = normalize_(folderName);
    const r = residents.find(x => x.normName === norm);
    if (!r) {
      moves.push({ kind: "unknown_folder", folder: f, folderName: folderName });
      continue;
    }
    const target = ensured[r.normName];
    moves.push({
      kind: "folder_move",
      folder: f,
      folderName: folderName,
      resident: r,
      conflict: !!target.folder, // 既に <unit>/<name>/ がある = 中身マージ要 → 自動移動はスキップ
    });
  }
  return moves;
}

function planLooseFileMoves_(careFolder, residents, ensured) {
  // 長い名前優先で照合 (例: "山田" より "山田太郎" を先に当てる)
  const sorted = residents.slice().sort((a, b) => b.normName.length - a.normName.length);
  const moves = [];
  const it = careFolder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    const norm = normalize_(name);
    const matches = sorted.filter(r => norm.indexOf(r.normName) !== -1);
    if (matches.length === 0) {
      moves.push({ kind: "unmatched_file", file: f, fileName: name });
    } else if (matches.length > 1 && matches[0].normName.length === matches[1].normName.length) {
      // 最長一致が複数 = 真の曖昧
      moves.push({ kind: "ambiguous_file", file: f, fileName: name, candidates: matches });
    } else {
      moves.push({
        kind: "file_move",
        file: f,
        fileName: name,
        resident: matches[0],
      });
    }
  }
  return moves;
}

// ========== 実行 ==========

function executeFolderMoves_(plan, ensured, careFolderName) {
  plan.forEach(m => {
    if (m.kind !== "folder_move") return;
    if (m.conflict) {
      Logger.log("スキップ(衝突): %s — care/%s/%s が既存。手動マージしてください。",
        m.folderName, m.resident.unit, m.resident.name);
      return;
    }
    const unitInfo = ensured[m.resident.normName].unitInfo;
    m.folder.moveTo(unitInfo.folder);
    // 移動後は (このフォルダ自体が) その入所者の正規フォルダになる
    ensured[m.resident.normName].folder = m.folder;
    ensured[m.resident.normName].willCreate = false;
  });
}

function executeFileMoves_(plan, ensured) {
  plan.forEach(m => {
    if (m.kind !== "file_move") return;
    const info = ensured[m.resident.normName];
    if (!info.folder) {
      // 入所者フォルダが無ければ作る
      info.folder = info.unitInfo.folder.createFolder(m.resident.name);
      info.willCreate = false;
    }
    m.file.moveTo(info.folder);
  });
}

// ========== レポート ==========

function buildReport_(residents, unitFolders, ensured, folderPlan, filePlan, dryRun) {
  const lines = [];
  lines.push("===== Drive 整理レポート (" + (dryRun ? "DRY-RUN" : "EXECUTE") + ") =====");
  lines.push("利用者数: " + residents.length + "  (神立=" +
    residents.filter(r => r.unit === "神立").length +
    ", 八雲=" + residents.filter(r => r.unit === "八雲").length +
    ", 瑞穂=" + residents.filter(r => r.unit === "瑞穂").length + ")");

  lines.push("");
  lines.push("--- ユニットフォルダ ---");
  UNITS.forEach(u => {
    const info = unitFolders[u];
    lines.push("  " + u + ": " + (info.folder ? "既存" : (info.willCreate ? "[新規作成予定]" : "未作成")));
  });

  lines.push("");
  lines.push("--- 入所者フォルダ (移動先) ---");
  let willCreate = 0, exists = 0;
  Object.keys(ensured).forEach(k => {
    if (ensured[k].folder) exists++; else willCreate++;
  });
  lines.push("  既存: " + exists + " / 必要に応じ新規作成: " + willCreate);

  lines.push("");
  lines.push("--- B案: care/直下の入所者フォルダ → ユニット下へ移動 ---");
  const fmOk = folderPlan.filter(x => x.kind === "folder_move" && !x.conflict);
  const fmConflict = folderPlan.filter(x => x.kind === "folder_move" && x.conflict);
  const unknownFolders = folderPlan.filter(x => x.kind === "unknown_folder");
  lines.push("  移動予定: " + fmOk.length + " / 衝突スキップ: " + fmConflict.length + " / 一覧外: " + unknownFolders.length);
  fmOk.forEach(m => lines.push("    " + m.folderName + "  →  care/" + m.resident.unit + "/"));
  fmConflict.forEach(m => lines.push("    [衝突] " + m.folderName + "  (care/" + m.resident.unit + "/" + m.resident.name + " が既存)"));
  unknownFolders.forEach(m => lines.push("    [一覧外] " + m.folderName));

  lines.push("");
  lines.push("--- A案: care/直下のばらまきファイル → 入所者フォルダへ移動 ---");
  const fileOk = filePlan.filter(x => x.kind === "file_move");
  const fileAmb = filePlan.filter(x => x.kind === "ambiguous_file");
  const fileNo = filePlan.filter(x => x.kind === "unmatched_file");
  lines.push("  移動予定: " + fileOk.length + " / 曖昧: " + fileAmb.length + " / 該当なし: " + fileNo.length);
  fileOk.forEach(m => lines.push("    " + m.fileName + "  →  care/" + m.resident.unit + "/" + m.resident.name + "/"));
  fileAmb.forEach(m => lines.push("    [曖昧] " + m.fileName + "  候補: " + m.candidates.map(c => c.name).join(", ")));
  fileNo.forEach(m => lines.push("    [該当なし] " + m.fileName));

  lines.push("");
  lines.push("===== END =====");
  return lines.join("\n");
}
