# Release builds do not minify. Kept so a later shrink pass can keep the TWA service.
-keep class com.flushfinder.app.DelegationService { *; }
-keep class com.google.androidbrowserhelper.** { *; }
