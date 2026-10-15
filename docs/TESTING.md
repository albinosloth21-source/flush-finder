# Testing Flush Finder before release

Everything below needs your own developer accounts. Nothing here costs money except the accounts themselves (Google Play one-time fee, Apple Developer yearly fee).

## 0. Before either store
1. Deploy the latest code to an https URL (e.g. publish in Grok Build or deploy) with `FF_STORE_BUILD=1` set on the server.
2. `npm install`, then `CAPACITOR_SERVER_URL=https://<live-domain> npx cap sync`.
3. Bump versions: Android `versionCode`, iOS build number.

## 1. Google Play internal testing
1. Create a Google Play Console developer account; verify identity.
2. **Create app** → name Flush Finder, App, Free, accept declarations.
3. Fill **App content**: privacy policy URL (`https://albinosloth21-source.github.io/flush-finder/`), ads (choose honestly), app access (give a test login or say guest mode works), content rating questionnaire, target audience 16+, Data safety, news app = no.
4. On your computer: open `android/` in Android Studio → Build → Generate Signed App Bundle → create an **upload key** (store the `.jks` and passwords somewhere safe, never in git) → release AAB.
5. Play Console → Testing → **Internal testing** → Create release → upload the AAB → opt in to Play App Signing → release notes → Save → Review → Roll out.
6. Testers tab → create an email list (up to 100) → copy the **opt-in link** and send it to testers. They accept, then install from the Play Store.
7. Note: new personal developer accounts must run a **closed test with at least 12 testers for 14 days** before production access.

## 2. Apple TestFlight
1. Enroll in the Apple Developer Program (needs a Mac with Xcode for building).
2. App Store Connect → My Apps → **+ New App**: iOS, Flush Finder, bundle ID `com.flushfinder.app`, SKU any.
3. On the Mac: `npx cap open ios` → Xcode → target App → Signing & Capabilities → select your Team, automatic signing; add **Sign in with Apple** if you enabled it.
4. Product → Destination: Any iOS Device → **Product → Archive** → Distribute App → App Store Connect → Upload.
5. Wait for processing (minutes to an hour). Answer the export-compliance question (standard HTTPS only → usually "no" for non-exempt encryption).
6. TestFlight tab → **Internal Testing** group: add up to 100 people on your App Store Connect team; they install via the TestFlight app immediately.
7. **External testing** (anyone by email or public link): create a group, add the build, fill test info; the first build needs a short Beta App Review.

## 3. Tester checklist
Report device, OS version, browser/app, and a screenshot for anything wrong.

**Location**
- [ ] First open: "Use my location" → map centers on you with the radius ring.
- [ ] Deny the permission → card explains how to turn it back on; "Try again" works after allowing.
- [ ] Turn off device location services → "Your location isn't available" card.
- [ ] Open the shared link inside Instagram/Messenger/X → "Open in your browser" card.
- [ ] Open the Grok Build preview link → "Open in new tab" works.
- [ ] "Tap the map to set my spot" → spot saved; close and reopen the app → it starts there.
- [ ] "Snoop to Poop" search finds a city and moves the map.
- [ ] Re-center returns to you.

**Pins**
- [ ] Pins appear when zoomed in; tapping a pin opens its sheet.
- [ ] Add a pin with "+" → name it, save; it appears; delete your own pin.
- [ ] Report a place as gone/closed.
- [ ] Filters (Food, Gas, Grocery, Parks, Shops, Personal restrooms, Rated) and radius chips 1/2/5/10.

**Reviews**
- [ ] Guest cannot review; sign-in prompt shows.
- [ ] Confirmed account can review with ratings, hours, and a note; rude words are blocked.
- [ ] "Report" on someone else's review → choose a reason → "Thanks" message. (Three different accounts reporting hides it.)
- [ ] Hours tab shows open/closed.

**Points and titles**
- [ ] Points increase after adding a pin or review.
- [ ] Account → Titles: buy a title with points, equip it, it shows on new reviews.
- [ ] Can't buy without enough points.

**Sign-in and account**
- [ ] "I am 16 or older" must be checked to create an account (email or Google/X/Apple); email sign-in for existing accounts works without it.
- [ ] Google, X, (Apple when enabled), email sign-up + confirmation code.
- [ ] Close the app fully and reopen → still signed in.
- [ ] Sign out; delete account removes it.

**Privacy**
- [ ] Account → Privacy: "Sell my data & personalized ads" is **off** on a fresh install.
- [ ] Turn it on and off; the toast matches; choice survives reopening.
- [ ] Privacy policy page opens and says the switch is off by default and the app is for 16+.
