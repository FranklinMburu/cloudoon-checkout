import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from '../../api/client';
import type { Order, PaymentInput, PaymentMethod } from '../../api/types';
import { toNumber } from '../../lib/format';
import * as v from '../../lib/validation';
import { useStore } from '../../state/store';
import { useMoney } from '../../state/useMoney';
import { Card, Lock, Phone } from '../../components/icons';
import { Button, Notice, RadioCard, Section, Skeleton, TextButton, TextField } from '../../components/ui';
import { CardFields, type CardFieldsHandle } from './CardFields';
import { PayPalButton } from './PayPalButton';

const MPESA_POLL_MS = 4000;
const MPESA_PATIENCE_MS = 2 * 60 * 1000;

function addMonths(months: number) {
  const d = new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); // 31 Jan + 1 mo → 28/29 Feb
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Step 3 — how to pay, plus a final, explicit review of every charge. */
export function PaymentStep() {
  const { cart, catalog, config, quote, quoting, checkout, update, setStep, completeOrder } = useStore();
  const { fmt, fmtPrecise, currency } = useMoney();
  const available = config?.payments.methods ?? [];
  const [chosen, setChosen] = useState<PaymentMethod | null>(null);
  const method: PaymentMethod | undefined =
    chosen && available.includes(chosen) ? chosen : available.includes('mpesa') && cart.country === 'KE' ? 'mpesa' : available[0];
  const [cardholder, setCardholder] = useState(checkout.billing.full_name);
  const cardFields = useRef<CardFieldsHandle>(null);
  const [mpesa, setMpesa] = useState(checkout.billing.phone);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [waitingForPhone, setWaitingForPhone] = useState<'waiting' | 'slow' | null>(null);
  const [failure, setFailure] = useState('');
  // One key per payment attempt: retries, double clicks and refreshes can never create a second order.
  const idempotencyKey = useRef(crypto.randomUUID());
  const stopPolling = useRef<() => void>(() => undefined);
  useEffect(() => () => stopPolling.current(), []);

  const mpesaError = v.mpesaPhone(mpesa);
  const showMpesaError = (touched.mpesa || submitted) && !!mpesaError;
  const needsKes = method === 'mpesa' && currency !== 'KES';
  const paypalCurrencies = config?.payments.paypal_currencies ?? [];
  const needsPayPalCurrency = method === 'paypal' && !paypalCurrencies.includes(currency);

  const orderPayload = (payment: PaymentInput) => {
    const { is_business, ...billing } = checkout.billing;
    return {
      cart,
      billing: { ...billing, company: is_business ? billing.company : '', tax_id: is_business ? billing.tax_id : '' },
      payment,
      accept_terms: agree,
    };
  };

  /** A payment that ended badly: show why, and use a fresh key so the next attempt is a new order. */
  const fail = (message: string) => {
    stopPolling.current();
    setWaitingForPhone(null);
    setProcessing(false);
    setFailure(message);
    idempotencyKey.current = crypto.randomUUID();
  };

  const finish = (order: Order, payload: ReturnType<typeof orderPayload>) => {
    if (order.status === 'paid') return completeOrder(order);
    if (order.status === 'failed') return fail(order.payment_error || 'The payment didn’t go through. No money was taken.');
    waitForPhone(payload); // M-Pesa: the customer approves on their phone
  };

  /** Ask again with the same key until Safaricom confirms; the backend never charges twice. */
  const waitForPhone = (payload: ReturnType<typeof orderPayload>) => {
    setWaitingForPhone('waiting');
    const started = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    stopPolling.current = () => {
      stopped = true;
      clearTimeout(timer);
    };
    const poll = async () => {
      if (stopped) return;
      try {
        const order = await api.createOrder(payload, idempotencyKey.current);
        if (stopped) return;
        if (order.status !== 'pending') return finish(order, payload);
      } catch {
        /* a dropped poll is fine; try again */
      }
      if (Date.now() - started > MPESA_PATIENCE_MS) setWaitingForPhone('slow');
      timer = setTimeout(poll, MPESA_POLL_MS);
    };
    timer = setTimeout(poll, MPESA_POLL_MS);
  };

  const readyToPay = () => {
    setSubmitted(true);
    setFailure('');
    const cardOk = method !== 'card' || (cardFields.current?.validate() ?? false);
    const mpesaOk = method !== 'mpesa' || !mpesaError;
    if (!cardOk || !mpesaOk || !agree || needsKes || needsPayPalCurrency) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return false;
    }
    return true;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!method || method === 'paypal' || !readyToPay()) return;
    setProcessing(true);
    try {
      let payment: PaymentInput;
      if (method === 'card') {
        const { full_name, email, phone } = checkout.billing;
        const card = await cardFields.current!.createPaymentMethod({ name: cardholder || full_name, email, phone });
        payment = { method, payment_method: card.id, brand: card.brand, last4: card.last4 };
      } else {
        payment = { method, phone: mpesa };
      }
      const payload = orderPayload(payment);
      finish(await api.createOrder(payload, idempotencyKey.current), payload);
    } catch (err) {
      setProcessing(false);
      setFailure(err instanceof Error && err.message ? err.message : 'Payment failed. No money was taken. Please try again.');
    }
  };

  const payWithPayPal = async (paypalOrderId: string) => {
    setProcessing(true);
    try {
      const payload = orderPayload({ method: 'paypal', paypal_order_id: paypalOrderId });
      finish(await api.createOrder(payload, idempotencyKey.current), payload);
    } catch (err) {
      setProcessing(false);
      setFailure(err instanceof ApiError ? err.message : 'PayPal payment failed. No money was taken.');
    }
  };

  const cancelMpesa = () => fail('M-Pesa request cancelled. You can send a new one.');

  const b = checkout.billing;
  const country = catalog.countries.find((c) => c.code === b.country)?.name;
  if (!quote) return null;
  const hasCloudBurst = cart.category === 'cloud' && quote.cloud_burst_hourly;

  return (
    <form onSubmit={submit} noValidate className="space-y-3 sm:space-y-4">
      <Section title="Payment method" description="Charged once today. Renewals use the same method.">
        {!config ? (
          <Skeleton className="h-16 w-full" />
        ) : available.length === 0 || !method ? (
          <Notice tone="error">Online payments are unavailable right now. Please try again in a few minutes.</Notice>
        ) : (
          <>
            <fieldset disabled={processing}>
              <legend className="sr-only">Payment method</legend>
              <div className={available.length === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
                {available.includes('card') && <MethodCard value="card" current={method} onChange={setChosen} icon={<Card size={18} />} title="Card" note="Visa, Mastercard, Amex" />}
                {available.includes('mpesa') && <MethodCard value="mpesa" current={method} onChange={setChosen} icon={<Phone size={18} />} title="M-Pesa" note="Approve on your phone" />}
                {available.includes('paypal') && <MethodCard value="paypal" current={method} onChange={setChosen} icon={<span className="text-[13px] font-semibold italic">P</span>} title="PayPal" note="Pay with PayPal" />}
              </div>
            </fieldset>

            <div className="mt-4">
              {method === 'card' && (
                <CardFields ref={cardFields} publishableKey={config.payments.stripe_publishable_key} cardholder={cardholder} onCardholderChange={setCardholder} />
              )}
              {method === 'mpesa' && (needsKes ? (
                <CurrencySwitch message="M-Pesa payments are in Kenyan shillings." label="Pay in KES" onSwitch={() => update({ currency: 'KES' })} />
              ) : (
                <div className="space-y-3">
                  <TextField label="M-Pesa phone number" type="tel" inputMode="tel" autoComplete="tel" value={mpesa} onChange={setMpesa} onBlur={() => setTouched((t) => ({ ...t, mpesa: true }))} error={showMpesaError ? mpesaError : ''} placeholder="0712 345 678" disabled={processing} />
                  <Notice>You’ll get a prompt on this phone to approve {fmt(quote.total)}. Enter your M-Pesa PIN there.</Notice>
                </div>
              ))}
              {method === 'paypal' && (needsPayPalCurrency ? (
                <CurrencySwitch message={`PayPal doesn’t accept ${currency}.`} label={`Pay in ${paypalCurrencies[0]}`} onSwitch={() => update({ currency: paypalCurrencies[0] })} />
              ) : (
                <Notice>PayPal opens in its own window. You approve the payment there and come straight back here.</Notice>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Review" description="What you pay today, and what renews later.">
        <ul className="divide-y divide-gray-100 border-y border-gray-100">
          {quote.lines.map((l) => {
            const months = l.kind === 'domain' ? 12 : cart.cycle;
            return (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words text-gray-950">{l.title}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {l.term_label !== '—' ? l.term_label : 'No charge'}
                    {l.renewal && (l.auto_renew === false
                      ? <> · Expires {addMonths(months)}</>
                      : <> · Then {fmt(l.renewal.amount)} on {addMonths(months)}</>)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-950 tabular-nums">{toNumber(l.due_today) === 0 ? 'Free' : fmt(l.due_today)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="tabular-nums">{fmt(quote.subtotal)}</dd></div>
          {quote.promo && <div className="flex justify-between"><dt className="text-gray-600">Promo ({quote.promo.code}), first term only</dt><dd className="text-green-700 tabular-nums">−{fmt(quote.promo.amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-600">Tax · {quote.tax_label}</dt><dd className="tabular-nums">{fmt(quote.tax)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-950"><dt>Due today</dt><dd className="tabular-nums">{fmt(quote.total)}</dd></div>
        </dl>
        {(quote.promo || hasCloudBurst) && (
          <ul className="mt-3 space-y-1 text-xs text-gray-600">
            {quote.promo && <li>Renewal prices above don’t include the promo discount.</li>}
            {hasCloudBurst && <li>Autoscaling: extra instances cost {fmtPrecise(quote.cloud_burst_hourly!)}/hour each while running, billed monthly.</li>}
          </ul>
        )}

        <dl className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-3 text-[13px] sm:grid-cols-2">
          <ReviewItem label="Account" onEdit={() => setStep(2)}>{checkout.account?.email ?? b.email}</ReviewItem>
          <ReviewItem label="Billing address" onEdit={() => setStep(2)}>
            {b.full_name}{b.is_business && b.company ? `, ${b.company}` : ''}, {b.address}, {b.city} {b.postal_code}, {country}
          </ReviewItem>
        </dl>

        <div className="mt-4 space-y-3">
          <label className={`-mx-2 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${submitted && !agree ? 'bg-red-50' : ''}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={submitted && !agree ? true : undefined}
              aria-describedby={submitted && !agree ? 'agree-error' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
            />
            <span className="text-[13px] text-gray-700">
              I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2">Terms of Service</a>. My services renew automatically at the prices above until I turn auto-renew off.
            </span>
          </label>
          {submitted && !agree && <p id="agree-error" role="alert" className="-mt-2 text-[13px] text-red-700">Please accept the terms to continue.</p>}

          {failure && <Notice tone="error">{failure}</Notice>}

          {waitingForPhone ? (
            <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-4 text-center" role="status">
              <p className="text-sm font-medium text-gray-950">Check your phone</p>
              <p className="text-[13px] text-gray-700">
                {waitingForPhone === 'waiting'
                  ? `Enter your M-Pesa PIN to approve ${fmt(quote.total)}. This page updates by itself.`
                  : 'Still waiting for M-Pesa. If you’ve approved it, give it a moment; we’re still checking.'}
              </p>
              <TextButton onClick={cancelMpesa}>Cancel and send a new request</TextButton>
            </div>
          ) : method === 'paypal' && config && !needsPayPalCurrency ? (
            <PayPalButton
              clientId={config.payments.paypal_client_id}
              currency={currency}
              canStart={readyToPay}
              createOrder={async () => (await api.createPayPalOrder(cart)).id}
              onApprove={payWithPayPal}
              onError={setFailure}
            />
          ) : (
            <Button type="submit" variant="accent" size="lg" fullWidth loading={processing} disabled={quoting || !method}>
              {processing ? 'Processing…' : <><Lock size={16} /> {`Pay ${fmt(quote.total)}`}</>}
            </Button>
          )}
          <p className="text-center text-xs text-gray-500">Payments are processed by Stripe, Safaricom and PayPal. Card numbers go straight to Stripe, never to our servers.</p>
        </div>
      </Section>
    </form>
  );
}

function CurrencySwitch({ message, label, onSwitch }: { message: string; label: string; onSwitch: () => void }) {
  return (
    <Notice>
      {message} <TextButton onClick={onSwitch}>{label}</TextButton>
    </Notice>
  );
}

function MethodCard({ value, current, onChange, icon, title, note }: { value: PaymentMethod; current: PaymentMethod; onChange: (m: PaymentMethod) => void; icon: ReactNode; title: string; note: string }) {
  const on = current === value;
  return (
    <RadioCard name="payment-method" value={value} checked={on} onChange={() => onChange(value)} indicator={false} className="justify-center sm:justify-start" label={title}>
      <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2.5">
        <span className={on ? 'text-brand-600' : 'text-gray-500'}>{icon}</span>
        <span className="text-center sm:text-left">
          <span className="block text-sm font-medium text-gray-950">{title}</span>
          <span className="hidden text-xs text-gray-500 sm:block">{note}</span>
        </span>
      </span>
    </RadioCard>
  );
}

function ReviewItem({ label, children, onEdit }: { label: string; children: ReactNode; onEdit: () => void }) {
  return (
    <div>
      <dt className="flex items-center justify-between font-medium text-gray-950">
        {label}
        <TextButton onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</TextButton>
      </dt>
      <dd className="break-words text-gray-600">{children}</dd>
    </div>
  );
}
