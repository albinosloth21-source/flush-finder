# Flush Finder on Google Play

Publisher: personal Play Console account **MisfitSoftware**.
Android package: `com.flushfinder.app`.
The phone app is a Trusted Web Activity. It opens one website. That website is the only production URL, in [`native/production-url.json`](../native/production-url.json): `https://flush-finder-hhbb.onrender.com`. A release build still refuses to sign if that host is changed back to a placeholder, or if `keystore.properties` is missing.

## Why a Trusted Web Activity, not the Capacitor shell

Sign-in is Google, X, Apple, and email codes. Google rejects OAuth inside an embedded WebView (`disallowed_useragent`). The Capacitor project under `android/` loads the site in a WebView, so those sign-ins fail there. A Trusted Web Activity runs the site in Chrome, where the same redirects work, and Digital Asset Links prove MisfitSoftware owns the origin. Location stays optional: the manifest declares it, and Chrome can delegate it to the app. The Capacitor project stays for the iOS shell already in the repo. Do not upload that WebView build to Play.

The project in `android-twa/` uses Google's `android-browser-helper` (the library Bubblewrap generates). Bubblewrap itself is not required. Target API is **36** (Android 16), which Play requires for new apps and updates as of August 31, 2026. The November 1, 2026 extension has passed. `minSdk` is 24.

## What you still do by hand

1. The site is live at `https://flush-finder-hhbb.onrender.com`. `productionUrl` and `host` in `native/production-url.json` already point there. Run `npm run twa:sync` again only if the host changes.
2. Create the upload keystore (below). Keep it outside the repo.
3. Build the signed AAB and upload it to Play Console.
4. Copy the **Play App Signing** SHA-256 into `sha256CertFingerprints`, run `npm run twa:sync` again, and redeploy so `https://flush-finder-hhbb.onrender.com/.well-known/assetlinks.json` matches. Until that file is live, the app still opens but Chrome shows the address bar.
5. Replace `PRIVACY_CONTACT_EMAIL` in `src/lib/constants.ts` (marked TODO) and redeploy. Put the live `/privacy` and `/delete-account` URLs in Play Console.
6. Finish the store listing, Data safety, content rating, and a closed test with 12 testers for 14 days.
7. Confirm OAuth redirect URLs for the Render origin (see `docs/SIGN-IN-SETUP.md` and `docs/APPLE-SIGN-IN.md`). Do not copy `GROK_AUTH_*` secrets to Render.

No keystore, password, or API secret belongs in git. `*.jks`, `*.keystore`, and `android-twa/keystore.properties` are ignored.

## Hosting (Render + Neon)

`npm run build` targets Vercel, which is what the current grok.me deploy uses. Render needs a Node server:

```bash
NITRO_PRESET=node-server FF_STORE_BUILD=1 npm run build:store
```

Start command to try: `node .output/server/index.mjs`. If the first build prints a different entry file, use that.

Set these on the Render service (values only in the dashboard, never in git):

| Name | Why |
| --- | --- |
| `FF_STORE_BUILD` | `1`. Hides the Created-with-Grok pill even on a host that would otherwise show it. |
| `DATABASE_URL` | Neon connection string. The build runs migrations. |
| `BETTER_AUTH_SECRET` | Long random string. |
| `BETTER_AUTH_URL` | The public https origin, same as `productionUrl`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Direct Google sign-in. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Direct X sign-in. |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple, if you offer it. Also set `VITE_APPLE_SIGN_IN=1` at build time. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email one-time codes. Also `VITE_EMAIL_CODE_SIGN_IN=1` at build time. |

[`render.yaml`](../render.yaml) is a starting blueprint for the same settings. Confirm the start command after the first build.

## Upload keystore

Create it once, on your computer, outside this repository:

```bash
keytool -genkeypair -v \
  -keystore "$HOME/flush-finder-keys/flush-finder-upload.jks" \
  -alias flushfinder \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` ships with a JDK. Use a long password you can recover. Store the `.jks` and both passwords in a password manager and an offline backup. If you lose the upload key, Play App Signing can reset it, but only if you enrolled in Play App Signing (do that; it is the default for new apps). The app signing key then lives with Google. You still need the upload key for every future AAB.

Fingerprint of the upload key (for local testing of asset links, before Play shows the app signing certificate):

```bash
keytool -list -v -keystore "$HOME/flush-finder-keys/flush-finder-upload.jks" -alias flushfinder
```

Copy the SHA-256 line. In Play Console, after the first upload: App integrity → App signing → App signing key certificate → SHA-256. Put **that** fingerprint in `native/production-url.json` (you can list the upload key as a second entry). Then `npm run twa:sync` and redeploy.

Copy `android-twa/keystore.properties.example` to `android-twa/keystore.properties` and point `storeFile` at the `.jks`. That file is gitignored.

## Build the signed AAB

On a machine with Android SDK 36 (Android Studio current release is enough):

```bash
# edit native/production-url.json first
npm run twa:sync
cd android-twa
./gradlew bundleRelease
```

Upload `android-twa/app/build/outputs/bundle/release/app-release.aab`.

Bump `versionCode` in `native/production-url.json` on every upload. Play rejects a repeated code. `versionName` is the human version (`1.0.0`).

`bundleRelease` fails if the host is put back to a placeholder such as `REPLACE_ME.example`, and it fails without `keystore.properties`. The current host is `flush-finder-hhbb.onrender.com`.

16 KB memory pages: this project has no native `.so` of its own. Play's 16 KB requirement for updates is currently February 1, 2027. If Console warns, update Android Gradle Plugin and the browser-helper dependencies and rebuild.

## Digital Asset Links

`npm run twa:sync` writes `public/.well-known/assetlinks.json` from the production URL file. The live site must return that file at:

`https://flush-finder-hhbb.onrender.com/.well-known/assetlinks.json`

Requirements: HTTP 200, `Content-Type: application/json`, no redirect to a login page. Check with:

```bash
curl -sI "https://flush-finder-hhbb.onrender.com/.well-known/assetlinks.json"
```

The statement uses relation `delegate_permission/common.handle_all_urls` and package `com.flushfinder.app`. The fingerprint placeholder starts with `TODO`. Replace it before you expect the URL bar to disappear. Confirm with Google's [asset links tester](https://developers.google.com/digital-asset-links/tools/generator).

## "Made with Grok" pill

Flush Finder's own screens do not draw a Grok badge, footer, or watermark. The "Created with Grok" pill is not a separate grok.me edge injection. This repo's server middleware (`server/middleware/grok-pwa.ts`) inserts `https://grok.com/grok-app-builder/extensions.js` while the request host is localhost or `*.grok.me`, which is why [https://flush-finder.grok.me](https://flush-finder.grok.me) still shows it. A Render host (or any host that is not grok.me) does not get the script. `FF_STORE_BUILD=1` also forces it off, including on grok.me. The injector stays so the Grok preview keeps working. Do not delete `grokPwaPlugin()`.

## Listing copy

### Short description (80 characters max)

`Snoop to Poop. Nearby thrones, rated in toilets, with royal titles.`

67 characters. Play's limit is 80.

### Full description

Flush Finder is the teal-and-gold map for when you need a throne and you need it now.

Snoop to Poop. Search a town, or let the phone find you, and the map fills in with gas stations, grocery stores, restaurants, parks, and public stalls. Zoom in, tap a pin, and read the room before you commit.

Ratings are in toilets, one through five. Five toilets is the Golden Throne: the stall worth crossing the street for. Reviews come from accounts. They can say customers only, ask for a key, or the hours the door is actually open.

Guests can browse. An account (Google, X, Apple, or an email code) lets you review, drop a pin, and earn points. Spend the points on titles. Flush Newbie is free. The rest of the shop is yours.

Royal escort walks you there. Pick a stall and hand the directions to your maps app.

Location is optional. The data-sale switch in Account, under Privacy, is off, and only people 16 or older can turn it on.

Flush Finder is for people 16 and older.

Category: Travel. Tags you can use: restroom, bathroom, map, travel.

## Data safety (from what the code actually does)

Answer the form this way. If you later connect an ad network, stop and change both this form and the privacy policy first.

**Does the app collect or share any of the required user data types?** Yes.

**Is all user data encrypted in transit?** Yes (HTTPS).

**Do you provide a way for users to request data deletion?** Yes. In the app (Account → Titles → Delete my account) and at `https://flush-finder-hhbb.onrender.com/delete-account`.

**Ads.** No. There is no ad SDK. Do not declare an advertising ID. The privacy switch records a preference only.

**Data sold.** No. The switch “Sell my data & personalized ads” exists, defaults off, and can be turned on only after a 16+ self-attestation. Nothing in this codebase sends account data to a broker or ad network.

**Data shared** (transferred to a third party so a feature can run, not sold):

| Data | Shared with | Purpose | Optional? |
| --- | --- | --- | --- |
| Approximate location (the map box, or a route's two ends) | Esri (map tiles), OpenStreetMap Overpass, Photon, Nominatim, public OSRM | App functionality | Location permission is optional. Searching a place does not need GPS. |
| Restroom coordinates | Google Maps, Apple Maps, or Waze, only if the user taps directions | App functionality | Yes |
| Email address | Resend, only when email codes are configured and the user asks for a code | Account management | Account is optional |
| Name, email, account id | Google, X, or Apple, only for the provider the user picks | Account management | Account is optional |

**Collected and stored by Flush Finder** (Neon, via the app server):

| Type | Collected | Stored | Notes for the form |
| --- | --- | --- | --- |
| Precise or approximate location | Yes, if the user allows location or sends feedback | GPS fixes are not stored. Feedback may store a map center rounded to ~1 km. Map queries are ephemeral. | Location, optional, app functionality. Not used for ads. |
| Name | Yes, if they make an account | Yes, until deletion | Personal info |
| Email | Yes, if they make an account or type it on feedback | Yes, until deletion | Personal info |
| User IDs | Account id, provider account id | Yes | Personal info |
| Address | No home address. Restroom addresses are places, not the user. | Restroom rows | Do not declare the user's address. |
| Photos | No | | |
| Contacts | No | | |
| Financial info | No | | |
| Health | No | | |
| Messages | No | | |
| App interactions | Reviews, ratings, titles, points, which restrooms they added, review reports | Yes | User-generated content |
| Search history | The place they search is sent to the geocoder and not stored as a history | No | You can answer that in-app search is not stored |
| Device or other IDs | Session can store IP address and user agent. Feedback stores a salted hash of IP, not the raw IP. No advertising ID. | Session until expiry or deletion | Device or other IDs, app functionality, not for tracking |
| Crash logs / diagnostics | No product analytics SDK | | |

Account creation is optional. Guests can browse.

## Content rating

Use the Play questionnaire. Suggested answers from the product as it ships:

- Violence: No
- Sexual content: No
- Drugs, alcohol, tobacco: No
- Gambling: No
- Horror: No
- Language / crude humor: the title shop uses bathroom puns (for example “Pee Pee Bandit”). If asked about crude humor, say mild. Do not claim the app is free of irreverent language.
- User-generated content: Yes. Reviews are written by accounts. There is a report control and a moderation status (`docs/MODERATION.md`).
- Users can interact: Yes (reviews and reports). They do not chat in real time.
- Shares the user's live location with other users: No. Pins are places. Your GPS is not published.
- Digital purchases: No. Points and titles are in-app only, not bought with money.
- Unrestricted internet: Yes.
- Target audience: 16–17 and 18+ only. Not designed for children. Not in Designed for Families. The in-app age gate is a self-declaration (`MIN_AGE` is 16).

The IARC rating may come out lower than 16. Keep the store's target audience at 16 and older anyway.

## Graphics you still need to upload

Play will not take the files in `native/store/play/` as-is. They are source art. Export these:

| Asset | Spec |
| --- | --- |
| App icon | 512×512 PNG, 32-bit, with alpha, max 1024 KB. The launcher already uses the teal icon in `android-twa`. |
| Feature graphic | 1024×500 PNG or JPEG. Teal and gold, the wordmark, no Grok mark. |
| Phone screenshots | At least 2, up to 8. JPEG or 24-bit PNG. Each side between 320 px and 3840 px. Use 9:16 phone frames. |
| 7-inch and 10-inch tablet screenshots | Only if you do not opt out of tablets. The TWA runs on tablets. |

Suggested shots, in order: the map with pins, a review with toilets lit (Golden Throne if you can find a five), the title shop, Account → Privacy with the sale switch off, and the delete-account page.

No TV banner. No promo video required.

## Closed testing

A personal Play Console account has to run a closed test before production. Plan on **at least 12 testers opted in for 14 continuous days**. Google has required that since late 2023 for personal accounts, and Console still gates production access on it. Confirm the exact banner in your Console in case the number has moved.

1. Finish the store listing, privacy URL (`https://flush-finder-hhbb.onrender.com/privacy`), ads (no), content rating, target audience, and Data safety. App access: guest mode works; also provide a test login if review asks.
2. Create a closed testing release and upload the AAB.
3. Create an email list of at least 12 testers. They must open the opt-in link and install from Play. You, alone, do not count as 12.
4. Leave the test running 14 days with those testers still opted in. Removing people resets the clock.
5. Apply for production access when Console says the test requirement is met. Then promote the release.

The app signing key, the upload keystore, and the tester list are yours to keep. This repository does not contain them.
