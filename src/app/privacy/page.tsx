import Link from "next/link";

const MAILING_ADDRESS = process.env.MAILING_ADDRESS ?? "[mailing address not yet configured]";
// Same "founder-supplied, not yet configured" bucket as MAILING_ADDRESS - the product name
// ("Game Day New England") isn't necessarily the same as the registered business entity that
// legally operates it, and a privacy policy should name who "we" actually is.
const LEGAL_ENTITY_NAME = process.env.LEGAL_ENTITY_NAME ?? "[legal entity name not yet configured]";
const LAST_UPDATED = "August 20, 2026";

export const metadata = { title: "Privacy Policy | Game Day New England" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Last updated: {LAST_UPDATED}</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Game Day New England is operated by {LEGAL_ENTITY_NAME} (&quot;we&quot;, &quot;us&quot;).
        </p>

        <div className="mt-6 space-y-6 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">What we collect</h2>
            <p className="mt-2">
              Browsing the schedule doesn&apos;t require an account and doesn&apos;t collect any
              personal information. If you create an account, we collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your name and email address</li>
              <li>Your phone number, if you sign up or sign in with a phone number, or opt into text alerts</li>
              <li>The schools, teams, leagues, venues, or games you choose to follow</li>
              <li>Basic account activity (when your account was created, when you last verified your email or phone)</li>
            </ul>
            <p className="mt-2">
              If you sign in with Google, we receive your name, email address, and profile image
              from Google - nothing else from your Google account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              How we use it
            </h2>
            <p className="mt-2">We use your information only to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Run your account (sign-in, password reset, verification codes)</li>
              <li>Send you game alerts for what you&apos;ve chosen to follow, by email and/or text, only if you&apos;ve opted in</li>
              <li>Occasionally include a sponsor message in that same alert email or text</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal information, and we do not share it with third parties
              for their own marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Text messages and email
            </h2>
            <p className="mt-2">
              Text alerts are opt-in only - we record the date you consented, and you can stop
              them at any time by replying STOP or from your account page. Message and data rates
              may apply. Email alerts include an unsubscribe link in every message. Opting out of
              alerts doesn&apos;t delete your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Where your data is stored
            </h2>
            <p className="mt-2">
              Your account data is stored in a managed Postgres database. Passwords are never
              stored in plain text - they&apos;re hashed before being saved, and we can&apos;t
              recover your original password even if we wanted to. We use established providers
              to send email (Resend), send text messages (Twilio), and analyze site usage
              (Vemetric); they process this data only to provide their service to us, not for
              their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Chrome extension
            </h2>
            <p className="mt-2">
              The Game Day New England Chrome extension doesn&apos;t collect or transmit any
              personal information. It fetches the same public schedule data available on this
              site from our public API. If you pick a school filter, that choice is saved only in
              your own browser&apos;s local storage (via Chrome&apos;s <code>storage</code>{" "}
              permission) - it never leaves your device except as a school ID in the API request
              used to filter what&apos;s shown. Uninstalling the extension removes that saved
              preference.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Cookies and analytics
            </h2>
            <p className="mt-2">
              We use one cookie: a session cookie that keeps you signed in. We don&apos;t use
              advertising or ad-tracking cookies.
            </p>
            <p className="mt-2">
              We use Vemetric, a cookieless analytics service, to understand how the site is
              used - which pages get visited, and actions like signing up, following a school,
              team, league, venue, or game, or clicking through to buy tickets. If you&apos;re
              signed in, that&apos;s tied to your account&apos;s internal id - never your name,
              email, or phone number. If you&apos;re not signed in, it isn&apos;t tied to you at
              all. We separately keep our own anonymous page-view count (a page path and a
              timestamp, nothing else) for our own reporting - that record isn&apos;t tied to a
              cookie, account, IP address, or any other identifier, and can&apos;t be traced back
              to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Children&apos;s privacy
            </h2>
            <p className="mt-2">
              Game Day New England is not directed to children under 13, and we do not knowingly
              collect personal information from anyone under 13. If we learn that we&apos;ve
              collected information from a child under 13, we&apos;ll delete it. If you believe a
              child has created an account, contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Your choices</h2>
            <p className="mt-2">
              You can update what you follow, or stop email/text alerts, from your{" "}
              <Link href="/manage" className="text-orange-600 hover:underline dark:text-orange-400">
                account page
              </Link>
              . To delete your account entirely, contact us using the information below and
              we&apos;ll remove your account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Changes to this policy
            </h2>
            <p className="mt-2">
              If we make a material change to how we handle your data, we&apos;ll update this page
              and change the date above.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Contact</h2>
            <p className="mt-2">
              Questions about this policy or your data:
              <br />
              {LEGAL_ENTITY_NAME}
              <br />
              {MAILING_ADDRESS}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
