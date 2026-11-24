# Sign in with Apple: setup

Code is ready and **off** until these are set. Apple requires this button on iOS when the app offers other third-party sign-in (Google, X); guideline 4.8.

## What you need (your Apple Developer account, $99/yr, you sign up yourself)
1. **App ID** `com.flushfinder.app` → Certificates, IDs & Profiles → Identifiers → enable **Sign in with Apple**.
2. **Services ID** (for web sign-in), e.g. `com.flushfinder.app.web` → enable Sign in with Apple → Configure:
   - Domain: your live domain (e.g. `flush-finder.grok.me`)
   - Return URL: `https://<your-domain>/api/auth/callback/apple`
3. **Key** → Keys → new key with Sign in with Apple → download the `.p8` (only downloadable once). Note the Key ID and your Team ID.
4. **Client secret**: Apple's client secret is a JWT signed with the `.p8` key and expires after at most 6 months. Generate it (Better Auth docs: "Apple" provider) and set a reminder to rotate it.

## Environment variables (server, on the deployed host; never commit them)
| Variable | Value |
|---|---|
| `APPLE_CLIENT_ID` | the Services ID (e.g. `com.flushfinder.app.web`) |
| `APPLE_CLIENT_SECRET` | the generated JWT |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `com.flushfinder.app` (lets native iOS ID tokens verify) |
| `VITE_APPLE_SIGN_IN` | `1` at build time to show the button |

`BETTER_AUTH_URL` must be the live https URL so the callback matches.

## Behavior
- Button "Continue with Apple" shows on the web and iOS; hidden on Android and inside the Grok Build preview (Apple's redirect cannot finish in the preview iframe).
- Apple may hide the user's email (private relay address). That's expected.
- In the iPhone app (`ios/FlushFinder.xcodeproj`) Continue with Apple opens the system Apple sheet. The identity token is posted to `/api/auth/sign-in/social`. Google and X open in the system browser (`ASWebAuthenticationSession`), not in the page WebView. See `docs/app-store.md`.
- The Sign in with Apple entitlement is already on that target. The co-helper still turns the capability on for the App ID in the developer account and sets the Team ID in `ios/Signing.xcconfig`.
