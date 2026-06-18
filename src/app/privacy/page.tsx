export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-surface-700">
      <div>
        <h1 className="text-3xl font-bold text-surface-800">Privacy Policy</h1>
        <p className="mt-2 text-sm text-surface-500">Last updated: June 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">1. Overview</h2>
        <p className="text-sm leading-relaxed">
          ClipInc ("the App") is a locally-run video clipping tool. This Privacy Policy explains
          what information the App handles, how it is stored, and how it is used when you connect
          your social media accounts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">2. Data We Collect</h2>
        <p className="text-sm leading-relaxed">
          The App does not operate a central server and does not transmit your personal data to
          ClipInc. All data is stored locally on your device. The following is collected and stored
          locally:
        </p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
          <li>
            <strong>Video files:</strong> Source video files you upload for processing. These
            remain on your device and are never sent to ClipInc servers.
          </li>
          <li>
            <strong>Transcripts:</strong> Text transcripts you upload or that are generated from
            your videos. Stored locally in a SQLite database on your device.
          </li>
          <li>
            <strong>OAuth tokens:</strong> Access tokens and refresh tokens issued by third-party
            platforms (TikTok, YouTube, Instagram, Twitter/X) when you connect your accounts.
            These are stored encrypted in your local database and are used solely to publish
            content on your behalf.
          </li>
          <li>
            <strong>Clip metadata:</strong> Titles, descriptions, timestamps, and export settings
            for clips you create. Stored locally only.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">3. How We Use Data</h2>
        <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
          <li>
            Video content and transcripts are processed by a locally-running AI model (oMLX/MLX)
            on your own hardware. No video or transcript data is sent to external AI services.
          </li>
          <li>
            OAuth tokens are used exclusively to publish clips to the platforms you select. The App
            does not read your social media feed, access your followers/following lists, or perform
            any action other than uploading the video you explicitly choose to publish.
          </li>
          <li>
            We do not sell, share, or monetise any data.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">4. TikTok Data</h2>
        <p className="text-sm leading-relaxed">
          When you connect your TikTok account, the App receives an OAuth access token from
          TikTok's API. This token is used only to upload videos you have explicitly chosen to
          publish. The App requests the minimum scopes required:{" "}
          <code className="text-xs bg-surface-200 px-1 rounded">video.upload</code> and{" "}
          <code className="text-xs bg-surface-200 px-1 rounded">video.publish</code>. We do not
          access your TikTok profile information, follower data, or video feed beyond what is
          returned as confirmation of a successful upload. You can revoke access at any time via
          TikTok's app settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">5. Third-Party Services</h2>
        <p className="text-sm leading-relaxed">
          When you publish a clip, the App communicates directly with the official APIs of the
          platform you selected (TikTok, YouTube, Instagram, or Twitter/X). Your use of those
          platforms is subject to their own privacy policies:
        </p>
        <ul className="text-sm leading-relaxed space-y-1 list-disc list-inside">
          <li><a href="https://www.tiktok.com/legal/page/us/privacy-policy/en" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">TikTok Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Google / YouTube Privacy Policy</a></li>
          <li><a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Instagram Privacy Policy</a></li>
          <li><a href="https://twitter.com/en/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Twitter / X Privacy Policy</a></li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">6. Data Retention & Deletion</h2>
        <p className="text-sm leading-relaxed">
          All data is stored locally in a SQLite database and a <code className="text-xs bg-surface-200 px-1 rounded">storage/</code> folder
          on your device. You can delete all data at any time by removing those files. Disconnecting
          a social account from the App's Settings page removes the stored OAuth token for that
          platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">7. Children's Privacy</h2>
        <p className="text-sm leading-relaxed">
          The App is not directed at children under the age of 13. We do not knowingly collect
          personal information from children.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">8. Changes to This Policy</h2>
        <p className="text-sm leading-relaxed">
          We may update this Privacy Policy from time to time. The "Last updated" date at the top
          of this page reflects when changes were last made.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-surface-800">9. Contact</h2>
        <p className="text-sm leading-relaxed">
          For privacy-related questions or data deletion requests, contact:{" "}
          <a href="mailto:ruthlessproductionsllc@gmail.com" className="text-brand-400 hover:underline">
            ruthlessproductionsllc@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
