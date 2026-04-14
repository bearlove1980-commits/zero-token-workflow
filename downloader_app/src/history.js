import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ad_free_downloader/history';
const MAX_ITEMS = 200;

/**
 * 永続化された履歴を読み込む。存在しなければ空配列。
 * @returns {Promise<Array<{uri: string, filename: string, at: string}>>}
 */
export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 履歴を保存する（新しいものが先頭、上限 MAX_ITEMS）。
 * @param {Array} items
 */
export async function saveHistory(items) {
  const trimmed = items.slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * 1 件追加して保存。
 */
export async function appendHistory(item, current) {
  const next = [item, ...current];
  await saveHistory(next);
  return next;
}

/**
 * 指定の uri を履歴から削除。
 */
export async function removeHistoryItem(uri, current) {
  const next = current.filter((h) => h.uri !== uri);
  await saveHistory(next);
  return next;
}

/**
 * 履歴を全消去。
 */
export async function clearHistory() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
