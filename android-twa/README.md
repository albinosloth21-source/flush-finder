# Flush Finder Android (Play)

This folder is the Play Store app: a Trusted Web Activity. Build steps, the upload keystore, and Digital Asset Links are in [docs/play-store.md](../docs/play-store.md).

The live site is **only** `native/production-url.json`, currently `https://flush-finder-hhbb.onrender.com`. A release build refuses to run if that host is changed back to a placeholder such as `REPLACE_ME.example`, and it refuses to sign without `keystore.properties` (see `keystore.properties.example`). Do not commit the keystore or that properties file.

```bash
node scripts/sync-twa-config.mjs
cd android-twa
./gradlew bundleRelease
```

The file to upload is `app/build/outputs/bundle/release/app-release.aab`.
