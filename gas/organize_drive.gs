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

// 入所者のフルネーム以外の表記揺れ・別名 (居室名・ひらがな表記など)。
// キーは利用者一覧Docのフルネーム (空白の有無は気にしなくてOK。内部で正規化して照合)。
// 値はファイル名に含まれていたら同じ入所者と見なす文字列のリスト。
// ※ 苗字だけのエイリアスは「同姓の入所者がいない」場合のみ追加すること
//    (岸さんが2名・吉田さんが2名いるため "岸" "吉田" は登録しない)。
const ALIASES = {
  // ===== 神立 (9名) =====
  "藤井 正子":   ["はと"],
  "渡部 壽美江": ["たんちょう"],
  "青木 利夫":   ["きじ", "あおき"],
  "稲田 英子":   ["ひばり"],
  "福田 ミサ":   ["かもめ"],
  "白石 ヒサ":   ["とき"],
  "永田 延枝":   ["めじろ"],
  "黒田 泰子":   ["うぐいす", "黒田", "くろだ"],
  "高橋 恒夫":   ["つばめ"],

  // ===== 八雲 (10名) =====
  "松田 タミ子": ["もっこう"],
  "和泉 保":     ["ぶな"],
  "河原 乙市":   ["やつで"],
  "森田 季子":   ["ふよう"],
  "岸 三代吉":   ["もみじ"],
  "佐藤 久枝":   ["くすのき"],
  "高尾 広子":   ["あけび"],
  "吉田 正徳":   ["けやき"],
  "住田 澄子":   ["なんてん"],
  "岸 文子":     ["ひのき"],

  // ===== 瑞穂 (10名) =====
  "吉田 元子":   ["けいとう"],
  "明正 和子":   ["いちい"],
  "金山 クニ子": ["ひまわり"],
  "片寄 伊佐子": ["あさがお"],
  "糸賀 杜企子": ["はまゆう"],
  "金築 隆":     ["たんぽぽ"],
  "原田 繫子":   ["れんげ"],
  "中山 俊行":   ["りんどう"],
  "長谷 敏子":   ["ゆうがお"],
  "澄田 誠":     ["つつじ"],
};

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
    const normName = normalize_(name);
    const aliasList = lookupAliases_(name);
    residents.push({
      name: name,
      unit: unit,
      normName: normName,
      normAliases: aliasList.map(normalize_).filter(a => a && a !== normName),
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

// ALIASES の引き当て: キーを正規化して照合するので、Doc側の空白の有無は気にしなくて良い。
function lookupAliases_(name) {
  const norm = normalize_(name);
  const keys = Object.keys(ALIASES);
  for (let i = 0; i < keys.length; i++) {
    if (normalize_(keys[i]) === norm) return ALIASES[keys[i]];
  }
  return [];
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
  // 入所者名 + エイリアスをすべて (resident, key) ペアにし、長い順にソート。
  // 「山田」より「山田太郎」を先に当てる、エイリアス「黒田」より本名「黒田 泰子」を先に当てる。
  const keys = [];
  residents.forEach(r => {
    keys.push({ resident: r, key: r.normName });
    (r.normAliases || []).forEach(a => keys.push({ resident: r, key: a }));
  });
  keys.sort((a, b) => b.key.length - a.key.length);

  const moves = [];
  const it = careFolder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    const norm = normalize_(name);
    const hits = keys.filter(k => norm.indexOf(k.key) !== -1);
    if (hits.length === 0) {
      moves.push({ kind: "unmatched_file", file: f, fileName: name });
      continue;
    }
    // 最長一致と同じ長さのヒットのみ採用 (短い別名で誤検出するのを防ぐ)
    const topLen = hits[0].key.length;
    const topResidents = {};
    hits.forEach(h => {
      if (h.key.length === topLen) topResidents[h.resident.normName] = h.resident;
    });
    const tops = Object.keys(topResidents).map(k => topResidents[k]);
    if (tops.length > 1) {
      moves.push({ kind: "ambiguous_file", file: f, fileName: name, candidates: tops });
    } else {
      moves.push({
        kind: "file_move",
        file: f,
        fileName: name,
        resident: tops[0],
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
