import { APP_NAME, OPERATOR_NAME, SUPPORT_EMAIL } from "@/lib/constants";

export const PRIVACY_UPDATED = "September 16, 2026";
export const SUPPORT_WEBSITE = "https://albinosloth21-source.github.io/flush-finder/";

export function PrivacyPolicyText() {
  return (
    <div className="mt-5 space-y-5 text-sm leading-relaxed text-foreground">
      <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Privacy policy</p>
      <p className="text-muted">Last Updated: {PRIVACY_UPDATED}</p>

      <p>
        {OPERATOR_NAME} (“we,” “our,” or “us”) operates the {APP_NAME} mobile application (the
        “App”). We respect your privacy and are committed to protecting your personal data.
      </p>
      <p>
        This Privacy Policy describes how we collect, use, disclose, and sell your information, as
        well as your choices regarding your data under applicable data privacy laws, including the
        California Consumer Privacy Act (CCPA).
      </p>

      <section>
        <h2 className="font-display text-lg font-semibold">1. Age restriction and eligibility</h2>
        <p className="mt-2 text-muted">
          The App is strictly intended for use by individuals who are sixteen (16) years of age or
          older. We do not knowingly collect, solicit, or sell personal information from individuals
          under the age of 16. If we learn that we have inadvertently collected personal data from a
          user under 16, we will delete that information immediately.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">2. Information we collect</h2>
        <p className="mt-2 text-muted">We may collect and process the following categories of information:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            <span className="text-foreground">Personal Identifiers:</span> Information provided
            directly by you, such as your name, email address, or account login credentials.
          </li>
          <li>
            <span className="text-foreground">Device and Usage Data:</span> Information collected
            automatically when you use the App, including your Internet Protocol (IP) address,
            unique device identifiers (IDFA/GAID), mobile operating system, and data regarding your
            interactions with the App.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">3. How we use your information</h2>
        <p className="mt-2 text-muted">
          We utilize the collected data to maintain and optimize App functionality, personalize your
          user experience, and deliver relevant advertisements.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">4. Data sharing and the “sale” of personal information</h2>
        <p className="mt-2 text-muted">
          Under certain privacy laws, sharing device identifiers and usage activity with third-party
          advertising networks, data brokers, or analytics providers may be classified as a “sale”
          or “sharing” of personal information.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            We may sell or share pseudonymized device identifiers and usage habits with external
            advertising partners to provide targeted in-app promotions.
          </li>
          <li>
            By default, upon downloading the App, users aged 16 and older are opted-in to this data
            optimization.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">5. Your rights and the “Do Not Sell My Data” opt-out</h2>
        <p className="mt-2 text-muted">
          We provide all users with the right to opt out of the sale or commercial sharing of their
          personal information at any time.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            <span className="text-foreground">How to exercise your opt-out right:</span> Open
            Account, tap Privacy, and turn off “Sell my data & personalized ads” (Do Not Sell My
            Personal Information). You can use the same switch at the top of this policy.
          </li>
          <li>
            <span className="text-foreground">Effect of opting out:</span> Once the toggle is turned
            off, we will cease transferring your active device metrics or account data to
            third-party commercial partners.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">6. Data security and retention</h2>
        <p className="mt-2 text-muted">
          We implement appropriate technical and organizational safeguards designed to protect your
          data from unauthorized access or disclosure. We retain your personal information only for
          as long as necessary to fulfill the business purposes outlined in this policy or to
          fulfill legal requirements.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">7. Amendments to this privacy policy</h2>
        <p className="mt-2 text-muted">
          We reserve the right to update this Privacy Policy periodically. We will notify you of any
          material changes by updating the “Last Updated” date at the top of this document or via an
          in-app notice.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">8. Contact information</h2>
        <p className="mt-2 text-muted">
          If you have questions regarding this Privacy Policy or wish to exercise your data deletion
          rights, please contact us at:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            Email:{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            Website:{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={SUPPORT_WEBSITE}>
              {SUPPORT_WEBSITE}
            </a>
          </li>
          <li>Delete account: Account → Titles → Delete account</li>
        </ul>
      </section>
    </div>
  );
}
