package com.phoenix.browser

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.bottomsheet.BottomSheetDialog

class BrowserActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var urlBar: EditText
    private lateinit var progressBar: ProgressBar
    private lateinit var tvSiteTitle: TextView
    private lateinit var btnBack: ImageButton
    private lateinit var btnForward: ImageButton
    private lateinit var btnMenu: ImageButton
    private lateinit var btnTabs: TextView
    private lateinit var btnHome: ImageButton
    private lateinit var btnCommentRefresh: Button

    private var imagesEnabled = true

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_browser)

        webView            = findViewById(R.id.webView)
        urlBar             = findViewById(R.id.urlBar)
        progressBar        = findViewById(R.id.progressBar)
        tvSiteTitle        = findViewById(R.id.tvSiteTitle)
        btnBack            = findViewById(R.id.btnBack)
        btnForward         = findViewById(R.id.btnForward)
        btnMenu            = findViewById(R.id.btnMenu)
        btnTabs            = findViewById(R.id.btnTabs)
        btnHome            = findViewById(R.id.btnHome)
        btnCommentRefresh  = findViewById(R.id.btnCommentRefresh)

        imagesEnabled = PrefsManager.isImagesEnabled(this)

        setupWebView()
        setupUrlBar()
        setupBottomBar()

        btnCommentRefresh.setOnClickListener { refreshYahooComments() }

        val url = intent.getStringExtra("url") ?: "https://www.google.co.jp"
        webView.loadUrl(url)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled         = PrefsManager.isJsEnabled(this@BrowserActivity)
            domStorageEnabled         = true
            loadsImagesAutomatically  = imagesEnabled
            blockNetworkImage         = !imagesEnabled
            setSupportZoom(true)
            builtInZoomControls       = true
            displayZoomControls       = false
            useWideViewPort           = true
            loadWithOverviewMode      = true
            mixedContentMode          = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/120.0.0.0 Mobile Safari/537.36"
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress  = newProgress
                progressBar.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
            }
            override fun onReceivedTitle(view: WebView?, title: String?) {
                tvSiteTitle.text = title ?: view?.url ?: ""
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (!imagesEnabled) {
                    val url = request?.url?.toString() ?: ""
                    if (isImageRequest(url)) {
                        return WebResourceResponse("image/png", "utf-8",
                            java.io.ByteArrayInputStream(ByteArray(0)))
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                urlBar.setText(url)
                urlBar.setSelection(0)
                btnBack.isEnabled    = webView.canGoBack()
                btnForward.isEnabled = webView.canGoForward()
                updateNavButtons()

                // Yahooニュース記事ページならコメント全展開＋ボタン表示
                if (isYahooNewsUrl(url)) {
                    btnCommentRefresh.visibility = View.VISIBLE
                    expandYahooComments()
                } else {
                    btnCommentRefresh.visibility = View.GONE
                }
            }
        }

        // ダウンロードリスナー
        webView.setDownloadListener { url, _, contentDisposition, mimetype, _ ->
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimetype)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    URLUtil.guessFileName(url, contentDisposition, mimetype)
                )
            }
            val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(this, getString(R.string.downloading), Toast.LENGTH_SHORT).show()
        }
    }

    private fun isYahooNewsUrl(url: String?): Boolean {
        val u = url ?: return false
        return u.contains("news.yahoo.co.jp/articles") ||
               u.contains("news.yahoo.co.jp/pickup")
    }

    /** コメントの「もっと見る」ボタンを自動クリックし続けてワンスクロール化 */
    @SuppressLint("SetJavaScriptEnabled")
    private fun expandYahooComments() {
        val js = """
            (function() {
                var clicked = 0;
                var maxClicks = 30;
                var keywords = ['もっと見る','さらに表示','コメントをもっと','すべて表示','コメントを見る','続きを読む'];
                function clickMore() {
                    if (clicked >= maxClicks) return;
                    var els = document.querySelectorAll('button, [role="button"], a, span');
                    els.forEach(function(el) {
                        var txt = el.innerText || el.textContent || '';
                        if (keywords.some(function(k){ return txt.trim().includes(k); })) {
                            el.click();
                            clicked++;
                        }
                    });
                }
                clickMore();
                var t = setInterval(function() {
                    clickMore();
                    if (clicked >= maxClicks) clearInterval(t);
                }, 800);
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    /** コメント更新ボタン押下：最新コメントを取得して再展開 */
    @SuppressLint("SetJavaScriptEnabled")
    private fun refreshYahooComments() {
        Toast.makeText(this, getString(R.string.comment_refreshing), Toast.LENGTH_SHORT).show()
        val js = """
            (function() {
                // 更新・再読み込みボタンを探してクリック
                var keywords = ['更新','再読み込み','リロード','最新'];
                var refreshed = false;
                document.querySelectorAll('button, [role="button"]').forEach(function(btn) {
                    var txt = btn.innerText || btn.textContent || '';
                    if (!refreshed && keywords.some(function(k){ return txt.trim().includes(k); })) {
                        btn.click();
                        refreshed = true;
                    }
                });
                // コメントエリアまでスクロール
                var commentArea = document.querySelector('[class*="comment"],[id*="comment"],[class*="Comment"],[id*="Comment"]');
                if (commentArea) commentArea.scrollIntoView({behavior:'smooth'});
                // 「もっと見る」を再展開
                var keywords2 = ['もっと見る','さらに表示','コメントをもっと','すべて表示'];
                var count = 0;
                var t = setInterval(function() {
                    document.querySelectorAll('button, [role="button"], a, span').forEach(function(el) {
                        var txt = el.innerText || el.textContent || '';
                        if (keywords2.some(function(k){ return txt.trim().includes(k); })) {
                            el.click();
                        }
                    });
                    count++;
                    if (count >= 8) clearInterval(t);
                }, 700);
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    private fun isImageRequest(url: String): Boolean {
        val lower = url.lowercase().substringBefore("?")
        return lower.endsWith(".jpg")  || lower.endsWith(".jpeg") ||
               lower.endsWith(".png")  || lower.endsWith(".gif")  ||
               lower.endsWith(".webp") || lower.endsWith(".svg")  ||
               lower.endsWith(".bmp")  || lower.endsWith(".ico")
    }

    private fun setupUrlBar() {
        urlBar.setOnEditorActionListener { _, actionId, event ->
            val go = actionId == EditorInfo.IME_ACTION_GO ||
                    (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            if (go) {
                val input = urlBar.text.toString().trim()
                if (input.isNotEmpty()) {
                    webView.loadUrl(resolveUrl(input))
                    hideKeyboard()
                }
                true
            } else false
        }
    }

    private fun resolveUrl(input: String): String {
        if (input.startsWith("http://") || input.startsWith("https://")) return input
        if (input.contains(".") && !input.contains(" ")) return "https://$input"
        return PrefsManager.buildSearchUrl(this, input)
    }

    private fun setupBottomBar() {
        btnBack.setOnClickListener    { if (webView.canGoBack()) webView.goBack() }
        btnForward.setOnClickListener { if (webView.canGoForward()) webView.goForward() }
        btnHome.setOnClickListener    {
            startActivity(Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
            finish()
        }
        btnMenu.setOnClickListener { showMenuSheet() }
        btnTabs.setOnClickListener { /* タブ管理（今後実装） */ }
    }

    private fun updateNavButtons() {
        btnBack.alpha    = if (webView.canGoBack()) 1f else 0.35f
        btnForward.alpha = if (webView.canGoForward()) 1f else 0.35f
    }

    // ---- ボトムシートメニュー ----
    private fun showMenuSheet() {
        val sheet = BottomSheetDialog(this)
        val view  = layoutInflater.inflate(R.layout.fragment_browser_menu, null)
        sheet.setContentView(view)

        // 画像切り替えトグル
        val switchImages = view.findViewById<Switch>(R.id.switchImages)
        switchImages.isChecked = imagesEnabled
        switchImages.text = if (imagesEnabled) getString(R.string.images_on) else getString(R.string.images_off)
        switchImages.setOnCheckedChangeListener { _, checked ->
            imagesEnabled = checked
            switchImages.text = if (checked) getString(R.string.images_on) else getString(R.string.images_off)
            PrefsManager.setImagesEnabled(this, checked)
            applyImageSettings()
            Toast.makeText(this,
                if (checked) getString(R.string.images_on) else getString(R.string.images_off),
                Toast.LENGTH_SHORT).show()
            webView.reload()
            sheet.dismiss()
        }

        view.findViewById<LinearLayout>(R.id.menuBookmarks).setOnClickListener {
            Toast.makeText(this, getString(R.string.bookmarks), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuHistory).setOnClickListener {
            Toast.makeText(this, getString(R.string.history), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuDownloads).setOnClickListener {
            Toast.makeText(this, getString(R.string.downloads), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuAddHome).setOnClickListener {
            Toast.makeText(this, getString(R.string.add_to_home), Toast.LENGTH_SHORT).show()
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuShare).setOnClickListener {
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                putExtra(Intent.EXTRA_TEXT, webView.url)
                type = "text/plain"
            }
            startActivity(Intent.createChooser(sendIntent, getString(R.string.share)))
            sheet.dismiss()
        }
        view.findViewById<LinearLayout>(R.id.menuSettings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
            sheet.dismiss()
        }

        sheet.show()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun applyImageSettings() {
        webView.settings.loadsImagesAutomatically = imagesEnabled
        webView.settings.blockNetworkImage        = !imagesEnabled
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    private fun hideKeyboard() {
        val imm = getSystemService(InputMethodManager::class.java)
        imm?.hideSoftInputFromWindow(urlBar.windowToken, 0)
    }
}
