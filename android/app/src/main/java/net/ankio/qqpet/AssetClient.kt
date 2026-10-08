package net.ankio.qqpet

import android.content.Context
import android.util.Base64
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException
import java.nio.ByteBuffer

/** Pages load from here: Ruffle fetches SWFs, configs and wasm, which file:// does not allow. */
const val ORIGIN = "https://appassets.androidplatform.net"

/** CSS pixels across the screen's short side; wider panels (the shop is 800) scale down to fit (box.ts). */
private const val VIEWPORT = 480

private val TYPES = mapOf(
    "html" to "text/html", "js" to "text/javascript", "css" to "text/css", "json" to "application/json",
    "xml" to "text/xml", "txt" to "text/plain", "wasm" to "application/wasm", "swf" to "application/x-shockwave-flash",
    "png" to "image/png", "gif" to "image/gif", "jpg" to "image/jpeg", "bmp" to "image/bmp", "svg" to "image/svg+xml",
    "mp3" to "audio/mpeg",
)

/**
 * Serves the web build and resources/ from the APK's assets at [ORIGIN].
 * [hd] tells whether images with an `@2x.png` twin are served as SVGs embedding it,
 * like src/main/hidpi.ts; it is read when a page starts loading.
 */
open class AssetClient(private val context: Context, private val hd: () -> Boolean = { false }) : WebViewClient() {
    private var hdOn = false

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        val url = request.url
        if ("${url.scheme}://${url.host}" != ORIGIN) return null
        // SWF configs write paths with backslashes (pet\\fishing\\…), which URLs turn into empty segments; assets.open wants none.
        val path = url.path!!.split('/').filter { it.isNotEmpty() }.joinToString("/")
        if (path == "index.html") return indexHtml()
        if (hdOn && path.startsWith("pet/") && request.requestHeaders["Accept"]?.contains("image/svg+xml") == true) hidpiSvg(path)?.let { return it }
        return try {
            response(path.substringAfterLast('.').lowercase(), context.assets.open(path))
        } catch (_: FileNotFoundException) {
            WebResourceResponse(null, null, 404, "Not Found", null, null)
        }
    }

    /** The pet page, scaled so the screen's short side is [VIEWPORT] CSS pixels. */
    private fun indexHtml(): WebResourceResponse {
        hdOn = hd()
        val m = context.resources.displayMetrics
        val scale = minOf(m.widthPixels, m.heightPixels) / m.density / VIEWPORT
        val meta = """<meta name="viewport" content="width=device-width, initial-scale=$scale, minimum-scale=$scale, maximum-scale=$scale, user-scalable=no">"""
        val html = context.assets.open("index.html").bufferedReader().readText().replaceFirst("<head>", "<head>$meta")
        return response("html", ByteArrayInputStream(html.toByteArray()))
    }

    private fun hidpiSvg(path: String): WebResourceResponse? {
        val hi = path.replace(Regex("\\.(png|gif|bmp|jpg)$", RegexOption.IGNORE_CASE), "@2x.png")
        if (hi == path) return null
        val png = try {
            context.assets.open(hi).readBytes()
        } catch (_: FileNotFoundException) {
            return null
        }
        val w = ByteBuffer.wrap(png, 16, 4).int / 2
        val h = ByteBuffer.wrap(png, 20, 4).int / 2
        val svg = """<svg xmlns="http://www.w3.org/2000/svg" width="$w" height="$h" viewBox="0 0 $w $h" preserveAspectRatio="none">""" +
            """<image href="data:image/png;base64,${Base64.encodeToString(png, Base64.NO_WRAP)}" width="$w" height="$h" preserveAspectRatio="none"/></svg>"""
        return response("svg", ByteArrayInputStream(svg.toByteArray()))
    }

    private fun response(ext: String, data: java.io.InputStream): WebResourceResponse {
        val type = TYPES[ext] ?: "application/octet-stream"
        val text = type.startsWith("text/") || type == "application/json" || type == "image/svg+xml"
        return WebResourceResponse(type, if (text) "utf-8" else null, data)
    }
}
