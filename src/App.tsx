import { useEffect, useRef, useState } from 'react';
import { Header, Stepper } from './components/Header';
import { ArrowLeft, ArrowRight } from './components/icons';
import { MobileSummaryBar, OrderSummary } from './components/OrderSummary';
import { Button } from './components/ui';
import { DesignSystem } from './DesignSystem';
import { useStore } from './state/store';
import { AccountStep, CHECKOUT_FORM_ID } from './steps/account/AccountStep';
import { Confirmation } from './steps/Confirmation';
import { ConfigureStep } from './steps/configure/ConfigureStep';
import { PaymentStep, type PlacedOrder } from './steps/payment/PaymentStep';
import type { Step } from './types';

const STEP_COPY: Record<Step, { title: string; intro: string }> = {
  1: { title: 'Configure your order', intro: 'Choose a plan, a billing period and any extras. Your total updates as you go.' },
  2: { title: 'Account & billing details', intro: 'Sign in, sign up or check out as a guest — your order is saved either way.' },
  3: { title: 'Payment & review', intro: 'Check every charge, then pay. Nothing is charged until you press Pay.' },
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
  const { checkout, setStep, resetAll } = useStore();
  const step = checkout.step;
  const [order, setOrder] = useState<PlacedOrder | null>(null);
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

  if (order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showCurrency={false} />
        <main>
          <Confirmation order={order} onNewOrder={() => { resetAll(); setOrder(null); }} />
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
      <Button variant="accent" size="lg" fullWidth onClick={() => setStep(2)}>
        {compact ? 'Continue' : 'Continue to account'} <ArrowRight size={18} />
      </Button>
    ) : step === 2 ? (
      <Button variant="accent" size="lg" fullWidth type="submit" form={CHECKOUT_FORM_ID}>
        {compact ? 'Continue' : 'Continue to payment'} <ArrowRight size={18} />
      </Button>
    ) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 lg:pb-0">
      <a href="#main" className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold text-brand-700 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Header />

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <Stepper />
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:px-8 lg:py-8">
        <main id="main" className="min-w-0">
          <div className="mb-5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as Step)}
                className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none"
              >
                <ArrowLeft size={16} /> Back to {step === 2 ? 'configure' : 'account & billing'}
              </button>
            )}
            <p className="text-sm font-semibold text-brand-700">Step {step} of 3</p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-0.5 text-2xl font-bold tracking-tight text-gray-950 outline-none sm:text-3xl">
              {STEP_COPY[step].title}
            </h1>
            <p className="mt-1 text-gray-600">{STEP_COPY[step].intro}</p>
          </div>

          {step === 1 && <ConfigureStep />}
          {step === 2 && <AccountStep />}
          {step === 3 && <PaymentStep onPlaced={setOrder} />}
        </main>

        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <OrderSummary cta={makeCta(false)} onEditHosting={editHosting} />
          </div>
        </aside>
      </div>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-sm text-gray-600 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
          <p>© {new Date().getFullYear()} Cloudoon · Interactive checkout prototype</p>
          <div className="flex flex-wrap gap-x-4">
            <a className="inline-flex min-h-11 items-center font-medium text-brand-700 hover:underline" href="#design-system">Design system & UI states</a>
            <button type="button" className="inline-flex min-h-11 items-center font-medium text-gray-700 hover:underline" onClick={() => { resetAll(); setOrder(null); }}>
              Reset prototype
            </button>
          </div>
        </div>
      </footer>

      <MobileSummaryBar cta={makeCta(true)} onEditHosting={editHosting} />
    </div>
  );
}
