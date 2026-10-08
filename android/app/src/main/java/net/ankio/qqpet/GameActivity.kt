package net.ankio.qqpet

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.os.SystemClock
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebView

/** Plays pet/game/<swf> full screen, like the desktop's game window; reports the minutes played when closed. */
class GameActivity : Activity() {
    private lateinit var web: WebView
    private val start = SystemClock.elapsedRealtime()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = AssetClient(this@GameActivity)
        }
        setContentView(web)
        window.insetsController!!.apply {
            hide(WindowInsets.Type.systemBars())
            systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        web.loadUrl("$ORIGIN/game.html?swf=${android.net.Uri.encode(intent.getStringExtra("swf"))}")
    }

    override fun onDestroy() {
        web.destroy()
        if (isFinishing) PetService.instance?.emit("gamePlayed", "${(SystemClock.elapsedRealtime() - start) / 60000.0}")
        super.onDestroy()
    }
}
