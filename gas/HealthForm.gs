// 介護記録フォーム — Google Apps Script
// フォームのチェックボックス選択肢を定義・生成する

const FORM_TITLE = "介護記録フォーム";

// フォーム項目定義
const FORM_SECTIONS = [
  {
    title: "徘徊・移動",
    type: "CHECKBOX",
    choices: [
      "徘徊",
      "転倒",
      "立ち上がり",   // 追加
    ],
  },
  {
    title: "食事・水分",
    type: "CHECKBOX",
    choices: [
      "食事拒否",
      "水分不足",
      "むせ込み",
      "嚥下困難",
    ],
  },
  {
    title: "排泄",
    type: "CHECKBOX",
    choices: [
      "失禁",
      "便秘",
      "下痢",
      "尿閉",
    ],
  },
  {
    title: "身体状況・健康変調・睡眠障害",
    type: "CHECKBOX",
    choices: [
      "発熱",
      "嘔吐",
      "不眠",
      "浮腫",
      "痛み",         // 追加
    ],
  },
  {
    title: "精神・行動",
    type: "CHECKBOX",
    choices: [
      "興奮",
      "幻覚",
      "抑うつ",
      "暴言・暴力",
    ],
  },
];

/**
 * フォームを新規作成して各セクションのチェックボックスを追加する。
 * GASエディタから手動で一度だけ実行する。
 */
function createHealthForm() {
  const form = FormApp.create(FORM_TITLE);
  form.setCollectEmail(false);

  FORM_SECTIONS.forEach(section => {
    const item = form.addCheckboxItem();
    item.setTitle(section.title);
    item.setChoiceValues(section.choices);
  });

  const url = form.getPublishedUrl();
  Logger.log("フォームURL: " + url);
  return url;
}

/**
 * 既存フォームの選択肢を FORM_SECTIONS の定義に合わせて同期する。
 * FORM_ID を設定してから実行する。
 */
function syncFormChoices() {
  const FORM_ID = PropertiesService.getScriptProperties().getProperty("HEALTH_FORM_ID");
  if (!FORM_ID) {
    throw new Error("スクリプトプロパティ HEALTH_FORM_ID が未設定です。");
  }

  const form = FormApp.openById(FORM_ID);
  const items = form.getItems(FormApp.ItemType.CHECKBOX);

  FORM_SECTIONS.forEach((section, idx) => {
    if (!items[idx]) return;
    const item = items[idx].asCheckboxItem();
    item.setTitle(section.title);
    item.setChoiceValues(section.choices);
  });

  Logger.log("選択肢を同期しました。");
}
