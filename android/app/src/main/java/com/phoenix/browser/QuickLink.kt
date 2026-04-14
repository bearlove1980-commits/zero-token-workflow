package com.phoenix.browser

data class QuickLink(
    val title: String,
    val url: String,
    val initial: String,          // 1-2文字のイニシャル表示
    val bgColorRes: Int = 0       // 0 = デフォルト色
)

object QuickLinks {
    val defaults = listOf(
        QuickLink("Yahoo! JAPAN", "https://yahoo.co.jp",      "Y!"),
        QuickLink("Google",       "https://google.co.jp",     "G"),
        QuickLink("YouTube",      "https://youtube.com",      "YT"),
        QuickLink("Amazon",       "https://amazon.co.jp",     "Am"),
        QuickLink("X (Twitter)",  "https://x.com",            "X"),
        QuickLink("LINE NEWS",    "https://news.line.me",     "LN"),
        QuickLink("ニコニコ",     "https://nicovideo.jp",     "ニ"),
        QuickLink("楽天市場",     "https://rakuten.co.jp",    "楽"),
        QuickLink("価格.com",     "https://kakaku.com",       "価"),
        QuickLink("More",         "",                          "…")
    )
}
