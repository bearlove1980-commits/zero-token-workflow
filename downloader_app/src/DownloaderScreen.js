import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { downloadFile } from './downloader';
import ProgressBar from './ProgressBar';
import {
  loadHistory,
  appendHistory,
  removeHistoryItem,
  clearHistory,
} from './history';

export default function DownloaderScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  async function handleDownload() {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(0);
    try {
      const result = await downloadFile(url.trim(), setProgress);
      const item = {
        uri: result.uri,
        filename: result.filename,
        at: new Date().toISOString(),
      };
      const next = await appendHistory(item, history);
      setHistory(next);
      setUrl('');
      Alert.alert('完了', `${result.filename} を保存しました`);
    } catch (err) {
      Alert.alert('失敗', err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  }

  async function handleShare(uri) {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('共有不可', 'この端末では共有シートを利用できません');
      return;
    }
    await Sharing.shareAsync(uri);
  }

  async function handleRemove(uri) {
    const next = await removeHistoryItem(uri, history);
    setHistory(next);
  }

  function handleClearAll() {
    Alert.alert('履歴を全消去しますか？', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '消去',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setHistory([]);
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ad-Free Downloader</Text>
      <Text style={styles.subtitle}>
        直リンク URL を入力してファイルを保存します。広告・追跡は一切ありません。
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://example.com/file.mp4"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!loading}
        />
        <Pressable
          style={styles.pasteButton}
          onPress={handlePaste}
          disabled={loading}
        >
          <Text style={styles.pasteButtonText}>貼付</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>ダウンロード</Text>
        )}
      </Pressable>

      {loading && <ProgressBar progress={progress} />}

      {history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>履歴 ({history.length})</Text>
            <Pressable onPress={handleClearAll} hitSlop={8}>
              <Text style={styles.clearText}>全消去</Text>
            </Pressable>
          </View>
          {history.map((item, idx) => (
            <View key={`${item.uri}-${idx}`} style={styles.historyItem}>
              <Pressable
                style={styles.historyMain}
                onPress={() => handleShare(item.uri)}
              >
                <Text style={styles.historyName} numberOfLines={1}>
                  {item.filename}
                </Text>
                <Text style={styles.historyHint}>タップして共有</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item.uri)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.notice}>
        ※ 著作権・各サービスの利用規約を遵守してご利用ください。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pasteButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasteButtonText: {
    fontSize: 14,
    color: '#2b6cb0',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2b6cb0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  historySection: {
    marginTop: 32,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 13,
    color: '#c53030',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyMain: {
    flex: 1,
  },
  historyName: {
    fontSize: 15,
  },
  historyHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  removeText: {
    fontSize: 20,
    color: '#999',
  },
  notice: {
    marginTop: 40,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
