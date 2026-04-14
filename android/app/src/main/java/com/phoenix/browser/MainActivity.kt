package com.phoenix.browser

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private lateinit var searchBar: EditText
    private lateinit var quickLinksRv: RecyclerView
    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        searchBar    = findViewById(R.id.searchBar)
        quickLinksRv = findViewById(R.id.quickLinksRv)
        bottomNav    = findViewById(R.id.bottomNav)

        setupSearch()
        setupQuickLinks()
        setupBottomNav()
    }

    private fun setupSearch() {
        searchBar.setOnEditorActionListener { _, actionId, event ->
            val go = actionId == EditorInfo.IME_ACTION_GO ||
                    (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            if (go) {
                val input = searchBar.text.toString().trim()
                if (input.isNotEmpty()) openBrowser(resolveUrl(input))
                hideKeyboard()
                true
            } else false
        }
        // AIボタン → Google Gemini
        findViewById<android.widget.ImageButton>(R.id.btnAi).setOnClickListener {
            openBrowser("https://gemini.google.com")
        }
    }

    private fun resolveUrl(input: String): String {
        if (input.startsWith("http://") || input.startsWith("https://")) return input
        if (input.contains(".") && !input.contains(" ")) return "https://$input"
        return PrefsManager.buildSearchUrl(this, input)
    }

    private fun setupQuickLinks() {
        val adapter = QuickLinkAdapter(QuickLinks.defaults) { link ->
            if (link.url.isNotEmpty()) openBrowser(link.url)
        }
        quickLinksRv.layoutManager = GridLayoutManager(this, 5)
        quickLinksRv.adapter = adapter
    }

    private fun setupBottomNav() {
        bottomNav.selectedItemId = R.id.nav_home
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home    -> true
                R.id.nav_explore -> { openBrowser("https://news.google.com/topstories?hl=ja"); false }
                R.id.nav_files   -> true  // ダウンロード画面（今後実装）
                R.id.nav_tabs    -> true  // タブ管理（今後実装）
                R.id.nav_me      -> {
                    startActivity(Intent(this, MeActivity::class.java))
                    false
                }
                else -> false
            }
        }
    }

    private fun openBrowser(url: String) {
        startActivity(Intent(this, BrowserActivity::class.java).putExtra("url", url))
    }

    private fun hideKeyboard() {
        val imm = getSystemService(InputMethodManager::class.java)
        imm?.hideSoftInputFromWindow(searchBar.windowToken, 0)
    }
}
