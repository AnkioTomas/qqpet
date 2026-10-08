import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val pkg = JsonSlurper().parse(rootDir.resolve("../package.json")) as Map<*, *>

android {
    namespace = "net.ankio.qqpet"
    compileSdk = 35

    defaultConfig {
        applicationId = "net.ankio.qqpet"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = pkg["version"] as String
    }

    // The web build (npm run build:android-web) and the pet art are served from assets.
    sourceSets["main"].assets.srcDirs(rootDir.resolve("../out/android"), rootDir.resolve("../resources"))

    androidResources {
        // Already-compressed media; wasm is compiled straight from the stream.
        noCompress += listOf("swf", "png", "gif", "jpg", "mp3", "wasm")
    }

    buildTypes {
        release {
            // Unsigned like the desktop builds; sign with your own key to install.
            isMinifyEnabled = false
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
