package com.phoenix.browser

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        // 戻るボタン
        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }

        // ---- 画像読み込み (メインの新機能) ----
        val switchImages = findViewById<Switch>(R.id.switchImages)
        switchImages.isChecked = PrefsManager.isImagesEnabled(this)
        updateImagesLabel(switchImages)
        switchImages.setOnCheckedChangeListener { _, checked ->
            PrefsManager.setImagesEnabled(this, checked)
            updateImagesLabel(switchImages)
        }

        // ---- JavaScript ----
        val switchJs = findViewById<Switch>(R.id.switchJs)
        switchJs.isChecked = PrefsManager.isJsEnabled(this)
        switchJs.setOnCheckedChangeListener { _, checked ->
            PrefsManager.setJsEnabled(this, checked)
        }

        // ---- ダークモード ----
        val switchDark = findViewById<Switch>(R.id.switchDarkMode)
        switchDark.isChecked = PrefsManager.isDarkMode(this)
        switchDark.setOnCheckedChangeListener { _, checked ->
            PrefsManager.setDarkMode(this, checked)
        }

        // ---- 検索エンジン ----
        val rowSearch = findViewById<LinearLayout>(R.id.rowSearchEngine)
        val tvSearchValue = findViewById<TextView>(R.id.tvSearchEngineValue)
        tvSearchValue.text = PrefsManager.getSearchEngine(this)
        rowSearch.setOnClickListener { showSearchEnginePicker(tvSearchValue) }

        // ---- フォントサイズ ----
        findViewById<LinearLayout>(R.id.rowFontSize).setOnClickListener {
            Toast.makeText(this, getString(R.string.font_size), Toast.LENGTH_SHORT).show()
        }

        // ---- 言語 ----
        findViewById<LinearLayout>(R.id.rowLanguage).setOnClickListener {
            Toast.makeText(this, getString(R.string.language), Toast.LENGTH_SHORT).show()
        }

        // ---- ダウンロード ----
        findViewById<LinearLayout>(R.id.rowDownloads).setOnClickListener {
            Toast.makeText(this, getString(R.string.downloads), Toast.LENGTH_SHORT).show()
        }

        // ---- 通知 ----
        findViewById<LinearLayout>(R.id.rowNotifications).setOnClickListener {
            Toast.makeText(this, getString(R.string.notifications), Toast.LENGTH_SHORT).show()
        }

        // ---- データ消去 ----
        findViewById<LinearLayout>(R.id.rowClearData).setOnClickListener {
            showClearDataDialog()
        }

        // ---- デフォルトブラウザ ----
        val switchDefault = findViewById<Switch>(R.id.switchDefaultBrowser)
        switchDefault.setOnCheckedChangeListener { _, _ ->
            Toast.makeText(this, getString(R.string.set_as_default_browser), Toast.LENGTH_SHORT).show()
        }

        // ---- Phoenix について ----
        findViewById<LinearLayout>(R.id.rowAbout).setOnClickListener {
            Toast.makeText(this, "${getString(R.string.about_phoenix)} v1.0", Toast.LENGTH_SHORT).show()
        }

        // ---- フィードバック ----
        findViewById<LinearLayout>(R.id.rowFeedback).setOnClickListener {
            openUrl("https://forms.gle/feedback")
        }

        // ---- レーティング ----
        findViewById<LinearLayout>(R.id.rowRate).setOnClickListener {
            openUrl("https://play.google.com/store")
        }

        // ---- デフォルトにリセット ----
        findViewById<LinearLayout>(R.id.rowReset).setOnClickListener {
            showResetDialog()
        }
    }

    private fun updateImagesLabel(sw: Switch) {
        sw.text = if (sw.isChecked) getString(R.string.images_on) else getString(R.string.images_off)
    }

    private fun showSearchEnginePicker(tvValue: TextView) {
        val engines = arrayOf("Google", "Bing", "Yahoo", "DuckDuckGo")
        val current = engines.indexOf(PrefsManager.getSearchEngine(this)).coerceAtLeast(0)
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.search_engine))
            .setSingleChoiceItems(engines, current) { dialog, which ->
                val engine = engines[which]
                PrefsManager.setSearchEngine(this, engine)
                tvValue.text = engine
                dialog.dismiss()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun showClearDataDialog() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.clear_data))
            .setMessage(getString(R.string.clear_data_confirm))
            .setPositiveButton(getString(R.string.ok)) { _, _ ->
                android.webkit.WebStorage.getInstance().deleteAllData()
                android.webkit.CookieManager.getInstance().removeAllCookies(null)
                Toast.makeText(this, getString(R.string.data_cleared), Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun showResetDialog() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.reset_settings))
            .setMessage(getString(R.string.reset_confirm))
            .setPositiveButton(getString(R.string.ok)) { _, _ ->
                PrefsManager.setImagesEnabled(this, true)
                PrefsManager.setJsEnabled(this, true)
                PrefsManager.setDarkMode(this, false)
                PrefsManager.setSearchEngine(this, "Google")
                Toast.makeText(this, getString(R.string.settings_reset), Toast.LENGTH_SHORT).show()
                recreate()
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun openUrl(url: String) {
        startActivity(Intent(this, BrowserActivity::class.java).putExtra("url", url))
    }
}
