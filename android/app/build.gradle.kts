import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val pkg = JsonSlurper().parse(rootDir.resolve("../package.json")) as Map<*, *>
val version = pkg["version"] as String
val keystore: String? = System.getenv("ANDROID_KEYSTORE")

android {
    namespace = "net.ankio.qqpet"
    compileSdk = 35

    defaultConfig {
        applicationId = "net.ankio.qqpet"
        minSdk = 30
        targetSdk = 35
        // 1.2.3 -> 10203: installs only upgrade to a larger code.
        versionCode = version.substringBefore('-').split('.').fold(0) { code, part -> code * 100 + part.toInt() }
        versionName = version
    }

    // The web build (npm run build:android-web) and the pet art are served from assets.
    sourceSets["main"].assets.srcDirs(rootDir.resolve("../out/android"), rootDir.resolve("../resources"))

    androidResources {
        // Already-compressed media; wasm is compiled straight from the stream.
        noCompress += listOf("swf", "png", "gif", "jpg", "mp3", "wasm")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Without ANDROID_KEYSTORE the APK is unsigned and will not install.
            if (keystore != null) signingConfig = signingConfigs.create("release") {
                storeFile = file(keystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}
