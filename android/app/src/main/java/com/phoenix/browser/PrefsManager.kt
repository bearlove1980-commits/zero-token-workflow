package com.phoenix.browser

import android.content.Context
import android.content.SharedPreferences

object PrefsManager {
    private const val PREFS_NAME = "phoenix_prefs"

    private const val KEY_IMAGES_ENABLED   = "images_enabled"
    private const val KEY_JS_ENABLED       = "js_enabled"
    private const val KEY_DARK_MODE        = "dark_mode"
    private const val KEY_SEARCH_ENGINE    = "search_engine"
    private const val KEY_USER_NAME        = "user_name"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ---- 画像読み込み ----
    fun isImagesEnabled(ctx: Context): Boolean =
        prefs(ctx).getBoolean(KEY_IMAGES_ENABLED, true)

    fun setImagesEnabled(ctx: Context, enabled: Boolean) =
        prefs(ctx).edit().putBoolean(KEY_IMAGES_ENABLED, enabled).apply()

    // ---- JavaScript ----
    fun isJsEnabled(ctx: Context): Boolean =
        prefs(ctx).getBoolean(KEY_JS_ENABLED, true)

    fun setJsEnabled(ctx: Context, enabled: Boolean) =
        prefs(ctx).edit().putBoolean(KEY_JS_ENABLED, enabled).apply()

    // ---- ダークモード ----
    fun isDarkMode(ctx: Context): Boolean =
        prefs(ctx).getBoolean(KEY_DARK_MODE, false)

    fun setDarkMode(ctx: Context, enabled: Boolean) =
        prefs(ctx).edit().putBoolean(KEY_DARK_MODE, enabled).apply()

    // ---- 検索エンジン ----
    fun getSearchEngine(ctx: Context): String =
        prefs(ctx).getString(KEY_SEARCH_ENGINE, "Google") ?: "Google"

    fun setSearchEngine(ctx: Context, engine: String) =
        prefs(ctx).edit().putString(KEY_SEARCH_ENGINE, engine).apply()

    fun buildSearchUrl(ctx: Context, query: String): String {
        val encoded = java.net.URLEncoder.encode(query, "UTF-8")
        return when (getSearchEngine(ctx)) {
            "Bing"  -> "https://www.bing.com/search?q=$encoded"
            "Yahoo" -> "https://search.yahoo.co.jp/search?p=$encoded"
            "DuckDuckGo" -> "https://duckduckgo.com/?q=$encoded"
            else    -> "https://www.google.com/search?q=$encoded"
        }
    }

    // ---- ユーザー名 ----
    fun getUserName(ctx: Context): String =
        prefs(ctx).getString(KEY_USER_NAME, "ゲスト") ?: "ゲスト"

    // ---- URL 正規化 ----
    fun normalizeUrl(input: String): String {
        val trimmed = input.trim()
        return when {
            trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
            trimmed.contains(".") && !trimmed.contains(" ") -> "https://$trimmed"
            else -> null  // caller should use search
        } ?: trimmed
    }
}
