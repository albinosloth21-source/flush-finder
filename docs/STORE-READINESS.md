# Store readiness notes (branch grok-build-latest)

## Minimum age: 16+
Single source: `MIN_AGE` in `src/lib/constants.ts` (used by the in-app privacy policy and the sign-up "I am 16 or older" checkbox). Static copies to keep in sync by hand:
- `docs/index.html` (public privacy page, section 1)
- `native/store/listing.txt` (Play listing: "Age: 16+", "not directed at children under 16")
- `native/store/appstore/listing.txt` ("Age rating: 16+")
- Store questionnaires: Play Content rating + Target audience (choose 16–17 and 18+ only); App Store age rating questionnaire.

The age checkbox is a self-declaration stored on the device; it is not verification.

## "Made with Grok" pill
`npm run build:store` sets `FF_STORE_BUILD=1` and `VITE_GROK_EXTENSIONS=0`. The pill is injected by the server at request time, so the deployed server behind the store apps must also run with `FF_STORE_BUILD=1`. The Grok Build preview is unchanged.

## Play Store Android app
Google Play uses the Trusted Web Activity in `android-twa/` (see `docs/play-store.md`). The production URL is the single file `native/production-url.json`. The Capacitor project under `android/` remains the iOS shell; its WebView is the wrong Play artifact because Google sign-in rejects embedded WebViews.

- **Android signing**: create an upload keystore outside the repo. `android-twa/keystore.properties` is gitignored. Play App Signing holds the app signing key. Build an **AAB** with `./gradlew bundleRelease`.
- **Android versions**: `versionCode` / `versionName` are in `native/production-url.json`. Bump `versionCode` on every upload. targetSdk 36, minSdk 24.
- **Android**: `minifyEnabled false` (fine), cleartext off, backups off, location permissions declared.
- **iOS**: no `DEVELOPMENT_TEAM` set — choose your team in Xcode. Add capabilities: Sign in with Apple. `MARKETING_VERSION 1.0`, build `1` — bump the build for each TestFlight upload. Deployment target iOS 15. Location usage strings and `PrivacyInfo.xcprivacy` present.
- **iOS review risk (guideline 4.2)**: an app that only wraps a website can be rejected for minimum functionality. Native location, offline-friendly behavior and a polished app shell help; be ready to explain native value.
- **Account deletion**: present in Account (required by both stores).
- **Store forms**: App Privacy labels (Apple) and Data safety (Google) must match the policy: location (not stored as history), email, user content, and the sale/ads switch (off by default).
