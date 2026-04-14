package com.phoenix.browser

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.bottomnavigation.BottomNavigationView

class MeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_me)

        // ユーザー名表示
        val tvUserName = findViewById<TextView>(R.id.tvUserName)
        tvUserName.text = PrefsManager.getUserName(this)

        // ダークモードスイッチ
        val switchDark = findViewById<Switch>(R.id.switchDarkMode)
        switchDark.isChecked = PrefsManager.isDarkMode(this)
        switchDark.setOnCheckedChangeListener { _, checked ->
            PrefsManager.setDarkMode(this, checked)
            Toast.makeText(this,
                if (checked) getString(R.string.dark_mode_on) else getString(R.string.dark_mode_off),
                Toast.LENGTH_SHORT).show()
        }

        // メニュー行
        val items = mapOf(
            R.id.menuBookmarks  to { toast(getString(R.string.bookmarks)) },
            R.id.menuHistory    to { toast(getString(R.string.history)) },
            R.id.menuFollowing  to { toast(getString(R.string.following)) },
            R.id.menuSettings   to { startActivity(Intent(this, SettingsActivity::class.java)) },
            R.id.menuFacebook   to { openUrl("https://facebook.com") },
            R.id.menuUpload     to { toast(getString(R.string.upload_content)) },
            R.id.menuShare      to { shareApp() },
            R.id.menuHelp       to { toast(getString(R.string.help_feedback)) }
        )
        items.forEach { (id, action) ->
            findViewById<LinearLayout>(id).setOnClickListener { action() }
        }

        // ボトムナビ
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNav)
        bottomNav.selectedItemId = R.id.nav_me
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    startActivity(Intent(this, MainActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                    finish(); true
                }
                R.id.nav_explore -> {
                    startActivity(Intent(this, BrowserActivity::class.java)
                        .putExtra("url", "https://news.google.com/topstories?hl=ja"))
                    false
                }
                R.id.nav_me -> true
                else -> false
            }
        }
    }

    private fun toast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    private fun openUrl(url: String) {
        startActivity(Intent(this, BrowserActivity::class.java).putExtra("url", url))
    }

    private fun shareApp() {
        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, getString(R.string.share_phoenix_text))
            type = "text/plain"
        }
        startActivity(Intent.createChooser(intent, getString(R.string.share)))
    }
}
