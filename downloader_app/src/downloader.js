import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

/**
 * URL から推測されるファイル名を返す。拡張子が無い場合は bin を付ける。
 */
export function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'download';
    return last.includes('.') ? last : `${last}.bin`;
  } catch {
    return `download_${Date.now()}.bin`;
  }
}

/**
 * URL を検証。http/https の直リンクだけを許可する。
 * SNS 埋め込みページ等を渡された場合は、直リンクではないためエラーにする。
 */
export function validateUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('URL の形式が正しくありません');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('http / https のみ対応しています');
  }
  return u.toString();
}

/**
 * 指定 URL をダウンロードしてアプリのドキュメントディレクトリに保存する。
 * 画像/動画の場合は MediaLibrary にも登録。
 *
 * @param {string} url
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<{ uri: string, filename: string, mediaAsset?: object }>}
 */
export async function downloadFile(url, onProgress) {
  const validUrl = validateUrl(url);
  const filename = filenameFromUrl(validUrl);
  const target = FileSystem.documentDirectory + filename;

  const callback = onProgress
    ? (p) => {
        const ratio = p.totalBytesExpectedToWrite
          ? p.totalBytesWritten / p.totalBytesExpectedToWrite
          : 0;
        onProgress(ratio);
      }
    : undefined;

  const resumable = FileSystem.createDownloadResumable(
    validUrl,
    target,
    {},
    callback
  );

  const { uri } = await resumable.downloadAsync();

  let mediaAsset;
  if (/\.(mp4|mov|m4v|jpg|jpeg|png|gif|heic|webp)$/i.test(filename)) {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.granted) {
      mediaAsset = await MediaLibrary.createAssetAsync(uri);
    }
  }

  return { uri, filename, mediaAsset };
}
