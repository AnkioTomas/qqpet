package net.ankio.qqpet

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast

/** The launcher icon: asks for the overlay (and notification) permission, starts PetService and goes away. */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Before Android 13 the request is answered at once, as denied; the service runs either way.
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (Settings.canDrawOverlays(this)) return start()
        Toast.makeText(this, "请允许QQ宠物显示在其他应用的上层", Toast.LENGTH_LONG).show()
        startActivityForResult(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")), 0)
    }

    @Deprecated("Activity result API needs androidx")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (Settings.canDrawOverlays(this)) return start()
        Toast.makeText(this, "没有悬浮窗权限，宠物无法显示", Toast.LENGTH_LONG).show()
        finish()
    }

    private fun start() {
        startForegroundService(Intent(this, PetService::class.java))
        finish()
    }
}
