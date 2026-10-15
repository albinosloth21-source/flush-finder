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

## Capacitor / native release gaps
- **Server URL**: the native apps load the live site. Run `CAPACITOR_SERVER_URL=https://<live-domain> npx cap sync` before every store build, or the app shows the placeholder page in `native/www`.
- **Android signing**: `android/app/build.gradle` has no release `signingConfig`. Create an upload keystore (keep it out of git; `*.jks`/`*.keystore` are ignored) and use Play App Signing. Build an **AAB** (`./gradlew bundleRelease`).
- **Android versions**: `versionCode 1` / `versionName "1.0"` — bump `versionCode` on every upload. targetSdk 36, minSdk 24: OK for Play.
- **Android**: `minifyEnabled false` (fine), cleartext off, backups off, location permissions declared.
- **iOS**: no `DEVELOPMENT_TEAM` set — choose your team in Xcode. Add capabilities: Sign in with Apple. `MARKETING_VERSION 1.0`, build `1` — bump the build for each TestFlight upload. Deployment target iOS 15. Location usage strings and `PrivacyInfo.xcprivacy` present.
- **iOS review risk (guideline 4.2)**: an app that only wraps a website can be rejected for minimum functionality. Native location, offline-friendly behavior and a polished app shell help; be ready to explain native value.
- **Account deletion**: present in Account (required by both stores).
- **Store forms**: App Privacy labels (Apple) and Data safety (Google) must match the policy: location (not stored as history), email, user content, and the sale/ads switch (off by default).
