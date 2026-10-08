package net.ankio.qqpet

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import org.json.JSONObject

/**
 * Stands in for the desktop's clipboard watch, which Android forbids in the background:
 * text chosen with "QQ宠物" in another app's selection menu or share sheet goes to the pet.
 */
class TextActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT) ?: intent.getCharSequenceExtra(Intent.EXTRA_TEXT)
        if (text != null) PetService.instance?.emit("clipboard", JSONObject.quote(text.toString()))
        finish()
    }
}
