# Flush Finder on the App Store

This is the guide for the person with the Apple Developer account and the Mac. The Xcode project is `ios/FlushFinder.xcodeproj`. Do not open `ios/App/App.xcodeproj`. That older project is a Capacitor WebView. Apple rejects those under guideline 4.2, and Google sign-in fails inside a WebView.

The live website is still the map, the reviews, the titles, and Delete my account. The iPhone app adds the pieces that have to be native.

## Why it is built this way

Guideline 4.2 says an app has to be more than a website in a frame. This project keeps the Flush Finder site (Snoop to Poop, Royal escort, Golden Throne) and does these jobs in iOS itself:

| Job | What the app uses | Why |
| --- | --- | --- |
| Nearby restrooms | `CLLocationManager`, While Using permission | The system location prompt, not the WebView's geolocation. |
| Royal escort | `MKMapItem` for Apple Maps, and Google Maps / Waze if those apps are installed | Directions leave the page and open the maps app. |
| Share a throne | `UIActivityViewController` | The system share sheet. |
| Toilet taps and the flush | `UIImpactFeedbackGenerator` / notification haptics | The phone clicks back. |
| Google and X | `ASWebAuthenticationSession` | Safari's sign-in sheet. The OAuth page is not inside the WebView. Google blocks embedded WebViews. |
| Apple | `ASAuthorizationController` (Sign in with Apple) | Required because Google and X are offered. The identity token is posted to the server. |
| Account deletion | The same Account → Titles → Delete my account screen, inside the signed-in site | Already on the web. The app stores the session the same way, so the button reaches the server. |

Push notifications are not in this version. Add them later if you want them. Do not turn on a push entitlement until there is a server to send them.

The only site address is `native/production-url.json`. The Xcode build copies that file into the app. It is set to `https://flush-finder-hhbb.onrender.com`. If that host is changed back to a placeholder such as `REPLACE_ME.example`, the app shows a native message instead of a blank page.

There is no Grok badge in the iPhone UI. The site shows that pill only on localhost and `*.grok.me`. The Render host must be built with `FF_STORE_BUILD=1` (see `docs/play-store.md`) so the page the app loads does not include it.

No certificate, profile, `.p8` key, or password belongs in git. The Team ID in `ios/Signing.xcconfig` is the placeholder `TODOTEAMID`.

## Before you open Xcode

1. You need a Mac with a current Xcode (16 or newer), and an Apple Developer Program membership in your name.
2. The website is live at `https://flush-finder-hhbb.onrender.com`. `productionUrl` and `host` in `native/production-url.json` already match that origin.
3. On the server, set `FF_STORE_BUILD=1`, `BETTER_AUTH_URL` to that same origin, and the sign-in secrets from `docs/SIGN-IN-SETUP.md` and `docs/APPLE-SIGN-IN.md`. Do not copy `GROK_AUTH_*`.
4. Sign in with Apple has to be turned on or the Apple button will fail, and App Review will reject the app because Google and X are on the same screen.
   - App ID: the bundle ID you ship (start with `com.flushfinder.app`) → enable Sign in with Apple.
   - Services ID for the website, return URL `https://flush-finder-hhbb.onrender.com/api/auth/callback/apple`.
   - Key (`.p8`) stays on your Mac. Generate the client secret JWT and put it in Render as `APPLE_CLIENT_SECRET`.
   - `APPLE_CLIENT_ID` is the Services ID for the website. `APPLE_APP_BUNDLE_IDENTIFIER` is the iPhone bundle ID, so the native Apple token checks out.
5. Create one email account on the live site and confirm it. You will paste that login into App Review notes. Do not put the password in the repo.

## Open the project and sign it

1. Clone the repo and check out the branch that contains this project.
2. Open `ios/FlushFinder.xcodeproj` (double-click). Wait until the indexing spinner finishes. There are no CocoaPods and no `pod install`.
3. In the project navigator, click the Flush Finder project, then the FlushFinder target, then Signing & Capabilities.
4. Check **Automatically manage signing**.
5. Team: choose your team. Then open `ios/Signing.xcconfig` and replace `TODOTEAMID` with the 10-character Team ID (developer.apple.com → Membership). If you only pick the team in Xcode, set the file too so the next clone matches.
6. Bundle ID: leave `com.flushfinder.app` if that App ID is free on your team. If Xcode says it is taken, change `PRODUCT_BUNDLE_IDENTIFIER` in `ios/Signing.xcconfig` and create the matching App ID with Sign in with Apple. Use the new ID as `APPLE_APP_BUNDLE_IDENTIFIER` on the server.
7. Confirm the capability **Sign in with Apple** is listed. The entitlement file already asks for it. If Xcode shows a signing error, click the capability once so it registers the App ID.
8. Plug in an iPhone, pick it as the run destination, and press Run. The first launch asks you to trust the developer certificate on the phone (Settings → General → VPN & Device Management).

The production URL is already `https://flush-finder-hhbb.onrender.com`. A placeholder host never loads the map.

## What to try on the phone

- The map loads. Snoop to Poop searches. Golden Throne still means five toilets.
- Tap the location control. iOS asks "while using the app". Allow it. Pins center on you. Deny it and the map still browses.
- Royal escort → Apple. Apple Maps opens with walking directions. Google and Waze open those apps when they are installed.
- Share opens the system share sheet.
- Tapping a toilet rating gives a light tap. A five gives the stronger success tap.
- Continue with Apple shows Apple's sheet, not a web form.
- Continue with Google (and X) opens a Safari sheet, then drops you back in the app signed in.
- Email and the 6-digit code stay on the page. They are same-origin and do not go through Google.
- Account → Titles → **Delete my account**. Confirm. The account is gone and public reviews stay as "Deleted user." The same control is on the website at `/delete-account`.

## Associated Domains

This build does **not** use Associated Domains. Sign-in finishes on the custom URL `flushfinder://auth`, which the app registers. You do not need `apple-app-site-association` for review.

If you later want a https link to open the app:

1. Replace `TODOTEAMID` in `public/.well-known/apple-app-site-association` with your Team ID. Redeploy. The file must be `https://flush-finder-hhbb.onrender.com/.well-known/apple-app-site-association` with content type `application/json` and no redirect.
2. In Xcode, add the Associated Domains capability with `applinks:flush-finder-hhbb.onrender.com`.
3. Archive again.

Until you do that, leave the entitlement off. A wrong Team ID in that file does nothing while the capability is off.

## Archive and upload

1. Destination: **Any iOS Device (arm64)**. A simulator cannot archive.
2. Product → Archive. If signing fails, the Team ID is still `TODOTEAMID` or the bundle ID does not match an App ID you own.
3. The Organizer opens. Select the archive → **Distribute App** → **App Store Connect** → Upload.
4. Leave bitcode off (current Xcode does). Symbol upload can stay on.
5. Wait until App Store Connect shows the build under TestFlight (often 10–30 minutes, sometimes longer while it processes).

Version: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` live in `ios/Signing.xcconfig`. The build number (`CURRENT_PROJECT_VERSION`) must go up for every upload. Keep it in step with `versionCode` in `native/production-url.json`.

Export compliance: the app only uses HTTPS. `ITSAppUsesNonExemptEncryption` is false, so you answer "No" when Connect asks about extra encryption.

## TestFlight

1. App Store Connect → your app → TestFlight.
2. Answer the export question if it is waiting.
3. Internal testing: add yourself. You can install immediately.
4. External testing needs a short Beta App Review. Not required before you submit to the store, but useful if someone else should try the build first.

## Submit for review

Create the app in App Store Connect if it is not there: Apps → New App → iOS → name **Flush Finder** → the bundle ID you signed with → SKU `flush-finder`.

Fill in:

- Privacy policy URL: `https://flush-finder-hhbb.onrender.com/privacy`
- Support URL: the same site, or a page you control. The contact on the policy is still a TODO address until you replace `PRIVACY_CONTACT_EMAIL` in `src/lib/constants.ts`.
- Category: Navigation (or Travel).
- Age rating: walk through the questionnaire with the answers below. The product is 16+.
- Content rights: you are not using someone else's trademarked catalog as the brand. Map tiles are Esri and OpenStreetMap, used to show places.
- Sign-in information: required. See review notes below.

## Listing copy

**Name:** Flush Finder

**Subtitle** (30 characters max):

`Snoop to Poop. Toilet ratings`

29 characters.

**Keywords** (100 characters max, commas, no spaces needed):

`restroom,bathroom,toilet,map,throne,travel,ratings,gas,park,directions`

**Promotional text** (optional, 170 characters):

Find a throne before you stall. Teal and gold map, toilet ratings, and titles you earn. Location stays optional.

**Description:**

Flush Finder is the teal-and-gold map for when you need a throne and you need it now.

Snoop to Poop. Search a town, or let the iPhone find you, and the map fills in with gas stations, grocery stores, restaurants, parks, and public stalls. Zoom in, tap a pin, and read the room before you commit.

Ratings are in toilets, one through five. Five toilets is the Golden Throne: the stall worth crossing the street for. Reviews come from accounts. They can say customers only, ask for a key, or the hours the door is actually open.

Guests can browse. An account (Apple, Google, X, or an email code) lets you review, drop a pin, and earn points. Spend the points on titles. Flush Newbie is free.

Royal escort walks you there. On iPhone that opens Apple Maps, or Google Maps or Waze when you pick them. Share a throne with the system share sheet.

Location is optional and only used while the app is open. The data-sale switch in Account, under Privacy, is off, and only people 16 or older can turn it on. This version does not sell data and does not track you across other companies' apps.

Flush Finder is for people 16 and older.

## Privacy nutrition label

Answer from what the code stores. Do not declare tracking. There is no ad SDK and the sale switch does not send data anywhere.

**Data used to track you:** none.

**Data linked to the user** (only if they create an account):

| Type | Used for |
| --- | --- |
| Name | App functionality |
| Email address | App functionality |
| User ID | App functionality |
| Other user content (reviews, titles, pins, feedback they send) | App functionality |

**Data not linked to the user:**

| Type | Used for |
| --- | --- |
| Precise location | App functionality. Used to center the map. Not stored as a history. Optional. |

Coarse map center can be stored with feedback they choose to send (rounded to about a kilometer). If you want to be strict, also declare Coarse Location, linked, app functionality, optional.

Do not declare Device ID, advertising data, purchases, health, contacts, photos, or browsing history.

## App Tracking Transparency

Do **not** call the tracking prompt in this version. Nothing is sold, there is no advertising SDK, and `NSPrivacyTracking` is false. Asking for tracking when you do not track is a review problem.

If the sale switch is ever wired to an ad network or a data broker:

1. Only after the person is 16 or older and has turned the switch on. It stays off by default.
2. Add `NSUserTrackingUsageDescription` to `ios/FlushFinder/Info.plist` in plain language.
3. Call `ATTrackingManager.requestTrackingAuthorization` before any tracking SDK starts. If they say no, do not read the advertising identifier.
4. Set `NSPrivacyTracking` to true, list the tracking domains, and update the nutrition label and the privacy policy before that build goes to review.
5. Update App Store Connect's privacy answers in the same release.

Until that day, leave the prompt out.

## Age rating

Use the App Store questionnaire. Suggested answers:

- Violence, sexual content, drugs, horror, gambling: none.
- Crude humor: mild. The title shop uses bathroom puns.
- User-generated content: yes (reviews). Users can report a review. See `docs/MODERATION.md`.
- Unrestricted web: the app opens maps and the sign-in sheet. It is not a general browser.
- Made for kids: no. 16 and older.
- Age assurance in the app is a self-check, not an ID check. Say that if the form asks.

If the new age-rating flow offers bands, pick 16+ or the closest band that is not for children.

## Screenshots

Confirm the slots in App Store Connect. As of late 2026 the usual required set is:

| Device | Size (pixels, portrait) |
| --- | --- |
| 6.9-inch iPhone | 1320 × 2868 or 1290 × 2796 |
| 6.5-inch iPhone | 1284 × 2778 or 1242 × 2688 |
| 13-inch iPad (this project is universal) | 2064 × 2752 |

Take at least three: the map with pins, a review with toilets lit, and Account → Privacy with the sale switch off. Use the simulator's screenshot (File → Save Screen) at those device sizes. Do not include a Grok badge. Status bar should look like a normal iPhone.

## Review notes

Paste this, then fill in the demo login you created. Do not invent a password in the repo.

```
Flush Finder is a restroom map for people 16+. Guests can browse with no account.

Sign-in is optional. On iPhone, Sign in with Apple uses the system sheet. Google and X use the system browser (ASWebAuthenticationSession), not an in-app web view. Email and one-time codes stay on our page.

Location is optional (While Using). Directions open Apple Maps. Account deletion is in the app: Account → Titles → Delete my account. The same page is on the website at https://flush-finder-hhbb.onrender.com/delete-account.

Demo account for review (email already confirmed):
Email: REPLACE_WITH_REVIEWER_EMAIL
Password: REPLACE_WITH_REVIEWER_PASSWORD

The data-sale switch in Account → Privacy is off. The app does not track the user and does not request App Tracking Transparency. No ads SDK is linked.
```

If review cannot sign in with Apple, the usual cause is `APPLE_APP_BUNDLE_IDENTIFIER` not matching the bundle ID you uploaded, or the client secret JWT having expired (Apple secrets last at most 6 months).

## What this repository cannot check

A Mac with Xcode is required to compile, sign, archive, and upload. This project was not built on a Mac. After you open it, Product → Build is the first real compile. Fix any signing error by setting your Team ID. The website side (the pages the app loads) is covered by the web build and tests.
