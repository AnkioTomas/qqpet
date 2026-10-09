package net.ankio.qqpet

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.Icon
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.view.WindowManager.LayoutParams
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.FrameLayout
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.ceil
import kotlin.math.floor

/**
 * Hosts the pet page in an overlay window. The WebView keeps the screen's size
 * and is shifted inside a window cut down to the rectangle the page reports
 * (bridge.ts), so touches elsewhere reach the apps below.
 */
class PetService : Service() {
    companion object {
        /** The running service, for GameActivity to report play time. */
        var instance: PetService? = null
            private set

        private const val NOTIFICATION_ID = 1
        private const val TRAY_ICON_PX = 96
    }

    private lateinit var wm: WindowManager
    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private val net = Executors.newCachedThreadPool()
    private val prefs by lazy { getSharedPreferences("qqpet", MODE_PRIVATE) }

    private val params = LayoutParams(
        1, 1, LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_FOCUSABLE or LayoutParams.FLAG_NOT_TOUCH_MODAL or LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
            LayoutParams.FLAG_LAYOUT_IN_SCREEN or LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT,
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        layoutInDisplayCutoutMode = LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        fitInsetsTypes = 0
    }

    private lateinit var probe: View
    private val probeParams = LayoutParams(
        1, 1, LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_FOCUSABLE or LayoutParams.FLAG_NOT_TOUCHABLE or LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.TOP or Gravity.START }

    override fun onBind(intent: Intent?) = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate() {
        super.onCreate()
        instance = this
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("pet", "QQ宠物", NotificationManager.IMPORTANCE_LOW))
        startForeground(NOTIFICATION_ID, notification())
        wm = getSystemService(WindowManager::class.java)
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
        web = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = AssetClient(this@PetService) { hd() }
            addJavascriptInterface(Bridge(), "QQPetNative")
        }
        root = object : FrameLayout(this) {
            override fun dispatchTouchEvent(e: MotionEvent): Boolean {
                if (e.actionMasked != MotionEvent.ACTION_OUTSIDE) return super.dispatchTouchEvent(e)
                emit("outside", "undefined")
                return true
            }

            // A focusable overlay takes the back key from the app below; give it back.
            override fun dispatchKeyEvent(e: KeyEvent): Boolean {
                if (e.keyCode != KeyEvent.KEYCODE_BACK) return super.dispatchKeyEvent(e)
                setFocusable(false)
                return true
            }
        }
        root.addView(web, screenSize())
        // The system may place the window elsewhere than asked (e.g. clear of the status bar),
        // so the page is shifted by where the window really is, in the same frame it moved.
        val at = IntArray(2)
        root.viewTreeObserver.addOnPreDrawListener {
            root.getLocationOnScreen(at)
            if (web.translationX != -at[0].toFloat()) web.translationX = -at[0].toFloat()
            if (web.translationY != -at[1].toFloat()) web.translationY = -at[1].toFloat()
            true
        }
        wm.addView(root, params)
        // A hidden window gets no insets, so a separate always-shown pixel watches the status bar.
        probe = View(this)
        probe.setOnApplyWindowInsetsListener { _, insets ->
            fullscreen = !insets.isVisible(WindowInsets.Type.statusBars())
            applyShown()
            insets
        }
        wm.addView(probe, probeParams)
        web.loadUrl("$ORIGIN/index.html")
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(screen, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("UnspecifiedRegisterReceiverFlag") registerReceiver(screen, filter)
    }

    private var gone = false

    private fun presence(on: Boolean) {
        if (on == gone) return
        gone = on
        emit("presence", if (on) "true" else "false")
    }

    private val screen = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            when (i.action) {
                Intent.ACTION_SCREEN_OFF -> presence(true)
                Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> presence(false)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "state", "menu" -> emit("trayClick", JSONObject().put("kind", intent.action).toString())
            "quit" -> stopSelf()
        }
        return START_STICKY
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        web.layoutParams = screenSize()
    }

    override fun onDestroy() {
        instance = null
        unregisterReceiver(screen)
        wm.removeView(root)
        wm.removeView(probe)
        web.destroy()
        net.shutdownNow()
        super.onDestroy()
    }

    private fun screenSize(): FrameLayout.LayoutParams {
        val b = wm.maximumWindowMetrics.bounds
        return FrameLayout.LayoutParams(b.width(), b.height())
    }

    private fun hd(): Boolean = try {
        JSONObject(File(filesDir, "save.json").readText()).getJSONObject("settings").optBoolean("hd")
    } catch (_: Exception) {
        // No save yet, or a corrupt one the page is about to replace.
        false
    }

    /** The tray state the page last set: its icon, or the app's own until then, and its tooltip. */
    private var trayIcon: Icon? = null
    private var trayTip = "点按查看宠物状态"

    private fun setTray(icon: String, tip: String?) {
        val path = "pet/img_res/Tray/$icon"
        val bitmap = try {
            assets.open(path.replace(".png", "@2x.png"))
        } catch (_: FileNotFoundException) {
            assets.open(path)
        }.use { BitmapFactory.decodeStream(it) }
        // Pixel art: scale without smoothing. The status bar draws it as a silhouette, the shade in colour.
        trayIcon = Icon.createWithBitmap(Bitmap.createScaledBitmap(bitmap, TRAY_ICON_PX, TRAY_ICON_PX, false))
        if (tip != null) trayTip = tip
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification())
    }

    private fun notification(): Notification {
        fun action(name: String) = PendingIntent.getService(this, name.hashCode(), Intent(this, PetService::class.java).setAction(name), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, "pet")
            .setSmallIcon(trayIcon ?: Icon.createWithResource(this, R.drawable.ic_notification))
            .setLargeIcon(trayIcon)
            .setContentTitle("QQ宠物")
            .setContentText(trayTip)
            .setContentIntent(action("state"))
            .addAction(Notification.Action.Builder(null, "菜单", action("menu")).build())
            .addAction(Notification.Action.Builder(null, "退出", action("quit")).build())
            .setOngoing(true)
            .build()
    }

    /** Calls `__qqpet.emit(type, payload)`; [payload] is a JS expression. */
    fun emit(type: String, payload: String) = web.post { web.evaluateJavascript("__qqpet.emit('$type', $payload)", null) }

    private fun resolve(id: Int, value: String?, error: String? = null) = web.post {
        web.evaluateJavascript("__qqpet.resolve($id, ${quote(value)}, ${quote(error)})", null)
    }

    private fun quote(s: String?) = if (s == null) "null" else JSONObject.quote(s)

    private fun setFocusable(on: Boolean) {
        params.flags = if (on) params.flags and LayoutParams.FLAG_NOT_FOCUSABLE.inv() else params.flags or LayoutParams.FLAG_NOT_FOCUSABLE
        wm.updateViewLayout(root, params)
    }

    /** Moves the window onto CSS rectangle (x, y, w, h) of the page, keeping the page in place on screen. */
    private fun setBounds(x: Double, y: Double, w: Double, h: Double, viewport: Double) {
        val scale = web.layoutParams.width / viewport
        params.x = floor(x * scale).toInt()
        params.y = floor(y * scale).toInt()
        params.width = maxOf(ceil(w * scale).toInt(), 1)
        params.height = maxOf(ceil(h * scale).toInt(), 1)
        params.flags = if (w == 0.0 || h == 0.0) params.flags or LayoutParams.FLAG_NOT_TOUCHABLE else params.flags and LayoutParams.FLAG_NOT_TOUCHABLE.inv()
        wm.updateViewLayout(root, params)
    }

    private fun messageBox(id: Int, options: String) {
        val o = JSONObject(options)
        val buttons = o.getJSONArray("buttons")
        val last = buttons.length() - 1
        val dialog = AlertDialog.Builder(ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert))
            .setTitle(o.optString("title").ifEmpty { null })
            .setMessage(o.getString("message"))
            .setPositiveButton(buttons.getString(last)) { _, _ -> resolve(id, "$last") }
            .apply { if (last > 0) setNegativeButton(buttons.getString(0)) { _, _ -> resolve(id, "0") } }
            .setOnCancelListener { resolve(id, "0") }
            .create()
        dialog.window!!.setType(LayoutParams.TYPE_APPLICATION_OVERLAY)
        dialog.show()
    }

    private fun http(id: Int, method: String, url: String, headers: String, body: String?) = net.execute {
        try {
            val c = URL(url).openConnection() as HttpURLConnection
            c.requestMethod = method
            c.connectTimeout = 60_000
            c.readTimeout = 60_000
            val h = JSONObject(headers)
            for (k in h.keys()) c.setRequestProperty(k, h.getString(k))
            if (body != null) {
                c.doOutput = true
                c.outputStream.use { it.write(body.toByteArray()) }
            }
            val text = (if (c.responseCode < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
            resolve(id, JSONObject().put("status", c.responseCode).put("body", text).toString())
        } catch (e: IOException) {
            resolve(id, null, e.toString())
        }
    }

    /** One of ours (a file picker, a game) is in front. */
    private var away = false

    /** The app in front hides the status bar. */
    private var fullscreen = false

    /** The overlay stays above every app; it steps aside while [away] or [fullscreen]. */
    private fun applyShown() {
        root.visibility = if (away || fullscreen) View.GONE else View.VISIBLE
    }

    fun setShown(on: Boolean) = web.post {
        away = !on
        applyShown()
    }

    private fun pickFile(intent: Intent, done: (Uri?) -> Unit) {
        setShown(false)
        FileActivity.done = { uri ->
            setShown(true)
            done(uri)
        }
        startActivity(Intent(this, FileActivity::class.java).putExtra(Intent.EXTRA_INTENT, intent).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** window.QQPetNative; see the Native interface in src/android/bridge.ts. Called on a WebView thread. */
    private inner class Bridge {
        @JavascriptInterface
        fun read(name: String): String? = File(filesDir, name).takeIf { it.exists() }?.readText()

        @JavascriptInterface
        fun write(name: String, text: String) {
            val tmp = File(filesDir, "$name.tmp")
            tmp.writeText(text)
            tmp.renameTo(File(filesDir, name))
        }

        @JavascriptInterface
        fun http(id: Int, method: String, url: String, headers: String, body: String?) = this@PetService.http(id, method, url, headers, body)

        @JavascriptInterface
        fun messageBox(id: Int, options: String) = web.post { this@PetService.messageBox(id, options) }

        @JavascriptInterface
        fun exportSave(id: Int, name: String, text: String) {
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, name)
            pickFile(intent) { uri ->
                if (uri != null) contentResolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray()) }
                resolve(id, uri?.let { "true" })
            }
        }

        @JavascriptInterface
        fun importSave(id: Int) {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
            pickFile(intent) { uri -> resolve(id, uri?.let { u -> contentResolver.openInputStream(u)!!.bufferedReader().use { it.readText() } }) }
        }

        @JavascriptInterface
        fun openGame(swf: String) = startActivity(Intent(this@PetService, GameActivity::class.java).putExtra("swf", swf).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

        @JavascriptInterface
        fun quit() = stopSelf()

        @JavascriptInterface
        fun copyText(text: String) = getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("QQ宠物", text))

        @JavascriptInterface
        fun openUrl(url: String) = startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))

        @JavascriptInterface
        fun setFocusable(on: Boolean) = web.post { this@PetService.setFocusable(on) }

        @JavascriptInterface
        fun setAutoStart(on: Boolean) = prefs.edit().putBoolean("autoStart", on).apply()

        @JavascriptInterface
        fun setTray(icon: String, tip: String?) = web.post { this@PetService.setTray(icon, tip) }

        @JavascriptInterface
        fun setBounds(x: Double, y: Double, w: Double, h: Double, viewport: Double) = web.post { this@PetService.setBounds(x, y, w, h, viewport) }

        /** "left,top,right,bottom" of the system bars and cutout, in CSS pixels of a page [viewport] pixels wide. Hidden bars count: a swipe brings them back. */
        @JavascriptInterface
        fun safeArea(viewport: Double): String {
            val m = wm.maximumWindowMetrics
            val i = m.windowInsets.getInsetsIgnoringVisibility(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            val scale = m.bounds.width() / viewport
            return listOf(i.left, i.top, i.right, i.bottom).joinToString(",") { "${it / scale}" }
        }
    }
}
