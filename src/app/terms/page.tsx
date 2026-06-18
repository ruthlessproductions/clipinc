export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-surface-700">
      <div>
        <h1 className="text-3xl font-bold text-surface-800">Terms of Service</h1>
        <p className="mt-2 text-sm text-surface-500">Last updated: June 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">1. Acceptance of Terms</h2>
        <p className="text-sm leading-relaxed">
          By accessing or using ClipInc ("the App"), you agree to be bound by these Terms of
          Service. If you do not agree to these terms, please do not use the App.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">2. Description of Service</h2>
        <p className="text-sm leading-relaxed">
          ClipInc is a video clipping tool that uses AI to identify highlight moments in video
          content and enables users to export and publish short-form clips to third-party social
          media platforms including TikTok, YouTube, Instagram, and Twitter/X. The App runs
          locally on the user's own machine and does not upload source video to any external
          servers operated by ClipInc.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">3. User Responsibilities</h2>
        <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
          <li>You must own or have the rights to any video content you process or publish through the App.</li>
          <li>You are solely responsible for ensuring your content complies with the terms of service of any third-party platform you publish to.</li>
          <li>You must not use the App to process or distribute content that is unlawful, infringing, defamatory, or otherwise objectionable.</li>
          <li>You are responsible for safeguarding any API credentials or OAuth tokens stored on your device.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">4. Third-Party Platforms</h2>
        <p className="text-sm leading-relaxed">
          The App integrates with third-party platforms (TikTok, YouTube, Instagram, Twitter/X)
          via their official APIs. Your use of those integrations is governed by the respective
          platform's own terms of service. ClipInc is not affiliated with or endorsed by any of
          those platforms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">5. Intellectual Property</h2>
        <p className="text-sm leading-relaxed">
          The App software is provided for personal use. You retain full ownership of any video
          content you process using the App. ClipInc does not claim any rights over your content.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">6. Disclaimer of Warranties</h2>
        <p className="text-sm leading-relaxed">
          The App is provided "as is" without warranties of any kind, express or implied. We do
          not warrant that the App will be error-free, uninterrupted, or that AI-generated clip
          selections will meet your expectations. Use the App at your own risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">7. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed">
          To the maximum extent permitted by law, ClipInc shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the App, including
          but not limited to loss of data, loss of content, or account suspension on third-party
          platforms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">8. Changes to Terms</h2>
        <p className="text-sm leading-relaxed">
          We reserve the right to modify these Terms at any time. Continued use of the App after
          changes are posted constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">9. Contact</h2>
        <p className="text-sm leading-relaxed">
          Questions about these Terms can be sent to:{" "}
          <a href="mailto:ruthlessproductionsllc@gmail.com" className="text-brand-400 hover:underline">
            ruthlessproductionsllc@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
