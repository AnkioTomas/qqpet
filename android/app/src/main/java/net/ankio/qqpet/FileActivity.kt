package net.ankio.qqpet

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/** Runs one file picker for PetService, which has no activity to start it from, and hands [done] the chosen file. */
class FileActivity : Activity() {
    companion object {
        var done: ((Uri?) -> Unit)? = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION")
        if (savedInstanceState == null) startActivityForResult(intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT), 0)
    }

    @Deprecated("Activity result API needs androidx")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        done?.invoke(if (resultCode == RESULT_OK) data?.data else null)
        done = null
        finish()
    }
}
