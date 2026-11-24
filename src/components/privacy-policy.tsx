import { Link } from "@tanstack/react-router";
import { APP_NAME, MIN_AGE, OPERATOR_NAME, PRIVACY_CONTACT_EMAIL } from "@/lib/constants";
import { PRIVACY_SWITCH_LABEL } from "@/lib/privacy-choices";

export const PRIVACY_UPDATED = "November 24, 2026";

export function PrivacyPolicyText() {
  return (
    <div className="mt-5 space-y-5 text-sm leading-relaxed text-foreground">
      <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Privacy policy</p>
      <p className="text-muted">Last updated: {PRIVACY_UPDATED}</p>

      <section>
        <h2 className="font-display text-lg font-semibold">Who we are</h2>
        <p className="mt-2 text-muted">
          {OPERATOR_NAME} (“we”) operates {APP_NAME}. On Google Play the developer account name is
          MisfitSoftware. This policy covers the website and the Android app, which opens that same
          website.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">1. Age</h2>
        <p className="mt-2 text-muted">
          {APP_NAME} is for people who are {MIN_AGE} years of age or older. We do not knowingly
          collect personal information from anyone under {MIN_AGE}. Creating an account asks you to
          confirm that age yourself. That checkbox is a self-declaration, not an identity check. If
          we learn an account is under {MIN_AGE}, we will delete it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">2. Location is optional</h2>
        <p className="mt-2 text-muted">
          You can browse the map without sharing where you are. If you turn location on, the phone
          uses it to center the map, list nearby restrooms, and build a walking or driving line
          (“Royal escort” and restrooms along a route). We do not keep a history of your GPS
          fixes.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>The map asks our server for restrooms inside the box you are looking at. That box is not stored as your location.</li>
          <li>
            Search and directions send the place you typed, or the two ends of a route, to mapping
            services: Esri (satellite and street tiles), Photon, OpenStreetMap Nominatim, OpenStreetMap
            Overpass, and the public OSRM demo router. They receive that request so the map can answer.
          </li>
          <li>
            If you send feedback, we may store the map center rounded to about a kilometer, plus the
            message. That is the only location we keep, and only when you submit the form.
          </li>
          <li>Opening Google Maps, Apple Maps, or Waze sends the restroom’s coordinates to that app, not your account.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">3. Accounts and sign-in</h2>
        <p className="mt-2 text-muted">
          An account is optional. Guests can look around. To review, add a restroom, or earn titles
          you sign in with one of these, when that method is turned on for the server:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>Google</li>
          <li>X</li>
          <li>Apple</li>
          <li>Email and password</li>
          <li>Email one-time codes (a 6-digit code sent to your inbox)</li>
        </ul>
        <p className="mt-2 text-muted">
          We store your display name, email address, and the sign-in provider’s account id. Password
          sign-in stores a hash of the password, not the password itself. One-time codes are stored
          only until you use them or they expire (about 10 minutes). Sessions store a token and can
          include the IP address and browser type for that sign-in. Google, X, or Apple receive the
          sign-in itself when you pick them. We do not receive your password for those services.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">4. Reviews, pins, and points</h2>
        <p className="mt-2 text-muted">
          Reviews store the toilet ratings, any note you write, your display name, and your equipped
          title, tied to your account. Points, the titles you unlock, and the title you have
          equipped are stored on your profile. Restrooms you add store the place name, coordinates,
          and your account id. Reports you file on a review store your account id and the reason.
          Public reviews stay on the map if you delete your account. The name becomes “Deleted user”
          and the link to you is removed. Restrooms that only you added are deleted.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">5. Selling data</h2>
        <p className="mt-2 text-muted">
          Account → Privacy has a switch labeled “{PRIVACY_SWITCH_LABEL}”. It is off by default.
          Only someone who has confirmed they are {MIN_AGE} or older can turn it on. While it is
          off, we do not sell or share your account for advertising.
        </p>
        <p className="mt-2 text-muted">
          This version of {APP_NAME} does not include an advertising SDK, does not read the
          advertising id, and does not send your account to a data broker. Turning the switch on
          records your permission. We will update this policy before any sale or ad partner is
          connected. People under {MIN_AGE} cannot turn the switch on.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">6. How long we keep it</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>Account, points, titles, and the privacy switch: until you delete the account.</li>
          <li>Sessions: until they expire, you sign out, or you delete the account.</li>
          <li>Email one-time codes: until they are used or they expire.</li>
          <li>Reviews you wrote: the text stays, without your name or account, after deletion.</li>
          <li>Feedback you sent while signed in: deleted with the account. A guest note is kept for moderation with no account attached. If that note included your email, deleting the account clears that email.</li>
          <li>We do not run our own analytics product. The host (planned: Render) and the database (planned: Neon) process the data required to run the app. Email codes are sent through the mail provider configured on the server (Resend), when that is turned on.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">7. Delete your account</h2>
        <p className="mt-2 text-muted">
          In the app or on the website: Account → Titles → Delete my account. The same control is on
          the public page{" "}
          <Link to="/delete-account" className="text-foreground underline-offset-4 hover:underline">
            /delete-account
          </Link>
          . That removes the account, sessions, sign-in methods, points, titles, email, and personal
          pins. Reviews you already published stay up as “Deleted user.”
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">8. Contact</h2>
        <p className="mt-2 text-muted">
          Questions about this policy:{" "}
          <a className="text-foreground underline-offset-4 hover:underline" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
