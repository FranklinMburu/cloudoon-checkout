import { Header } from './components/Header';

const PAGES: Record<'privacy' | 'terms', { title: string; sections: [heading: string, body: string][] }> = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['What we collect', 'Your email address, name, billing address and phone number, the products in your order, and how you paid (for example “Visa ending 4242”). If you sign in with Google or GitHub we receive your verified email address and name from them, nothing else.'],
      ['What we don’t collect', 'Card numbers. They go straight from your browser to Stripe, our card processor, and never reach our servers.'],
      ['Who processes it', 'Stripe (cards), Safaricom (M-Pesa), PayPal, Google and GitHub (sign-in), and OpenStreetMap’s Photon service (address suggestions; only the text you type in the address field is sent). Each handles your data under its own privacy policy.'],
      ['Why', 'To take your order, bill you, and send your receipt. We don’t sell your data or use it for advertising.'],
      ['Your choices', 'You can ask us to export or delete your account and orders at any time.'],
    ],
  },
  terms: {
    title: 'Terms of service',
    sections: [
      ['Prototype', 'This checkout is a working prototype built for Cloudoon. Payments run in the providers’ test (sandbox) modes, so no real money is taken and no hosting is provisioned.'],
      ['Billing and renewal', 'Services are billed for the period you choose and renew automatically at the renewal price shown at checkout, unless you turn auto-renew off before the renewal date.'],
      ['Promotions', 'Promo codes apply to the first term only, unless the code says otherwise.'],
      ['Domains', 'Domain registrations are subject to the rules of each registry. A name shown as available can still be registered by someone else before your order completes; if that happens, you are not charged for it.'],
      ['Cancellation', 'You can cancel at any time. Unused time on hosting plans is refunded within the first 30 days.'],
    ],
  },
};

/** /privacy and /terms: linked from the checkout and from the Google sign-in consent screen. */
export function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const { title, sections } = PAGES[page];
  return (
    <div className="min-h-screen bg-gray-50">
      <Header showCurrency={false} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-semibold text-gray-950">{title}</h1>
        <div className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          {sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-base font-semibold text-gray-950">{heading}</h2>
              <p className="mt-1 text-sm text-gray-700">{body}</p>
            </section>
          ))}
        </div>
        <a href="/" className="mt-6 inline-block text-sm font-medium text-brand-700 underline underline-offset-2">Back to checkout</a>
      </main>
    </div>
  );
}
