import { useEffect, useRef, useState } from 'react';
import { Header, Stepper } from './components/Header';
import { ArrowLeft, ArrowRight } from './components/icons';
import { MobileSummaryBar, OrderSummary } from './components/OrderSummary';
import { Button, TextButton } from './components/ui';
import { DesignSystem } from './DesignSystem';
import { LegalPage } from './LegalPage';
import { useStore, type Step } from './state/store';
import { AccountStep, CHECKOUT_FORM_ID } from './steps/account/AccountStep';
import type { AuthMode } from './steps/account/AuthPanel';
import { Confirmation } from './steps/Confirmation';
import { ConfigureStep } from './steps/configure/ConfigureStep';
import { PaymentStep } from './steps/payment/PaymentStep';

const STEP_COPY: Record<Step, { title: string; intro: string }> = {
  1: { title: 'Configure your order', intro: 'Choose your hosting, billing period and extras.' },
  2: { title: 'Account & billing', intro: 'Your order is saved while you sign in or sign up.' },
  3: { title: 'Review & pay', intro: 'Nothing is charged until you select Pay.' },
};

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const { checkout, quote, setStep, resetAll } = useStore();
  const step = checkout.step;
  const order = checkout.order;
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const route = useHashRoute();

  // Guard: payment needs an account (e.g. after "Use a different account").
  useEffect(() => {
    if (step === 3 && !checkout.account) setStep(2);
  }, [step, checkout.account, setStep]);

  // On step change: scroll to top and move focus to the new heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, order]);

  if (route === '#design-system') return <DesignSystem />;
  if (window.location.pathname === '/privacy') return <LegalPage page="privacy" />;
  if (window.location.pathname === '/terms') return <LegalPage page="terms" />;

  if (order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showCurrency={false} />
        <main>
          <Confirmation order={order} onNewOrder={resetAll} />
        </main>
      </div>
    );
  }

  const editHosting = () => {
    setStep(1);
    setTimeout(() => document.getElementById('hosting')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // One conversion action per screen: in the sidebar on desktop, in the bottom bar on mobile.
  // Step 3's "Pay" button sits directly under the terms checkbox instead.
  const makeCta = (compact: boolean) =>
    step === 1 ? (
      <Button variant="accent" size="lg" fullWidth onClick={() => setStep(2)} disabled={!quote}>
        {compact ? 'Continue' : 'Continue to account'} <ArrowRight size={16} />
      </Button>
    ) : step === 2 && !(authMode === 'login' && !checkout.account) ? (
      // On the Log in tab the form's own "Log in" button is the only action, so this one is hidden.
      <Button variant="accent" size="lg" fullWidth type="submit" form={CHECKOUT_FORM_ID}>
        {compact ? 'Continue' : 'Continue to payment'} <ArrowRight size={16} />
      </Button>
    ) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <a href="#main" className="sr-only z-50 rounded-md bg-white px-4 py-2 font-medium text-brand-700 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Header />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:pt-8">
        <main id="main" className="min-w-0">
          <Stepper />
          <div className="mt-4 mb-5 sm:mt-6">
            {step > 1 && (
              <TextButton onClick={() => setStep((step - 1) as Step)} className="mb-1">
                <ArrowLeft size={14} /> {step === 2 ? 'Configure' : 'Account & billing'}
              </TextButton>
            )}
            <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-gray-950 outline-none sm:text-2xl">
              {STEP_COPY[step].title}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{STEP_COPY[step].intro}</p>
          </div>

          <div className="space-y-4">
            {step === 1 && <ConfigureStep />}
            {step === 2 && <AccountStep onModeChange={setAuthMode} />}
            {step === 3 && <PaymentStep />}
          </div>
        </main>

        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5">
            <OrderSummary cta={makeCta(false)} onEditHosting={editHosting} />
          </div>
        </aside>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-gray-200 pt-4 text-[13px] text-gray-500">
          <p>© {new Date().getFullYear()} Cloudoon · Checkout prototype</p>
          <div className="flex flex-wrap gap-x-4">
            <a className="inline-flex min-h-11 items-center text-brand-700 hover:underline sm:min-h-8" href="#design-system">Design system & UI states</a>
            <button type="button" className="inline-flex min-h-11 items-center hover:text-gray-900 hover:underline sm:min-h-8" onClick={resetAll}>
              Reset prototype
            </button>
          </div>
        </div>
      </footer>

      <MobileSummaryBar cta={makeCta(true)} onEditHosting={editHosting} />
    </div>
  );
}
