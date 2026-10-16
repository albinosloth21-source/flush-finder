# Sign-in setup for your own server (Render + Neon)

On Grok, "Continue with Google" and "Continue with X" go through Grok's own login
service. That service does not come with you to your own server, so before you move
to Render you give the app its **own** keys. You only do this once.

**Nothing breaks while you set this up.** Each sign-in method switches on only when
its keys are added. Until then the Grok app keeps working exactly as it does now.

Throughout, replace `<domain>` with your app's web address, without `https://` and
without a slash at the end. Example: `flushfinder.app` or `flush-finder.onrender.com`.

## What it costs

| Method | Cost |
|---|---|
| Google | Free |
| X (Twitter) | Free (the free developer tier is enough for sign-in) |
| Email codes (Resend) | Free up to 3,000 emails a month |
| Apple | Needs the Apple Developer Program, $99 a year (you need it for the App Store anyway) |

---

## 1. Google

1. Go to <https://console.cloud.google.com> and sign in with the Google account you
   want to own the app.
2. At the top, click the project picker → **New project**. Name it `Flush Finder` → **Create**.
3. Left menu → **APIs & Services** → **OAuth consent screen** (may be called
   **Google Auth Platform → Branding**). Click **Get started**.
   - App name: `Flush Finder`
   - User support email: your support email
   - Audience: **External**
   - Contact email: your email → **Create**.
   - Under **Branding**, add your home page and privacy policy link
     (`https://albinosloth21-source.github.io/flush-finder/`) and your domain.
   - Under **Audience**, click **Publish app** so anyone can sign in (not just test users).
     Basic sign-in (name, email) does not need Google's review.
4. Left menu → **Clients** (or **Credentials → Create credentials → OAuth client ID**).
   - Application type: **Web application**, name `Flush Finder web`.
   - **Authorized JavaScript origins:** `https://<domain>`
   - **Authorized redirect URIs:** `https://<domain>/api/auth/callback/google`
   - Click **Create**.
5. Copy the **Client ID** and **Client secret**. These go into Render as
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (step 5 below).

## 2. X (Twitter)

1. Go to <https://developer.x.com> and sign in with the X account that should own the app.
   Sign up for the **Free** tier and describe the use: "Let users sign in to the
   Flush Finder app with their X account."
2. In the **Developer Portal → Projects & Apps**, open your app (or create one).
3. Under **User authentication settings**, click **Set up**:
   - App permissions: **Read**
   - Turn on **Request email from users** (this is the email scope).
   - Type of App: **Web App, Automated App or Bot** (a "confidential client").
   - **Callback URI / Redirect URL:** `https://<domain>/api/auth/callback/twitter`
   - **Website URL:** `https://<domain>`
   - Terms of service and privacy policy links: your privacy page link. (X requires
     these for the email permission.)
   - **Save**.
4. Open the **Keys and tokens** tab. Under **OAuth 2.0 Client ID and Client Secret**,
   copy both. (Not the "API Key" / "Consumer Keys"; those are the old OAuth 1.0 ones.)
   These go into Render as `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`.

## 3. Apple

Follow **[APPLE-SIGN-IN.md](./APPLE-SIGN-IN.md)**. It needs the $99/year Apple
Developer Program. Use `https://<domain>/api/auth/callback/apple` as the return URL there.

## 4. Email codes (passwordless sign-in) and confirmation emails

On Grok, the app can't send email, so the 6-digit confirmation code is shown on screen.
On your own server you connect a sender, and then:

- confirmation codes are **emailed** instead of shown, and
- people can tap **Email me a sign-in code** to sign in with no password.

We use **Resend**:

1. Sign up at <https://resend.com> (free).
2. **Domains → Add domain** → enter your domain. Resend shows a few DNS records;
   add them where you bought the domain, then click **Verify**. (You need your own
   domain for this. A free `onrender.com` address can't send email.)
3. **API Keys → Create API key** (permission: Sending access). Copy it.
   This is `RESEND_API_KEY`.
4. Pick the "from" address, e.g. `Flush Finder <no-reply@<domain>>`. This is `EMAIL_FROM`.

## 5. Put the keys into Render

In Render, open your Flush Finder web service → **Environment** → **Add environment
variable**. Add each one you have, then **Save, rebuild and deploy**. ("Rebuild" matters
for the `VITE_` ones, which are read when the app is built.)

| Variable | Value | Needed for |
|---|---|---|
| `BETTER_AUTH_URL` | `https://<domain>` | Everything (your app's address) |
| `BETTER_AUTH_SECRET` | a long random string (Render's **Generate** button) | Everything |
| `DATABASE_URL` | the connection string from Neon | Everything |
| `GOOGLE_CLIENT_ID` | from step 1 | Google |
| `GOOGLE_CLIENT_SECRET` | from step 1 | Google |
| `TWITTER_CLIENT_ID` | from step 2 (OAuth 2.0 Client ID) | X |
| `TWITTER_CLIENT_SECRET` | from step 2 (OAuth 2.0 Client Secret) | X |
| `APPLE_CLIENT_ID` | see APPLE-SIGN-IN.md | Apple |
| `APPLE_CLIENT_SECRET` | see APPLE-SIGN-IN.md | Apple |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `com.flushfinder.app` | Apple on iPhone |
| `VITE_APPLE_SIGN_IN` | `1` | Shows the Apple button |
| `RESEND_API_KEY` | from step 4 | Emailed codes |
| `EMAIL_FROM` | from step 4 | Emailed codes |
| `VITE_EMAIL_CODE_SIGN_IN` | `1` (only once the two above are set) | Shows "Email me a sign-in code" |

Do **not** copy any `GROK_AUTH_*` variables to Render. They belong to Grok's hosting.

## 6. Check it

Open `https://<domain>/login`, tick "I am 16 or older", and try each button. If Google
says `redirect_uri_mismatch`, the redirect URI in step 1 doesn't exactly match
`https://<domain>/api/auth/callback/google` (check `https`, spelling, and no trailing slash).
X's equivalent error means the callback in step 2 doesn't match.

## How the fallback works (for the curious)

- The Google and X buttons look the same everywhere. When tapped, the app first asks
  your server for **direct** Google/X sign-in. If the server has that provider's keys,
  it goes straight to Google/X.
- If the keys aren't there (as on Grok today), the server says so, and the app quietly
  uses Grok's login service like before.
- In Grok's preview window it always uses Grok's login service.
- New accounts always need the 16+ checkbox, whichever button is used.
