package net.ankio.qqpet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings

/** 开机自启: the setting is mirrored into preferences by bridge.ts' setAutoStart. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!context.getSharedPreferences("qqpet", Context.MODE_PRIVATE).getBoolean("autoStart", false) || !Settings.canDrawOverlays(context)) return
        context.startForegroundService(Intent(context, PetService::class.java))
    }
}
