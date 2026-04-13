import React, { useState } from 'react';
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
import { downloadFile } from './downloader';

export default function DownloaderScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);

  async function handleDownload() {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(0);
    try {
      const result = await downloadFile(url.trim(), setProgress);
      setHistory((h) => [{ ...result, at: new Date() }, ...h]);
      setUrl('');
      Alert.alert('完了', `${result.filename} を保存しました`);
    } catch (err) {
      Alert.alert('失敗', err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  async function handleShare(uri) {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('共有不可', 'この端末では共有シートを利用できません');
      return;
    }
    await Sharing.shareAsync(uri);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ad-Free Downloader</Text>
      <Text style={styles.subtitle}>
        直リンク URL を入力してファイルを保存します。広告・追跡は一切ありません。
      </Text>

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

      {loading && progress > 0 && (
        <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      )}

      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>履歴</Text>
          {history.map((item, idx) => (
            <Pressable
              key={`${item.uri}-${idx}`}
              style={styles.historyItem}
              onPress={() => handleShare(item.uri)}
            >
              <Text style={styles.historyName} numberOfLines={1}>
                {item.filename}
              </Text>
              <Text style={styles.historyHint}>タップして共有</Text>
            </Pressable>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
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
  progress: {
    textAlign: 'center',
    marginTop: 8,
    color: '#555',
  },
  historySection: {
    marginTop: 32,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyName: {
    fontSize: 15,
  },
  historyHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  notice: {
    marginTop: 40,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
