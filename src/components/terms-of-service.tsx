import { Link } from "@tanstack/react-router";
import { APP_NAME, MIN_AGE, OPERATOR_NAME, PRIVACY_CONTACT_EMAIL } from "@/lib/constants";

export const TERMS_UPDATED = "November 24, 2026";

export function TermsOfServiceText() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-foreground">
      <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Terms of service</p>
      <p className="text-muted">Last updated: {TERMS_UPDATED}</p>

      <section>
        <h2 className="font-display text-lg font-semibold">Who runs this</h2>
        <p className="mt-2 text-muted">
          {APP_NAME} is a free, community-driven app that helps people find restrooms. It is published
          by MisfitSoftware, an individual developer ({OPERATOR_NAME}). “We” means that publisher.
          The app and the website are the same service.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Accepting these terms</h2>
        <p className="mt-2 text-muted">
          By using {APP_NAME} you agree to these terms. If you do not agree, don’t use the app.
          Creating an account, posting a review, or adding a restroom is also acceptance.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Who can use it</h2>
        <p className="mt-2 text-muted">
          You must be at least {MIN_AGE} years old. {APP_NAME} is not directed at children under {MIN_AGE}.
          If we learn an account belongs to someone under {MIN_AGE}, we will delete it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Your account</h2>
        <p className="mt-2 text-muted">
          An account is optional. Guests can browse. If you create an account, you can sign in with
          Google, X, Apple, or email (a password or a one-time code), when that method is turned on.
          You are responsible for your account: the sign-in you choose, the activity under it, and
          keeping access to that email or provider. Tell us if you think someone else is using it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">What you post</h2>
        <p className="mt-2 text-muted">
          You may submit restroom listings, ratings, reviews, and photos. You keep ownership of
          what you submit. You give us a non-exclusive license to host, display, and share that
          content inside {APP_NAME} so the map and the reviews work for everyone else. That license
          lasts while the content is on the service, and for reviews we leave up after you delete
          your account (shown as “Deleted user”).
        </p>
        <p className="mt-2 text-muted">
          What you post must be accurate to the best of your knowledge, lawful, and not offensive,
          hateful, or an invasion of someone’s privacy. Don’t post private information about another
          person. We may remove content and suspend or delete accounts that break these terms.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">The map is crowd-sourced</h2>
        <p className="mt-2 text-muted">
          Listings, hours, ratings, and notes come from other people and from public map data. They
          are provided as-is. We do not guarantee that any restroom is accurate, open, available,
          clean, accessible, or safe. Check for yourself before you rely on a pin.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">How you use it</h2>
        <p className="mt-2 text-muted">
          Obey the law and the rules of private property. A pin on a customer-only or locked
          restroom is not permission to enter. When you hand directions to Apple Maps, Google Maps,
          or Waze, follow that app’s prompts and use them safely. Don’t interact with {APP_NAME} or
          those maps while you are driving if it would distract you.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Other people’s services</h2>
        <p className="mt-2 text-muted">
          Sign-in (Google, X, Apple), maps, search, and email delivery are run by other companies.
          Their terms and privacy policies govern those parts. We don’t control them.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">No warranties, limited liability</h2>
        <p className="mt-2 text-muted">
          {APP_NAME} is provided “as is” and “as available,” without warranties of any kind, to the
          fullest extent the law allows. We are not liable for lost time, a closed door, a wrong
          pin, or any indirect or consequential damages arising from your use of the service. If a
          law limits this, our liability is limited to the smallest amount that law allows. The
          service is free.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Deleting your account and privacy</h2>
        <p className="mt-2 text-muted">
          You can delete your account at{" "}
          <Link to="/delete-account" className="text-foreground underline-offset-4 hover:underline">
            /delete-account
          </Link>{" "}
          or in the app under Account → Titles → Delete my account. How we handle personal
          information is in the{" "}
          <Link to="/privacy" className="text-foreground underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Changes</h2>
        <p className="mt-2 text-muted">
          We may update these terms. The “Last updated” date will change. If you keep using{" "}
          {APP_NAME} after an update, the new terms apply.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Contact</h2>
        <p className="mt-2 text-muted">
          Questions about these terms:{" "}
          <a className="text-foreground underline-offset-4 hover:underline" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
