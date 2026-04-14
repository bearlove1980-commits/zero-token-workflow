package com.phoenix.browser

import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class NgFilterActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TYPE = "type"
        const val TYPE_WORDS = "words"
        const val TYPE_SITES = "sites"
    }

    private lateinit var type: String
    private lateinit var listContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ng_filter)

        type = intent.getStringExtra(EXTRA_TYPE) ?: TYPE_WORDS

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<TextView>(R.id.tvTitle).text =
            if (type == TYPE_WORDS) getString(R.string.ng_words) else getString(R.string.ng_sites)
        findViewById<TextView>(R.id.tvDesc).text =
            if (type == TYPE_WORDS) getString(R.string.ng_words_desc) else getString(R.string.ng_sites_desc)

        listContainer = findViewById(R.id.listContainer)
        findViewById<Button>(R.id.btnAdd).setOnClickListener { showAddDialog() }

        refreshList()
    }

    private fun getItems(): MutableSet<String> =
        if (type == TYPE_WORDS) PrefsManager.getNgWords(this) else PrefsManager.getNgSites(this)

    private fun saveItems(items: Set<String>) {
        if (type == TYPE_WORDS) PrefsManager.setNgWords(this, items)
        else PrefsManager.setNgSites(this, items)
    }

    private fun refreshList() {
        listContainer.removeAllViews()
        val items = getItems().sortedBy { it.lowercase() }
        if (items.isEmpty()) {
            val tv = TextView(this).apply {
                text = getString(R.string.ng_empty)
                textSize = 14f
                setPadding(0, 64, 0, 64)
                gravity = Gravity.CENTER
                setTextColor(getColor(R.color.text_secondary))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            listContainer.addView(tv)
            return
        }
        items.forEach { item ->
            val row = layoutInflater.inflate(R.layout.item_ng_filter, listContainer, false)
            row.findViewById<TextView>(R.id.tvItem).text = item
            row.findViewById<ImageButton>(R.id.btnDelete).setOnClickListener {
                AlertDialog.Builder(this)
                    .setMessage("「$item」を削除しますか？")
                    .setPositiveButton(getString(R.string.ok)) { _, _ ->
                        val updated = getItems().also { it.remove(item) }
                        saveItems(updated)
                        refreshList()
                    }
                    .setNegativeButton(getString(R.string.cancel), null)
                    .show()
            }
            listContainer.addView(row)

            // 区切り線
            val div = android.view.View(this).apply {
                setBackgroundColor(getColor(R.color.divider))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, 1
                ).also { it.marginStart = resources.getDimensionPixelSize(
                    androidx.appcompat.R.dimen.abc_action_bar_content_inset_material) }
            }
            listContainer.addView(div)
        }
    }

    private fun showAddDialog() {
        val et = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT
            hint = if (type == TYPE_WORDS) getString(R.string.ng_word_hint) else getString(R.string.ng_site_hint)
            setPadding(48, 32, 48, 32)
        }
        AlertDialog.Builder(this)
            .setTitle(if (type == TYPE_WORDS) getString(R.string.add_ng_word) else getString(R.string.add_ng_site))
            .setView(et)
            .setPositiveButton(getString(R.string.ok)) { _, _ ->
                val value = et.text.toString().trim()
                if (value.isNotEmpty()) {
                    val updated = getItems().also { it.add(value) }
                    saveItems(updated)
                    refreshList()
                }
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }
}
