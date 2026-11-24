#!/bin/sh
# Build the Play Store AAB (API 36). Does not create or commit a keystore.
# The upload key must be created by the owner. See docs/play-store.md.
set -eu
cd "$(dirname "$0")/.."

if ! command -v java >/dev/null 2>&1; then
  echo "Java is required (JDK 17 or newer). Install a JDK, then run this again." >&2
  exit 1
fi

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -f android-twa/local.properties ]; then
  SDK=$(sed -n 's/^sdk.dir=//p' android-twa/local.properties | head -1)
fi
if [ -z "$SDK" ] || [ ! -d "$SDK" ]; then
  echo "Android SDK not found. Install Android Studio, then either:" >&2
  echo "  export ANDROID_HOME=\"\$HOME/Library/Android/sdk\"   # Mac" >&2
  echo "  export ANDROID_HOME=\"\$HOME/Android/Sdk\"            # Linux" >&2
  echo "  set ANDROID_HOME=%LOCALAPPDATA%\\Android\\Sdk         # Windows" >&2
  exit 1
fi

if [ ! -f android-twa/local.properties ]; then
  printf 'sdk.dir=%s\n' "$SDK" > android-twa/local.properties
fi

npm run twa:sync
cd android-twa
if [ -f keystore.properties ]; then
  echo "Signing with android-twa/keystore.properties (not committed)."
  ./gradlew bundleRelease
else
  echo "No android-twa/keystore.properties."
  echo "Create the upload keystore yourself with keytool (docs/play-store.md). Do not commit the .jks or the passwords."
  echo "Building an UNSIGNED release AAB so the project can be checked. Play Console will reject it."
  ./gradlew bundleRelease -PffAllowUnsigned=true
fi

echo "AAB: android-twa/app/build/outputs/bundle/release/app-release.aab"
