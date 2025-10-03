import Head from 'next/head';
import Navbar from '../components/Navbar';

const PrivacyPolicy = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy · In Suave We Trust</title>
        <meta name="description" content="Privacy policy detailing how In Suave We Trust collects, uses, and protects your information." />
      </Head>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
          <header className="space-y-4">
            <p className="text-sm uppercase tracking-wide text-[#F2EA6D]">Last updated: October 3, 2025</p>
            <h1 className="text-4xl font-semibold">Privacy Policy</h1>
            <p className="text-lg text-gray-200">
              In Suave We Trust respects your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you
              have about your data when you interact with our website, newsletter, and partner applications.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p className="text-gray-200">
              We collect limited personal information that you voluntarily provide, such as your email address when you subscribe to our newsletter
              or contact us directly. We also gather basic analytics data (like page views and device type) to understand how visitors use the site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              <li>To send newsletters, updates, and announcements you request.</li>
              <li>To respond to inquiries and provide support.</li>
              <li>To monitor site performance and improve our content and user experience.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">3. Sharing Your Information</h2>
            <p className="text-gray-200">
              We do not sell or rent your personal information. We may share data with trusted service providers (such as our email newsletter platform)
              strictly for delivering the services you request. These providers are obligated to safeguard your information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">4. Cookies and Analytics</h2>
            <p className="text-gray-200">
              Our site may use cookies or similar technologies to remember your preferences and gather aggregate analytics. You can adjust your browser
              settings to limit or disable cookies, though some site features may not function properly without them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">5. Your Choices</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              <li>You can unsubscribe from newsletter emails at any time by using the link in the email or contacting us directly.</li>
              <li>You may request access to, correction of, or deletion of personal information we hold about you by emailing us.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">6. Data Security</h2>
            <p className="text-gray-200">
              We use reasonable administrative, technical, and physical safeguards to protect your information. However, no online transmission or
              storage system is entirely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">7. Children&apos;s Privacy</h2>
            <p className="text-gray-200">
              Our services are intended for individuals 16 years of age or older. We do not knowingly collect personal information from children.
              If we learn that we have inadvertently collected such information, we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
            <p className="text-gray-200">
              We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date above. We encourage you to review
              this page periodically to stay informed about our privacy practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p className="text-gray-200">
              If you have questions or requests regarding this policy, please email us at
              {' '}<a href="mailto:jason.sekyere@insuavetrust.com" className="text-[#F2EA6D] underline">jason.sekyere@insuavetrust.com</a>.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};

export default PrivacyPolicy;

